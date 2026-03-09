package handlers

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
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
	"github.com/Himadryy/hidden-depths-backend/pkg/circuitbreaker"
	"github.com/Himadryy/hidden-depths-backend/pkg/logger"
	"github.com/Himadryy/hidden-depths-backend/pkg/response"
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
// 3 minutes is enough for Razorpay checkout; shorter = faster self-healing from abandoned payments.
const pendingHoldWindow = "3 minutes"

// GetBookedSlots returns all time slots booked for a specific date.
// A slot is "booked" if it has a confirmed payment OR an active pending payment (< 5 min).
func GetBookedSlots(w http.ResponseWriter, r *http.Request) {
	date := chi.URLParam(r, "date")
	if date == "" {
		response.AppErr(w, apperror.ValidationError("date", "Date is required"))
		return
	}

	rows, err := database.Pool.Query(r.Context(),
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

	response.JSON(w, http.StatusOK, slots, "Slots fetched successfully")
}

// CreateBooking initiates a booking using atomic DB transaction.
// Logic:
//  1. Reject if a PAID booking exists for this slot (truly taken).
//  2. Reject if ANOTHER user has an active pending (< 5 min) — they're paying.
//  3. Delete ALL non-paid rows for this slot (own stale pending, others' expired, failed).
//  4. Create Razorpay order (if paid session, with circuit breaker) and INSERT the new booking.
//
// This allows the same user to retry freely and self-heals stale rows.
func CreateBooking(w http.ResponseWriter, r *http.Request, hub *ws.Hub, audit *services.AuditService) {
	var booking models.Booking
	if err := json.NewDecoder(r.Body).Decode(&booking); err != nil {
		response.AppErr(w, apperror.InvalidPayload(err))
		return
	}

	// 1. Basic Validation
	if booking.Date == "" {
		response.AppErr(w, apperror.ValidationError("date", "Date is required"))
		return
	}
	if booking.Time == "" {
		response.AppErr(w, apperror.ValidationError("time", "Time is required"))
		return
	}
	if booking.Name == "" {
		response.AppErr(w, apperror.ValidationError("name", "Name is required"))
		return
	}
	if booking.Email == "" {
		response.AppErr(w, apperror.ValidationError("email", "Email is required"))
		return
	}

	// Use authenticated user_id from context (secure, from JWT)
	if ctxUserID, ok := r.Context().Value("user_id").(string); ok && ctxUserID != "" {
		booking.UserID = &ctxUserID
	}

	// 1b. Day of week restriction (Sundays & Mondays only)
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

	// --- Atomic Slot Check & Reserve ---
	// Uses a DB transaction to prevent race conditions between check and insert.
	ctx := r.Context()
	tx, err := database.Pool.Begin(ctx)
	if err != nil {
		logger.Error("Failed to begin transaction", zap.Error(err))
		response.AppErr(w, apperror.DatabaseError("begin transaction", err))
		return
	}
	defer tx.Rollback(ctx)

	// 2. Check for PAID (confirmed) booking — within the transaction
	var paidCount int
	if err := tx.QueryRow(ctx,
		`SELECT COUNT(*) FROM bookings WHERE date = $1 AND time = $2 AND payment_status = 'paid'`,
		booking.Date, booking.Time,
	).Scan(&paidCount); err != nil {
		logger.Error("Failed to check paid slots", zap.Error(err))
		response.AppErr(w, apperror.DatabaseError("check slot availability", err))
		return
	}
	if paidCount > 0 {
		response.AppErr(w, apperror.SlotUnavailable(booking.Date, booking.Time))
		return
	}

	// 3. Check for ANOTHER user's active pending booking
	currentUserID := ""
	if booking.UserID != nil {
		currentUserID = *booking.UserID
	}
	var otherPendingCount int
	if err := tx.QueryRow(ctx,
		`SELECT COUNT(*) FROM bookings
		 WHERE date = $1 AND time = $2 AND payment_status = 'pending'
		 AND COALESCE(user_id::text, '') != $3
		 AND created_at > NOW() - INTERVAL '`+pendingHoldWindow+`'`,
		booking.Date, booking.Time, currentUserID,
	).Scan(&otherPendingCount); err != nil {
		logger.Error("Failed to check pending slots", zap.Error(err))
		response.AppErr(w, apperror.DatabaseError("check slot availability", err))
		return
	}
	if otherPendingCount > 0 {
		response.AppErr(w, apperror.SlotHeldByOther(booking.Date, booking.Time))
		return
	}

	// 4. Clear ALL non-paid bookings for this slot (within transaction)
	if _, err := tx.Exec(ctx,
		`DELETE FROM bookings WHERE date = $1 AND time = $2 AND payment_status != 'paid'`,
		booking.Date, booking.Time,
	); err != nil {
		logger.Error("Failed to clean up stale bookings",
			zap.String("date", booking.Date), zap.String("time", booking.Time), zap.Error(err))
	}

	// 5. Generate Meeting Link
	meetingID := uuid.New().String()
	booking.MeetingLink = fmt.Sprintf("https://meet.jit.si/HiddenDepths-%s-%s", meetingID[:8], booking.Date)

	isPaid, err := isPaidSession(booking.Date)
	if err != nil {
		response.AppErr(w, apperror.ValidationError("date", "Invalid date format"))
		return
	}

	booking.Amount = 0
	booking.PaymentStatus = "paid" // Default for free sessions

	var razorpayOrderID string
	var ok bool

	// 6. Handle Payment Logic — with circuit breaker protection
	if isPaid {
		booking.Amount = 99.00
		booking.PaymentStatus = "pending"

		keyID := os.Getenv("RAZORPAY_KEY_ID")
		keySecret := os.Getenv("RAZORPAY_KEY_SECRET")
		if keyID == "" || keySecret == "" {
			response.AppErr(w, apperror.ExternalServiceError("razorpay", fmt.Errorf("payment configuration missing")))
			return
		}

		// Circuit breaker wraps the Razorpay API call
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

		razorpayOrderID, ok = body["id"].(string)
		if !ok || razorpayOrderID == "" {
			response.AppErr(w, apperror.PaymentGatewayError(fmt.Errorf("invalid order response: missing id")))
			return
		}
		booking.RazorpayOrderID = razorpayOrderID
	}

	// 7. Insert into Database (within transaction)
	var newID string
	err = tx.QueryRow(ctx,
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
	if err := tx.Commit(ctx); err != nil {
		logger.Error("Failed to commit booking transaction", zap.Error(err))
		response.AppErr(w, apperror.DatabaseError("commit booking", err))
		return
	}

	// 9. Response Handling
	if isPaid {
		response.JSON(w, http.StatusOK, map[string]interface{}{
			"booking_id": newID,
			"order_id":   razorpayOrderID,
			"amount":     booking.Amount * 100,
			"currency":   "INR",
			"key_id":     os.Getenv("RAZORPAY_KEY_ID"),
		}, "Payment initiated")
	} else {
		finalizeBooking(w, r, hub, audit, newID, booking)
		response.JSON(w, http.StatusCreated, map[string]string{"booking_id": newID}, "Booking successful")
	}
}

// VerifyPayment confirms a Razorpay payment and finalizes the booking
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
		
		// DELETE the pending booking to immediately free the slot
		if _, err := database.Pool.Exec(r.Context(),
			"DELETE FROM bookings WHERE id = $1 AND payment_status = 'pending'", req.BookingID); err != nil {
			logger.Error("Failed to clean up failed booking", zap.String("booking_id", req.BookingID), zap.Error(err))
		}
		return
	}

	// 2. Fetch Booking Details
	var b models.Booking
	err := database.Pool.QueryRow(r.Context(),
		"SELECT id, date, time, name, email, meeting_link, user_id FROM bookings WHERE id = $1",
		req.BookingID,
	).Scan(&b.ID, &b.Date, &b.Time, &b.Name, &b.Email, &b.MeetingLink, &b.UserID)

	if err != nil {
		response.AppErr(w, apperror.BookingNotFound(req.BookingID))
		return
	}

	// 3. Update DB
	_, err = database.Pool.Exec(r.Context(),
		"UPDATE bookings SET payment_status = 'paid', razorpay_payment_id = $1 WHERE id = $2",
		req.RazorpayPaymentID, req.BookingID,
	)
	if err != nil {
		logger.Error("Failed to update booking payment status", zap.String("booking_id", req.BookingID), zap.Error(err))
		response.AppErr(w, apperror.DatabaseError("update booking", err))
		return
	}

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

// GetRecommendedSlots provides a score for each available slot on a date
func GetRecommendedSlots(w http.ResponseWriter, r *http.Request) {
	date := chi.URLParam(r, "date")
	if date == "" {
		response.AppErr(w, apperror.ValidationError("date", "Date is required"))
		return
	}

	// 1. Fetch booked slots (same logic as GetBookedSlots)
	rows, err := database.Pool.Query(r.Context(),
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

// GetUserBookings returns all bookings for the authenticated user
func GetUserBookings(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value("user_id").(string)
	if !ok || userID == "" {
		response.AppErr(w, apperror.AuthRequired().WithContext("reason", "user_id missing from context"))
		return
	}
	
	rows, err := database.Pool.Query(r.Context(), 
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

// CancelBooking allows a user to cancel their own booking
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

	// Fetch date and time before deleting (for WebSocket broadcast)
	var date, timeSlot string
	err := database.Pool.QueryRow(r.Context(),
		"SELECT date, time FROM bookings WHERE id = $1 AND user_id = $2",
		bookingID, userID,
	).Scan(&date, &timeSlot)

	if err != nil {
		response.AppErr(w, apperror.BookingNotFound(bookingID).WithContext("reason", "not found or not authorized"))
		return
	}

	result, err := database.Pool.Exec(r.Context(),
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

	// Broadcast the update
	hub.Broadcast("SLOT_CANCELLED", map[string]string{
		"date": date,
		"time": timeSlot,
	})

	// Audit Log
	audit.Log(r.Context(), "booking.cancel", userID, bookingID, "booking", r.RemoteAddr, r.UserAgent(), nil)

	response.JSON(w, http.StatusOK, nil, "Booking cancelled successfully")
}

// HealthReady checks if the backend can serve requests (DB connectivity).
func HealthReady(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	dbStatus := "ok"
	if err := database.Pool.Ping(ctx); err != nil {
		dbStatus = "degraded"
		logger.Log.Error("Health readiness: DB ping failed", zap.Error(err))
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
	}, overall)
}

// RazorpayWebhook handles asynchronous payment notifications from Razorpay.
// This is the source of truth for payment status — even if the frontend loses connection,
// the webhook ensures bookings are confirmed or released.
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

	// Idempotency check
	ctx := r.Context()
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
	result, err := database.Pool.Exec(ctx,
		"DELETE FROM bookings WHERE razorpay_order_id = $1 AND payment_status = 'pending'",
		orderID,
	)
	if err != nil {
		logger.Log.Error("Webhook: failed to release slot", zap.String("order_id", orderID), zap.Error(err))
		return
	}
	if result.RowsAffected() > 0 {
		logger.Log.Info("Webhook: slot released after payment failure", zap.String("order_id", orderID))
	}
}