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
const (
	pendingHoldDuration = 5 * time.Minute
	pendingHoldWindow   = "5 minutes"
)

// Database operation timeouts
const (
	dbQueryTimeout       = 15 * time.Second // Default for read queries
	dbTransactionTimeout = 30 * time.Second // For multi-step transactions
)

type slotAvailability struct {
	Slots          []string          `json:"slots"`
	PaidSlots      []string          `json:"paid_slots"`
	HeldSlots      []string          `json:"held_slots"`
	HoldExpiresAt  map[string]string `json:"hold_expires_at,omitempty"`
	HoldWindowSecs int               `json:"hold_window_seconds"`
}

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

	// Prevent browser/CDN caching — availability data must always be fresh
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")

	ctx := r.Context()
	cacheKey := cache.SlotsKey(date)

	// Try cache first
	if availability, err := cache.Get[slotAvailability](ctx, cacheKey); err == nil {
		logger.Debug("Cache hit for slots", zap.String("date", date))
		response.JSON(w, http.StatusOK, availability, "Slots fetched successfully")
		return
	}

	// Cache miss or disabled — query DB with timeout
	queryCtx, cancel := context.WithTimeout(ctx, dbQueryTimeout)
	defer cancel()

	rows, err := database.Pool.Query(queryCtx,
		`SELECT time, payment_status, created_at FROM bookings
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

	availability := slotAvailability{
		Slots:          make([]string, 0, 8),
		PaidSlots:      make([]string, 0, 8),
		HeldSlots:      make([]string, 0, 8),
		HoldExpiresAt:  make(map[string]string),
		HoldWindowSecs: int(pendingHoldDuration.Seconds()),
	}
	slotSet := make(map[string]struct{})
	for rows.Next() {
		var (
			timeSlot      string
			paymentStatus string
			createdAt     time.Time
		)
		if err := rows.Scan(&timeSlot, &paymentStatus, &createdAt); err != nil {
			logger.Error("Failed to scan time slot", zap.Error(err))
			continue
		}
		if _, exists := slotSet[timeSlot]; !exists {
			slotSet[timeSlot] = struct{}{}
			availability.Slots = append(availability.Slots, timeSlot)
		}

		switch paymentStatus {
		case "paid":
			availability.PaidSlots = append(availability.PaidSlots, timeSlot)
		case "pending":
			availability.HeldSlots = append(availability.HeldSlots, timeSlot)
			availability.HoldExpiresAt[timeSlot] = createdAt.Add(pendingHoldDuration).UTC().Format(time.RFC3339)
		}
	}

	// Populate cache (ignore errors — cache is optional)
	if len(availability.HoldExpiresAt) == 0 {
		availability.HoldExpiresAt = nil
	}
	_ = cache.Set(ctx, cacheKey, availability, cache.SlotsTTL)

	response.JSON(w, http.StatusOK, availability, "Slots fetched successfully")
}

// InvalidateSlotsCache removes cached slots for a given date.
// Call this after any booking state change (create, cancel, verify payment).
func InvalidateSlotsCache(ctx context.Context, date string) {
	if err := cache.Delete(ctx, cache.SlotsKey(date)); err != nil && !errors.Is(err, cache.ErrCacheDisabled) {
		logger.Warn("Failed to invalidate slots cache", zap.String("date", date), zap.Error(err))
	}
}

// GetBookingPolicy godoc
// @Summary Get active booking policy
// @Description Returns booking capacity policy used by both frontend and backend validation.
// @Tags Bookings
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /bookings/policy [get]
func GetBookingPolicy(w http.ResponseWriter, r *http.Request) {
	policy := getBookingPolicyConfig()
	availableDates := computeEligibleBookingDates(time.Now(), policy)
	allowedWeekdays := make([]int, 0, len(policy.AllowedWeekdays))
	for _, weekday := range policy.AllowedWeekdays {
		allowedWeekdays = append(allowedWeekdays, int(weekday))
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"safe_mode":          policy.SafeMode,
		"search_window_days": policy.SearchWindowDays,
		"max_bookable_dates": policy.MaxBookableDates,
		"allowed_weekdays":   allowedWeekdays,
		"time_slots":         policy.TimeSlots,
		"available_dates":    availableDates,
	}, "Booking policy fetched")
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

	// 3. Booking policy checks (capacity-safe mode + allowed weekdays + known slots)
	bookingDate, err := time.Parse("2006-01-02", booking.Date)
	if err != nil {
		response.AppErr(w, apperror.ValidationError("date", "Invalid date format. Use YYYY-MM-DD."))
		return
	}
	policy := getBookingPolicyConfig()
	if !isWeekdayAllowed(bookingDate.Weekday(), policy.AllowedWeekdays) {
		response.AppErr(w, apperror.ValidationError("date", "This date is not available for booking"))
		return
	}

	allowedByWindow, policyMessage, err := isBookingDateAllowed(booking.Date, time.Now(), policy)
	if err != nil {
		response.AppErr(w, apperror.ValidationError("date", "Invalid date format"))
		return
	}
	if !allowedByWindow {
		response.AppErr(w, apperror.ValidationError("date", policyMessage))
		return
	}

	if !isTimeSlotAllowed(booking.Time, policy) {
		response.AppErr(w, apperror.ValidationError("time", "This time slot is not available for booking"))
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
	logger.Info("Booking created",
		zap.String("booking_id", newID),
		zap.String("date", booking.Date),
		zap.String("time", booking.Time),
		zap.String("payment_status", booking.PaymentStatus),
	)

	// Broadcast slot status change via WebSocket for real-time UI updates
	hub.Broadcast("SLOT_PENDING", map[string]string{
		"date": booking.Date,
		"time": booking.Time,
	})

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
		`SELECT id, date, time, name, email, meeting_link, user_id, payment_status, razorpay_order_id
		 FROM bookings WHERE id = $1 FOR UPDATE`,
		req.BookingID,
	).Scan(&b.ID, &b.Date, &b.Time, &b.Name, &b.Email, &b.MeetingLink, &b.UserID, &b.PaymentStatus, &b.RazorpayOrderID)

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
	if b.PaymentStatus != "pending" {
		response.AppErr(w, apperror.PaymentDeclined("booking is not pending"))
		return
	}
	if b.RazorpayOrderID != req.RazorpayOrderID {
		response.AppErr(w, apperror.ValidationError("razorpay_order_id", "Order ID does not match booking"))
		return
	}

	// 3. Update to paid (within transaction)
	result, err := tx.Exec(txCtx,
		"UPDATE bookings SET payment_status = 'paid', razorpay_payment_id = $1 WHERE id = $2 AND payment_status = 'pending'",
		req.RazorpayPaymentID, req.BookingID,
	)
	if err != nil {
		logger.Error("Failed to update booking payment status", zap.String("booking_id", req.BookingID), zap.Error(err))
		response.AppErr(w, apperror.DatabaseError("update booking", err))
		return
	}
	if result.RowsAffected() == 0 {
		response.AppErr(w, apperror.PaymentDeclined("booking is no longer pending"))
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
	logger.Info("Payment verified",
		zap.String("booking_id", b.ID),
		zap.String("order_id", req.RazorpayOrderID),
		zap.String("payment_id", req.RazorpayPaymentID),
	)

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

	// Email (prefer Resend, fallback to SMTP)
	go func() {
		emailSvc := services.GetEmailService()
		if emailSvc != nil && emailSvc.IsEnabled() {
			// Use Resend with professional templates
			if err := emailSvc.SendBookingConfirmation(b.Email, b.Name, b.Date, b.Time, b.MeetingLink); err != nil {
				logger.Log.Error("Resend confirmation email failed",
					zap.String("email", b.Email),
					zap.String("booking_id", bookingID),
					zap.Error(err),
				)
			}
		} else {
			// Fallback to legacy SMTP
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
				logger.Log.Error("SMTP confirmation email failed after retries",
					zap.String("email", b.Email),
					zap.String("booking_id", bookingID),
					zap.Error(err),
				)
			}
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

	// 2. Filter available based on active booking policy time slots
	policy := getBookingPolicyConfig()
	allTimes := policy.TimeSlots
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

// GetBookingStatus godoc
// @Summary Get booking payment status
// @Description Returns the latest payment status for one booking owned by the authenticated user.
// @Tags Bookings
// @Produce json
// @Param id path string true "Booking ID"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /bookings/{id}/status [get]
// @Security BearerAuth
func GetBookingStatus(w http.ResponseWriter, r *http.Request) {
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

	ctx, cancel := context.WithTimeout(r.Context(), dbQueryTimeout)
	defer cancel()

	var (
		paymentStatus string
		date          string
		timeSlot      string
		createdAt     time.Time
		orderID       string
		paymentID     string
	)
	err := database.Pool.QueryRow(ctx,
		`SELECT payment_status, date, time, created_at, COALESCE(razorpay_order_id, ''), COALESCE(razorpay_payment_id, '')
		 FROM bookings WHERE id = $1 AND user_id = $2`,
		bookingID, userID,
	).Scan(&paymentStatus, &date, &timeSlot, &createdAt, &orderID, &paymentID)
	if err != nil {
		response.AppErr(w, apperror.BookingNotFound(bookingID))
		return
	}

	payload := map[string]interface{}{
		"booking_id":          bookingID,
		"payment_status":      paymentStatus,
		"is_confirmed":        paymentStatus == "paid",
		"date":                date,
		"time":                timeSlot,
		"razorpay_order_id":   orderID,
		"razorpay_payment_id": paymentID,
	}
	if paymentStatus == "pending" {
		payload["hold_expires_at"] = createdAt.Add(pendingHoldDuration).UTC().Format(time.RFC3339)
	}

	response.JSON(w, http.StatusOK, payload, "Booking status fetched")
}

// ReleasePendingBooking godoc
// @Summary Release pending booking
// @Description Marks a pending booking as failed to free the slot safely without deleting confirmed bookings.
// @Tags Bookings
// @Produce json
// @Param id path string true "Booking ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 409 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /bookings/{id}/release-pending [post]
// @Security BearerAuth
func ReleasePendingBooking(w http.ResponseWriter, r *http.Request, hub *ws.Hub, audit *services.AuditService) {
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

	ctx, cancel := context.WithTimeout(r.Context(), dbTransactionTimeout)
	defer cancel()

	var (
		date      string
		timeSlot  string
		payStatus string
	)
	err := database.Pool.QueryRow(ctx,
		"SELECT date, time, payment_status FROM bookings WHERE id = $1 AND user_id = $2",
		bookingID, userID,
	).Scan(&date, &timeSlot, &payStatus)
	if err != nil {
		response.AppErr(w, apperror.BookingNotFound(bookingID))
		return
	}

	if payStatus == "paid" {
		response.AppErr(w, apperror.ValidationError("booking", "Booking is already confirmed and cannot be auto-released"))
		return
	}
	if payStatus == "failed" {
		response.JSON(w, http.StatusOK, nil, "Pending booking already released")
		return
	}

	result, err := database.Pool.Exec(ctx,
		"UPDATE bookings SET payment_status = 'failed' WHERE id = $1 AND user_id = $2 AND payment_status = 'pending'",
		bookingID, userID,
	)
	if err != nil {
		logger.Error("Failed to release pending booking", zap.String("booking_id", bookingID), zap.Error(err))
		response.AppErr(w, apperror.DatabaseError("release pending booking", err))
		return
	}
	if result.RowsAffected() == 0 {
		response.AppErr(w, apperror.ValidationError("booking", "Booking is no longer pending"))
		return
	}

	InvalidateSlotsCache(r.Context(), date)
	hub.Broadcast("SLOT_CANCELLED", map[string]string{
		"date": date,
		"time": timeSlot,
	})
	audit.Log(r.Context(), "booking.pending_released", userID, bookingID, "booking", r.RemoteAddr, r.UserAgent(), nil)
	response.JSON(w, http.StatusOK, nil, "Pending booking released")
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
	if r.Header.Get("X-Booking-Cancel") != "confirmed" {
		response.AppErr(w, apperror.ValidationError("cancel", "Use explicit confirmed cancellation flow"))
		return
	}

	// Use timeout context for all DB operations
	ctx, cancel := context.WithTimeout(r.Context(), dbTransactionTimeout)
	defer cancel()

	// Fetch booking details before deleting (for WebSocket broadcast & email)
	var date, timeSlot, name, email, paymentStatus string
	err := database.Pool.QueryRow(ctx,
		"SELECT date, time, name, email, payment_status FROM bookings WHERE id = $1 AND user_id = $2",
		bookingID, userID,
	).Scan(&date, &timeSlot, &name, &email, &paymentStatus)

	if err != nil {
		response.AppErr(w, apperror.BookingNotFound(bookingID).WithContext("reason", "not found or not authorized"))
		return
	}
	if paymentStatus != "paid" {
		response.AppErr(w, apperror.ValidationError("booking", "Only confirmed bookings can be cancelled here"))
		return
	}

	result, err := database.Pool.Exec(ctx,
		"DELETE FROM bookings WHERE id = $1 AND user_id = $2 AND payment_status = 'paid'",
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

	// Send cancellation email (async)
	go func() {
		emailSvc := services.GetEmailService()
		if emailSvc != nil && emailSvc.IsEnabled() {
			if err := emailSvc.SendBookingCancellation(email, name, date, timeSlot); err != nil {
				logger.Log.Error("Cancellation email failed",
					zap.String("email", email),
					zap.String("booking_id", bookingID),
					zap.Error(err),
				)
			}
		}
	}()

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
	webhookSecret := os.Getenv("RAZORPAY_WEBHOOK_SECRET")
	if webhookSecret == "" {
		// Backward-compatible fallback for existing environments.
		webhookSecret = os.Getenv("RAZORPAY_KEY_SECRET")
		logger.Log.Warn("Webhook secret not configured separately; falling back to RAZORPAY_KEY_SECRET")
	}
	if webhookSecret == "" {
		logger.Log.Error("Webhook: webhook secret not configured")
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
					ID      string            `json:"id"`
					OrderID string            `json:"order_id"`
					Status  string            `json:"status"`
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
		webhookReleaseSlot(ctx, orderID, hub)

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

// webhookReleaseSlot marks pending booking as failed to free slot when payment fails.
func webhookReleaseSlot(ctx context.Context, orderID string, hub *ws.Hub) {
	// Fetch slot info first for cache invalidation + websocket broadcast.
	var (
		date     string
		timeSlot string
	)
	err := database.Pool.QueryRow(ctx,
		"SELECT date, time FROM bookings WHERE razorpay_order_id = $1 AND payment_status = 'pending'",
		orderID,
	).Scan(&date, &timeSlot)
	if err != nil {
		logger.Log.Warn("Webhook: no pending booking found for failed payment", zap.String("order_id", orderID), zap.Error(err))
		return
	}

	result, err := database.Pool.Exec(ctx,
		"UPDATE bookings SET payment_status = 'failed' WHERE razorpay_order_id = $1 AND payment_status = 'pending'",
		orderID,
	)
	if err != nil {
		logger.Log.Error("Webhook: failed to release slot", zap.String("order_id", orderID), zap.Error(err))
		return
	}
	if result.RowsAffected() > 0 {
		InvalidateSlotsCache(ctx, date)
		hub.Broadcast("SLOT_CANCELLED", map[string]string{
			"date": date,
			"time": timeSlot,
		})
		logger.Log.Info("Webhook: slot released after payment failure",
			zap.String("order_id", orderID),
			zap.String("date", date),
			zap.String("time", timeSlot),
		)
	}
}
