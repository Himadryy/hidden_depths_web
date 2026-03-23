package handlers

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/Himadryy/hidden-depths-backend/internal/database"
	"github.com/Himadryy/hidden-depths-backend/internal/models"
	"github.com/Himadryy/hidden-depths-backend/internal/services"
	"github.com/Himadryy/hidden-depths-backend/internal/ws"
	"github.com/Himadryy/hidden-depths-backend/pkg/apperror"
	"github.com/Himadryy/hidden-depths-backend/pkg/cache"
	"github.com/Himadryy/hidden-depths-backend/pkg/circuitbreaker"
	"github.com/Himadryy/hidden-depths-backend/pkg/logger"
	"github.com/Himadryy/hidden-depths-backend/pkg/response"
	"github.com/Himadryy/hidden-depths-backend/pkg/validator"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	razorpay "github.com/razorpay/razorpay-go"
	"go.uber.org/zap"
)

// RazorpayBreaker protects against Razorpay gateway failures.
var RazorpayBreaker = circuitbreaker.New("razorpay", circuitbreaker.Config{
	FailureThreshold: 3,
	SuccessThreshold: 1,
	OpenTimeout:      30 * time.Second,
})

// Helper to check if payment is required
func isPaidSession(dateStr string) (bool, error) {
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return false, err
	}
	paymentStart, _ := time.Parse("2006-01-02", "2026-02-03")
	return t.After(paymentStart) || t.Equal(paymentStart), nil
}

// Pending booking hold window — how long a pending booking blocks the slot for others.
// 5 minutes provides margin for Razorpay checkout (2-4 min) + network delays.
// Abandoned booking cleanup runs at this interval too.
const pendingHoldWindow = "5 minutes"

// Database operation timeouts
const (
	dbQueryTimeout       = 15 * time.Second // Default for read queries
	dbTransactionTimeout = 30 * time.Second // For multi-step transactions
)

// GetBookedSlots godoc
// @Summary Get booked time slots for a date
// @Description Returns all time slots booked for a specific date (confirmed or active pending within 5-min hold).
// @Tags Bookings
// @Produce json
// @Param date path string true "Date (YYYY-MM-DD)"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /bookings/slots/{date} [get]
func GetBookedSlots(w http.ResponseWriter, r *http.Request) {
	date := chi.URLParam(r, "date")
	if date == "" {
		response.AppErr(w, apperror.ValidationError("date", "Date is required"))
		return
	}

	ctx := r.Context()
	cacheKey := cache.SlotsKey(date)

	// Try cache first
	if slots, err := cache.Get[[]string](ctx, cacheKey); err == nil {
		logger.Debug("Cache hit for slots", zap.String("date", date))
		response.JSON(w, http.StatusOK, slots, "Slots fetched successfully")
		return
	}

	// Cache miss or disabled — query DB with timeout
	queryCtx, cancel := context.WithTimeout(ctx, dbQueryTimeout)
	defer cancel()

	rows, err := database.Pool.Query(queryCtx,
		`SELECT time FROM bookings
		 WHERE date = $1
		 AND (payment_status = 'paid'
		      OR (payment_status = 'pending' AND created_at > NOW() - INTERVAL '`+pendingHoldWindow+`'))`,
		date)
	if err != nil {
		logger.Error("Failed to fetch slots", zap.String("date", date), zap.Error(err))
		response.AppErr(w, apperror.DatabaseError("fetch slots", err))
		return
	}
	defer rows.Close()

	var slots []string
	for rows.Next() {
		var timeSlot string
		if err := rows.Scan(&timeSlot); err != nil {
			logger.Error("Failed to scan time slot", zap.Error(err))
			continue
		}
		slots = append(slots, timeSlot)
	}

	// Populate cache (ignore errors — cache is optional)
	if slots == nil {
		slots = []string{} // Ensure we cache empty array, not nil
	}
	_ = cache.Set(ctx, cacheKey, slots, cache.SlotsTTL)

	response.JSON(w, http.StatusOK, slots, "Slots fetched successfully")
}

// InvalidateSlotsCache removes cached slots for a given date.
// Call this after any booking state change (create, cancel, verify payment).
func InvalidateSlotsCache(ctx context.Context, date string) {
	if err := cache.Delete(ctx, cache.SlotsKey(date)); err != nil && !errors.Is(err, cache.ErrCacheDisabled) {
		logger.Warn("Failed to invalidate slots cache", zap.String("date", date), zap.Error(err))
	}
}

// CreateBooking godoc
// @Summary Create a new booking
// @Description Initiates a booking with atomic DB transaction. Creates Razorpay order for paid sessions.
// @Tags Bookings
// @Accept json
// @Produce json
// @Param booking body models.Booking true "Booking details"
// @Success 200 {object} map[string]interface{} "Payment initiated (paid sessions)"
// @Success 201 {object} map[string]interface{} "Booking confirmed (free sessions)"
// @Failure 400 {object} map[string]interface{}
// @Failure 409 {object} map[string]interface{} "Slot unavailable"
// @Failure 500 {object} map[string]interface{}
// @Router /bookings [post]
// @Security BearerAuth
func CreateBooking(w http.ResponseWriter, r *http.Request, hub *ws.Hub, audit *services.AuditService) {
	var booking models.Booking
	if err := json.NewDecoder(r.Body).Decode(&booking); err != nil {
		response.AppErr(w, apperror.InvalidPayload(err))
		return
	}

	// 1. Sanitize inputs
	booking.Name = validator.SanitizeString(booking.Name)
	booking.Email = validator.SanitizeString(booking.Email)
	booking.Date = validator.SanitizeString(booking.Date)
	booking.Time = validator.SanitizeString(booking.Time)

	// 2. Validate all fields
	validationErrors := validator.ValidateBooking(validator.BookingInput{
		Date:  booking.Date,
		Time:  booking.Time,
		Name:  booking.Name,
		Email: booking.Email,
	})
	if len(validationErrors) > 0 {
		// Return the first validation error (most important)
		response.AppErr(w, apperror.ValidationError(validationErrors[0].Field, validationErrors[0].Message))
		return
	}

	// Use authenticated user_id from context (secure, from JWT)
	if ctxUserID, ok := r.Context().Value("user_id").(string); ok && ctxUserID != "" {
		booking.UserID = &ctxUserID
	}

	// 3. Day of week restriction (Sundays & Mondays only)
	t, err := time.Parse("2006-01-02", booking.Date)
	if err != nil {
		response.AppErr(w, apperror.ValidationError("date", "Invalid date format. Use YYYY-MM-DD."))
		return
	}
	weekday := t.Weekday()
	if weekday != time.Sunday && weekday != time.Monday {
		response.AppErr(w, apperror.ValidationError("date", "Bookings are only allowed on Sundays and Mondays"))
		return
	}

	// 4. Check if this is a paid session
	isPaid, err := isPaidSession(booking.Date)
	if err != nil {
		response.AppErr(w, apperror.ValidationError("date", "Invalid date format"))
		return
	}

	// 2. Generate Meeting Link (before transaction)
	// Use internal session page for branded experience
	meetingID := uuid.New().String()[:8]
	booking.MeetingLink = fmt.Sprintf("https://hidden-depths-web.pages.dev/session?room=%s-%s", meetingID, booking.Date)

	booking.Amount = 0
	booking.PaymentStatus = "paid" // Default for free sessions

	// 3. Create Razorpay order BEFORE transaction (if paid session)
	// This prevents holding DB locks while waiting for external API
	if isPaid {
		booking.Amount = 99.00
		booking.PaymentStatus = "pending"

		keyID := os.Getenv("RAZORPAY_KEY_ID")
		keySecret := os.Getenv("RAZORPAY_KEY_SECRET")
		if keyID == "" || keySecret == "" {
			response.AppErr(w, apperror.ExternalServiceError("razorpay", fmt.Errorf("payment configuration missing")))
			return
		}

		// Circuit breaker wraps the Razorpay API call (outside transaction!)
		var body map[string]interface{}
		err := RazorpayBreaker.Execute(func() error {
			client := razorpay.NewClient(keyID, keySecret)
			orderData := map[string]interface{}{
				"amount":   int(booking.Amount * 100),
				"currency": "INR",
				"receipt":  uuid.New().String(),
			}

			var createErr error
			body, createErr = client.Order.Create(orderData, nil)
			if createErr != nil {
				return apperror.PaymentGatewayError(createErr)
			}
			return nil
		})
		if err != nil {
			logger.Error("Razorpay order creation failed", zap.Error(err))
			if appErr, ok := apperror.AsAppError(err); ok {
				response.AppErr(w, appErr)
			} else {
				response.AppErr(w, apperror.PaymentGatewayError(err))
			}
			return
		}

		razorpayOrderID, ok := body["id"].(string)
		if !ok || razorpayOrderID == "" {
			response.AppErr(w, apperror.PaymentGatewayError(fmt.Errorf("invalid order response: missing id")))
			return
		}
		booking.RazorpayOrderID = razorpayOrderID
	}

	// --- Atomic Slot Check & Reserve ---
	// Uses a DB transaction to prevent race conditions between check and insert.
	// Razorpay order is already created above, so transaction is fast (no external calls).
	// Use transaction timeout to prevent hung connections.
	txCtx, txCancel := context.WithTimeout(r.Context(), dbTransactionTimeout)
	defer txCancel()

	tx, err := database.Pool.Begin(txCtx)
	if err != nil {
		logger.Error("Failed to begin transaction", zap.Error(err))
		response.AppErr(w, apperror.DatabaseError("begin transaction", err))
		return
	}
	defer tx.Rollback(txCtx)

	// 2. Check slot availability (FOR UPDATE is not needed on aggregates,
	// the UNIQUE constraint + transaction isolation handles concurrency)
	currentUserID := ""
	if booking.UserID != nil {
		currentUserID = *booking.UserID
	}

	var paidCount, otherPendingCount int
	if err := tx.QueryRow(txCtx,
		`SELECT 
			COUNT(*) FILTER (WHERE payment_status = 'paid'),
			COUNT(*) FILTER (WHERE payment_status = 'pending' 
				AND COALESCE(user_id::text, '') != $3
				AND created_at > NOW() - INTERVAL '`+pendingHoldWindow+`')
		 FROM bookings 
		 WHERE date = $1 AND time = $2`,
		booking.Date, booking.Time, currentUserID,
	).Scan(&paidCount, &otherPendingCount); err != nil {
		logger.Error("Failed to check slot availability", zap.Error(err))
		response.AppErr(w, apperror.DatabaseError("check slot availability", err))
		return
	}

	if paidCount > 0 {
		response.AppErr(w, apperror.SlotUnavailable(booking.Date, booking.Time))
		return
	}
	if otherPendingCount > 0 {
		response.AppErr(w, apperror.SlotHeldByOther(booking.Date, booking.Time))
		return
	}

	// 5. Clear ALL non-paid bookings for this slot (within transaction)
	if _, err := tx.Exec(txCtx,
		`DELETE FROM bookings WHERE date = $1 AND time = $2 AND payment_status != 'paid'`,
		booking.Date, booking.Time,
	); err != nil {
		logger.Error("Failed to clean up stale bookings",
			zap.String("date", booking.Date), zap.String("time", booking.Time), zap.Error(err))
	}

	// 6. Insert into Database (within transaction)
	var newID string
	err = tx.QueryRow(txCtx,
		`INSERT INTO bookings
		(date, time, name, email, user_id, meeting_link, payment_status, razorpay_order_id, amount)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id`,
		booking.Date, booking.Time, booking.Name, booking.Email, booking.UserID,
		booking.MeetingLink, booking.PaymentStatus, booking.RazorpayOrderID, booking.Amount,
	).Scan(&newID)

	if err != nil {
		logger.Error("INSERT conflict after cleanup",
			zap.String("date", booking.Date), zap.String("time", booking.Time), zap.Error(err))
		response.AppErr(w, apperror.SlotUnavailable(booking.Date, booking.Time))
		return
	}

	// 8. Commit the transaction
	if err := tx.Commit(txCtx); err != nil {
		logger.Error("Failed to commit booking transaction", zap.Error(err))
		response.AppErr(w, apperror.DatabaseError("commit booking", err))
		return
	}

	// Invalidate slots cache for this date (write-through pattern)
	InvalidateSlotsCache(r.Context(), booking.Date)

	// 9. Response Handling
	if isPaid {
		response.JSON(w, http.StatusOK, map[string]interface{}{
			"booking_id": newID,
			"order_id":   booking.RazorpayOrderID,
			"amount":     booking.Amount * 100,
			"currency":   "INR",
			"key_id":     os.Getenv("RAZORPAY_KEY_ID"),
		}, "Payment initiated")
	} else {
		finalizeBooking(w, r, hub, audit, newID, booking)
		response.JSON(w, http.StatusCreated, map[string]string{"booking_id": newID}, "Booking successful")
	}
}

// VerifyPayment godoc
// @Summary Verify Razorpay payment
// @Description Confirms Razorpay payment signature and marks booking as paid. Sends confirmation email.
// @Tags Bookings
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Payment verified"
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{} "Invalid signature"
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /bookings/verify-payment [post]
// @Security BearerAuth
func VerifyPayment(w http.ResponseWriter, r *http.Request, hub *ws.Hub, audit *services.AuditService) {
	var req struct {
		BookingID         string `json:"booking_id"`
		RazorpayPaymentID string `json:"razorpay_payment_id"`
		RazorpayOrderID   string `json:"razorpay_order_id"`
		RazorpaySignature string `json:"razorpay_signature"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.AppErr(w, apperror.InvalidPayload(err))
		return
	}

	if req.BookingID == "" || req.RazorpayPaymentID == "" || req.RazorpayOrderID == "" || req.RazorpaySignature == "" {
		response.AppErr(w, apperror.ValidationError("payment", "All payment fields are required"))
		return
	}

	// 1. Verify Signature
	keySecret := os.Getenv("RAZORPAY_KEY_SECRET")
	if keySecret == "" {
		logger.Error("RAZORPAY_KEY_SECRET not configured")
		response.AppErr(w, apperror.ExternalServiceError("razorpay", fmt.Errorf("payment service misconfigured")))
		return
	}

	data := req.RazorpayOrderID + "|" + req.RazorpayPaymentID
	
	h := hmac.New(sha256.New, []byte(keySecret))
	h.Write([]byte(data))
	expectedSignature := hex.EncodeToString(h.Sum(nil))

	if !strings.EqualFold(expectedSignature, req.RazorpaySignature) {
		logger.Warn("Payment signature mismatch",
			zap.String("booking_id", req.BookingID),
			zap.String("order_id", req.RazorpayOrderID),
		)
		response.AppErr(w, apperror.PaymentSignatureInvalid())
		
		// DELETE the pending booking to immediately free the slot (with timeout)
		ctx, cancel := context.WithTimeout(r.Context(), dbQueryTimeout)
		defer cancel()
		if _, err := database.Pool.Exec(ctx,
			"DELETE FROM bookings WHERE id = $1 AND payment_status = 'pending'", req.BookingID); err != nil {
			logger.Error("Failed to clean up failed booking", zap.String("booking_id", req.BookingID), zap.Error(err))
		}
		return
	}

	// Use transaction with timeout for atomic verification (prevents race conditions)
	txCtx, txCancel := context.WithTimeout(r.Context(), dbTransactionTimeout)
	defer txCancel()

	tx, err := database.Pool.Begin(txCtx)
	if err != nil {
		logger.Error("Failed to begin verification transaction", zap.Error(err))
		response.AppErr(w, apperror.DatabaseError("begin transaction", err))
		return
	}
	defer tx.Rollback(txCtx)

	// 2. Fetch and lock the booking row to prevent concurrent verification
	var b models.Booking
	err = tx.QueryRow(txCtx,
		`SELECT id, date, time, name, email, meeting_link, user_id, payment_status 
		 FROM bookings WHERE id = $1 FOR UPDATE`,
		req.BookingID,
	).Scan(&b.ID, &b.Date, &b.Time, &b.Name, &b.Email, &b.MeetingLink, &b.UserID, &b.PaymentStatus)

	if err != nil {
		response.AppErr(w, apperror.BookingNotFound(req.BookingID))
		return
	}

	// Check if already paid (idempotent - return success without error)
	if b.PaymentStatus == "paid" {
		logger.Info("Payment already verified (idempotent)", zap.String("booking_id", req.BookingID))
		response.JSON(w, http.StatusOK, nil, "Payment already verified")
		return
	}

	// 3. Update to paid (within transaction)
	_, err = tx.Exec(txCtx,
		"UPDATE bookings SET payment_status = 'paid', razorpay_payment_id = $1 WHERE id = $2",
		req.RazorpayPaymentID, req.BookingID,
	)
	if err != nil {
		logger.Error("Failed to update booking payment status", zap.String("booking_id", req.BookingID), zap.Error(err))
		response.AppErr(w, apperror.DatabaseError("update booking", err))
		return
	}

	// Commit the transaction
	if err := tx.Commit(txCtx); err != nil {
		logger.Error("Failed to commit verification transaction", zap.Error(err))
		response.AppErr(w, apperror.DatabaseError("commit verification", err))
		return
	}

	// Invalidate slots cache (payment confirmed = slot truly taken)
	InvalidateSlotsCache(r.Context(), b.Date)

	// 4. Finalize (Email + WebSocket)
	finalizeBooking(w, r, hub, audit, b.ID, b)
	
	response.JSON(w, http.StatusOK, nil, "Payment verified and booking confirmed")
}

// finalizeBooking handles post-confirmation logic (Emails, WebSocket, Audit)
func finalizeBooking(w http.ResponseWriter, r *http.Request, hub *ws.Hub, audit *services.AuditService, bookingID string, b models.Booking) {
	// Broadcast
	hub.Broadcast("SLOT_BOOKED", map[string]string{
		"date": b.Date,
		"time": b.Time,
	})

	// Audit Log
	userID := ""
	if b.UserID != nil {
		userID = *b.UserID
	}
	audit.Log(r.Context(), "booking.confirmed", userID, bookingID, "booking", r.RemoteAddr, r.UserAgent(), nil)

	// Email (with retry + circuit breaker via updated SendEmail)
	go func() {
		subject := "Confirmed: Your Journey Begins"
		body := fmt.Sprintf(`
			<h2>Welcome, %s.</h2>
			<p>Your sanctuary session is confirmed for <strong>%s at %s</strong>.</p>
			<p>We look forward to speaking with you.</p>
			<p><strong>Your Secure Video Link:</strong></p>
			<p><a href="%s" style="padding: 10px 20px; background-color: #E0B873; color: black; text-decoration: none; border-radius: 5px;">Join Session</a></p>
			<br>
			<p>You can also manage your bookings from your <a href="https://hidden-depths-web.pages.dev/profile">Profile</a>.</p>
		`, b.Name, b.Date, b.Time, b.MeetingLink)
		
		if err := services.SendEmail(b.Email, subject, body); err != nil {
			logger.Log.Error("Confirmation email failed after retries",
				zap.String("email", b.Email),
				zap.String("booking_id", bookingID),
				zap.Error(err),
			)
		}
	}()
}

// GetRecommendedSlots godoc
// @Summary Get recommended time slots
// @Description Returns available slots with neural-inspired scoring to help users pick optimal times.
// @Tags Bookings
// @Produce json
// @Param date path string true "Date (YYYY-MM-DD)"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /bookings/recommend/{date} [get]
func GetRecommendedSlots(w http.ResponseWriter, r *http.Request) {
	date := chi.URLParam(r, "date")
	if date == "" {
		response.AppErr(w, apperror.ValidationError("date", "Date is required"))
		return
	}

	// 1. Fetch booked slots with timeout
	ctx, cancel := context.WithTimeout(r.Context(), dbQueryTimeout)
	defer cancel()

	rows, err := database.Pool.Query(ctx,
		`SELECT time FROM bookings WHERE date = $1
		 AND (payment_status = 'paid'
		      OR (payment_status = 'pending' AND created_at > NOW() - INTERVAL '`+pendingHoldWindow+`'))`,
		date)
	if err != nil {
		logger.Error("Failed to check availability", zap.String("date", date), zap.Error(err))
		response.AppErr(w, apperror.DatabaseError("check availability", err))
		return
	}
	defer rows.Close()

	bookedMap := make(map[string]bool)
	for rows.Next() {
		var t string
		if err := rows.Scan(&t); err != nil {
			logger.Error("Failed to scan booked slot", zap.Error(err))
			continue
		}
		bookedMap[t] = true
	}

	// 2. Filter available
	allTimes := []string{"11:00 AM", "11:45 AM", "12:30 PM", "08:00 PM", "08:45 PM"}
	available := []string{}
	for _, t := range allTimes {
		if !bookedMap[t] {
			available = append(available, t)
		}
	}

	// 3. Neural-inspired scoring
	scores := services.RecommendSlots(available, date)
	
	response.JSON(w, http.StatusOK, scores, "Recommendations calculated")
}

// GetUserBookings godoc
// @Summary Get user's bookings
// @Description Returns all bookings for the authenticated user, ordered by date descending.
// @Tags Bookings
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /bookings/my [get]
// @Security BearerAuth
func GetUserBookings(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value("user_id").(string)
	if !ok || userID == "" {
		response.AppErr(w, apperror.AuthRequired().WithContext("reason", "user_id missing from context"))
		return
	}
	
	ctx, cancel := context.WithTimeout(r.Context(), dbQueryTimeout)
	defer cancel()

	rows, err := database.Pool.Query(ctx, 
		`SELECT id, date, time, name, email, meeting_link, payment_status, amount, created_at 
		FROM bookings WHERE user_id = $1 ORDER BY date DESC`, 
		userID,
	)
	if err != nil {
		logger.Error("Failed to fetch user bookings", zap.String("user_id", userID), zap.Error(err))
		response.AppErr(w, apperror.DatabaseError("fetch user bookings", err))
		return
	}
	defer rows.Close()

	var bookings []models.Booking
	for rows.Next() {
		var b models.Booking
		if err := rows.Scan(&b.ID, &b.Date, &b.Time, &b.Name, &b.Email, &b.MeetingLink, &b.PaymentStatus, &b.Amount, &b.CreatedAt); err != nil {
			logger.Error("Failed to scan user booking", zap.Error(err))
			continue
		}
		bookings = append(bookings, b)
	}

	response.JSON(w, http.StatusOK, bookings, "User bookings fetched")
}

// CancelBooking godoc
// @Summary Cancel a booking
// @Description Allows users to cancel their own booking. Frees the slot and broadcasts via WebSocket.
// @Tags Bookings
// @Produce json
// @Param id path string true "Booking ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /bookings/{id} [delete]
// @Security BearerAuth
func CancelBooking(w http.ResponseWriter, r *http.Request, hub *ws.Hub, audit *services.AuditService) {
	bookingID := chi.URLParam(r, "id")
	userID, ok := r.Context().Value("user_id").(string)
	if !ok || userID == "" {
		response.AppErr(w, apperror.AuthRequired())
		return
	}

	if bookingID == "" {
		response.AppErr(w, apperror.ValidationError("id", "Booking ID is required"))
		return
	}

	// Use timeout context for all DB operations
	ctx, cancel := context.WithTimeout(r.Context(), dbTransactionTimeout)
	defer cancel()

	// Fetch date and time before deleting (for WebSocket broadcast)
	var date, timeSlot string
	err := database.Pool.QueryRow(ctx,
		"SELECT date, time FROM bookings WHERE id = $1 AND user_id = $2",
		bookingID, userID,
	).Scan(&date, &timeSlot)

	if err != nil {
		response.AppErr(w, apperror.BookingNotFound(bookingID).WithContext("reason", "not found or not authorized"))
		return
	}

	result, err := database.Pool.Exec(ctx,
		"DELETE FROM bookings WHERE id = $1 AND user_id = $2",
		bookingID, userID,
	)

	if err != nil {
		logger.Error("Failed to cancel booking", zap.String("booking_id", bookingID), zap.Error(err))
		response.AppErr(w, apperror.DatabaseError("cancel booking", err))
		return
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		response.AppErr(w, apperror.BookingNotFound(bookingID))
		return
	}

	// Invalidate slots cache (slot freed up)
	InvalidateSlotsCache(r.Context(), date)

	// Broadcast the update
	hub.Broadcast("SLOT_CANCELLED", map[string]string{
		"date": date,
		"time": timeSlot,
	})

	// Audit Log
	audit.Log(r.Context(), "booking.cancel", userID, bookingID, "booking", r.RemoteAddr, r.UserAgent(), nil)

	response.JSON(w, http.StatusOK, nil, "Booking cancelled successfully")
}

// HealthReady godoc
// @Summary Readiness health check
// @Description Returns health status of database and cache connectivity. Used by load balancers.
// @Tags Health
// @Produce json
// @Success 200 {object} map[string]interface{} "System ready"
// @Failure 503 {object} map[string]interface{} "System degraded"
// @Router /health/ready [get]
func HealthReady(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	dbStatus := "ok"
	if err := database.Pool.Ping(ctx); err != nil {
		dbStatus = "degraded"
		logger.Log.Error("Health readiness: DB ping failed", zap.Error(err))
	}

	cacheStatus := "ok"
	if err := cache.HealthCheck(ctx); err != nil {
		if errors.Is(err, cache.ErrCacheDisabled) {
			cacheStatus = "disabled"
		} else {
			cacheStatus = "degraded"
			logger.Log.Warn("Health readiness: Cache ping failed", zap.Error(err))
		}
	}

	status := http.StatusOK
	overall := "ready"
	if dbStatus != "ok" {
		status = http.StatusServiceUnavailable
		overall = "degraded"
	}

	response.JSON(w, status, map[string]string{
		"status":   overall,
		"database": dbStatus,
		"cache":    cacheStatus,
	}, overall)
}

// RazorpayWebhook godoc
// @Summary Razorpay payment webhook
// @Description Handles asynchronous payment notifications from Razorpay. Source of truth for payment status.
// @Tags Webhooks
// @Accept json
// @Param X-Razorpay-Signature header string true "HMAC-SHA256 signature"
// @Success 200 "Webhook processed"
// @Failure 400 "Invalid payload"
// @Failure 401 "Invalid signature"
// @Failure 500 "Processing error"
// @Router /webhook/razorpay [post]
func RazorpayWebhook(w http.ResponseWriter, r *http.Request, hub *ws.Hub, audit *services.AuditService) {
	// Read raw body for signature verification
	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20)) // 1MB limit
	if err != nil {
		logger.Log.Error("Webhook: failed to read body", zap.Error(err))
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Verify webhook signature
	webhookSecret := os.Getenv("RAZORPAY_KEY_SECRET")
	if webhookSecret == "" {
		logger.Log.Error("Webhook: RAZORPAY_KEY_SECRET not configured")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	signature := r.Header.Get("X-Razorpay-Signature")
	if signature == "" {
		logger.Log.Warn("Webhook: missing signature header")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	h := hmac.New(sha256.New, []byte(webhookSecret))
	h.Write(body)
	expectedSig := hex.EncodeToString(h.Sum(nil))

	if !hmac.Equal([]byte(expectedSig), []byte(signature)) {
		logger.Log.Warn("Webhook: invalid signature")
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	// Parse event
	var event struct {
		Event   string `json:"event"`
		Payload struct {
			Payment struct {
				Entity struct {
					ID      string `json:"id"`
					OrderID string `json:"order_id"`
					Status  string `json:"status"`
					Notes   map[string]string `json:"notes"`
				} `json:"entity"`
			} `json:"payment"`
		} `json:"payload"`
	}
	if err := json.Unmarshal(body, &event); err != nil {
		logger.Log.Error("Webhook: failed to parse event", zap.Error(err))
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	paymentID := event.Payload.Payment.Entity.ID
	orderID := event.Payload.Payment.Entity.OrderID
	eventID := event.Event + ":" + paymentID

	logger.Log.Info("Webhook received",
		zap.String("event", event.Event),
		zap.String("payment_id", paymentID),
		zap.String("order_id", orderID),
	)

	// Idempotency check (with timeout)
	ctx, cancel := context.WithTimeout(r.Context(), dbTransactionTimeout)
	defer cancel()
	
	var exists int
	if err := database.Pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM processed_webhooks WHERE event_id = $1", eventID,
	).Scan(&exists); err == nil && exists > 0 {
		logger.Log.Info("Webhook already processed", zap.String("event_id", eventID))
		w.WriteHeader(http.StatusOK)
		return
	}

	switch event.Event {
	case "payment.captured":
		webhookConfirmPayment(ctx, orderID, paymentID, hub, audit)

	case "payment.failed":
		webhookReleaseSlot(ctx, orderID)

	default:
		logger.Log.Info("Webhook: unhandled event", zap.String("event", event.Event))
	}

	// Mark as processed
	database.Pool.Exec(ctx,
		"INSERT INTO processed_webhooks (event_id, event_type) VALUES ($1, $2) ON CONFLICT (event_id) DO NOTHING",
		eventID, event.Event,
	)

	w.WriteHeader(http.StatusOK)
}

// webhookConfirmPayment marks a booking as paid when Razorpay confirms capture.
func webhookConfirmPayment(ctx context.Context, orderID, paymentID string, hub *ws.Hub, audit *services.AuditService) {
	// Find booking by razorpay_order_id
	var b models.Booking
	err := database.Pool.QueryRow(ctx,
		"SELECT id, date, time, name, email, meeting_link, user_id FROM bookings WHERE razorpay_order_id = $1",
		orderID,
	).Scan(&b.ID, &b.Date, &b.Time, &b.Name, &b.Email, &b.MeetingLink, &b.UserID)
	if err != nil {
		logger.Log.Warn("Webhook: booking not found for order", zap.String("order_id", orderID), zap.Error(err))
		return
	}

	// Update to paid
	_, err = database.Pool.Exec(ctx,
		"UPDATE bookings SET payment_status = 'paid', razorpay_payment_id = $1 WHERE id = $2 AND payment_status = 'pending'",
		paymentID, b.ID,
	)
	if err != nil {
		logger.Log.Error("Webhook: failed to confirm booking", zap.String("booking_id", b.ID), zap.Error(err))
		return
	}

	// Invalidate slots cache
	InvalidateSlotsCache(ctx, b.Date)

	logger.Log.Info("Webhook: booking confirmed", zap.String("booking_id", b.ID))

	// Broadcast + email (same as VerifyPayment flow)
	hub.Broadcast("SLOT_BOOKED", map[string]string{"date": b.Date, "time": b.Time})

	userID := ""
	if b.UserID != nil {
		userID = *b.UserID
	}
	audit.Log(ctx, "booking.webhook_confirmed", userID, b.ID, "booking", "", "", nil)

	go func() {
		subject := "Confirmed: Your Journey Begins"
		body := fmt.Sprintf(`
			<h2>Welcome, %s.</h2>
			<p>Your sanctuary session is confirmed for <strong>%s at %s</strong>.</p>
			<p><a href="%s" style="padding: 10px 20px; background-color: #E0B873; color: black; text-decoration: none; border-radius: 5px;">Join Session</a></p>
			<p>Manage bookings: <a href="https://hidden-depths-web.pages.dev/profile">Profile</a></p>
		`, b.Name, b.Date, b.Time, b.MeetingLink)
		if err := services.SendEmail(b.Email, subject, body); err != nil {
			logger.Log.Error("Webhook: confirmation email failed", zap.String("email", b.Email), zap.Error(err))
		}
	}()
}

// webhookReleaseSlot deletes the pending booking to free the slot when payment fails.
func webhookReleaseSlot(ctx context.Context, orderID string) {
	// Get the date first for cache invalidation
	var date string
	_ = database.Pool.QueryRow(ctx,
		"SELECT date FROM bookings WHERE razorpay_order_id = $1 AND payment_status = 'pending'",
		orderID,
	).Scan(&date)

	result, err := database.Pool.Exec(ctx,
		"DELETE FROM bookings WHERE razorpay_order_id = $1 AND payment_status = 'pending'",
		orderID,
	)
	if err != nil {
		logger.Log.Error("Webhook: failed to release slot", zap.String("order_id", orderID), zap.Error(err))
		return
	}
	if result.RowsAffected() > 0 {
		// Invalidate cache if we deleted something
		if date != "" {
			InvalidateSlotsCache(ctx, date)
		}
		logger.Log.Info("Webhook: slot released after payment failure", zap.String("order_id", orderID))
	}
}