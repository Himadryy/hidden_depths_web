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
	appmetrics "github.com/Himadryy/hidden-depths-backend/internal/middleware"
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
	"github.com/jackc/pgx/v5"
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

const (
	paymentStatusPending   = "pending"
	paymentStatusPaid      = "paid"
	paymentStatusFailed    = "failed"
	paymentStatusCancelled = "cancelled"
)

type releasePendingAction int

const (
	releasePendingActionUpdate releasePendingAction = iota
	releasePendingActionRejectPaid
	releasePendingActionNoopAlreadyReleased
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

func buildWebhookEventID(eventType, paymentID, orderID string) string {
	switch {
	case paymentID != "":
		return eventType + ":" + paymentID
	case orderID != "":
		return eventType + ":order:" + orderID
	default:
		return eventType + ":unknown"
	}
}

func withRequestID(r *http.Request, fields ...zap.Field) []zap.Field {
	if requestID := strings.TrimSpace(r.Header.Get("X-Request-Id")); requestID != "" {
		return append(fields, zap.String("request_id", requestID))
	}
	return fields
}

func userIDString(userID *string) string {
	if userID == nil {
		return ""
	}
	return *userID
}

func releasePendingActionForStatus(paymentStatus string) releasePendingAction {
	switch paymentStatus {
	case paymentStatusPaid:
		return releasePendingActionRejectPaid
	case paymentStatusFailed, paymentStatusCancelled:
		return releasePendingActionNoopAlreadyReleased
	default:
		return releasePendingActionUpdate
	}
}

func confirmBookingPaymentByID(ctx context.Context, bookingID, expectedOrderID, paymentID string) (models.Booking, bool, *apperror.AppError) {
	var b models.Booking

	tx, err := database.Pool.Begin(ctx)
	if err != nil {
		return b, false, apperror.DatabaseError("begin payment confirmation", err)
	}
	defer tx.Rollback(ctx)

	err = tx.QueryRow(ctx,
		`SELECT id, date, time, name, email, meeting_link, user_id, payment_status, razorpay_order_id
		 FROM bookings
		 WHERE id = $1
		 FOR UPDATE`,
		bookingID,
	).Scan(&b.ID, &b.Date, &b.Time, &b.Name, &b.Email, &b.MeetingLink, &b.UserID, &b.PaymentStatus, &b.RazorpayOrderID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return b, false, apperror.BookingNotFound(bookingID)
		}
		return b, false, apperror.DatabaseError("fetch booking for confirmation", err)
	}

	if expectedOrderID != "" && b.RazorpayOrderID != expectedOrderID {
		return b, false, apperror.ValidationError("razorpay_order_id", "Order ID does not match booking")
	}

	if b.PaymentStatus == paymentStatusPaid {
		if err := tx.Commit(ctx); err != nil {
			return b, false, apperror.DatabaseError("commit idempotent confirmation", err)
		}
		return b, false, nil
	}
	if b.PaymentStatus != paymentStatusPending {
		return b, false, apperror.PaymentDeclined("booking is not pending")
	}

	result, err := tx.Exec(ctx,
		`UPDATE bookings
		 SET payment_status = $1,
		     razorpay_payment_id = $2,
		     status_reason = 'payment_confirmed',
		     confirmed_at = COALESCE(confirmed_at, NOW())
		 WHERE id = $3
		   AND payment_status = $4`,
		paymentStatusPaid, paymentID, b.ID, paymentStatusPending,
	)
	if err != nil {
		return b, false, apperror.DatabaseError("update booking payment status", err)
	}
	if result.RowsAffected() == 0 {
		return b, false, apperror.PaymentDeclined("booking is no longer pending")
	}

	if err := tx.Commit(ctx); err != nil {
		return b, false, apperror.DatabaseError("commit payment confirmation", err)
	}

	b.PaymentStatus = paymentStatusPaid
	b.RazorpayPaymentID = paymentID
	return b, true, nil
}

func confirmBookingPaymentByOrderID(ctx context.Context, orderID, paymentID string) (models.Booking, bool, error) {
	var b models.Booking

	tx, err := database.Pool.Begin(ctx)
	if err != nil {
		return b, false, err
	}
	defer tx.Rollback(ctx)

	err = tx.QueryRow(ctx,
		`SELECT id, date, time, name, email, meeting_link, user_id, payment_status, razorpay_order_id
		 FROM bookings
		 WHERE razorpay_order_id = $1
		 ORDER BY created_at DESC
		 LIMIT 1
		 FOR UPDATE`,
		orderID,
	).Scan(&b.ID, &b.Date, &b.Time, &b.Name, &b.Email, &b.MeetingLink, &b.UserID, &b.PaymentStatus, &b.RazorpayOrderID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return b, false, nil
		}
		return b, false, err
	}

	if b.PaymentStatus == paymentStatusPaid {
		if err := tx.Commit(ctx); err != nil {
			return b, false, err
		}
		return b, false, nil
	}
	if b.PaymentStatus != paymentStatusPending {
		if err := tx.Commit(ctx); err != nil {
			return b, false, err
		}
		return b, false, nil
	}

	result, err := tx.Exec(ctx,
		`UPDATE bookings
		 SET payment_status = $1,
		     razorpay_payment_id = $2,
		     status_reason = 'payment_confirmed_webhook',
		     confirmed_at = COALESCE(confirmed_at, NOW())
		 WHERE id = $3
		   AND payment_status = $4`,
		paymentStatusPaid, paymentID, b.ID, paymentStatusPending,
	)
	if err != nil {
		return b, false, err
	}
	if result.RowsAffected() == 0 {
		if err := tx.Commit(ctx); err != nil {
			return b, false, err
		}
		return b, false, nil
	}

	if err := tx.Commit(ctx); err != nil {
		return b, false, err
	}

	b.PaymentStatus = paymentStatusPaid
	b.RazorpayPaymentID = paymentID
	return b, true, nil
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
		appmetrics.RecordBookingOperation("create", "validation_error")
		logger.Warn("Create booking payload invalid",
			withRequestID(r, zap.Error(err))...,
		)
		response.AppErr(w, apperror.InvalidPayload(err))
		return
	}

	// 1. Sanitize inputs
	booking.Name = validator.SanitizeString(booking.Name)
	booking.Email = validator.SanitizeString(booking.Email)
	booking.Date = validator.SanitizeString(booking.Date)
	booking.Time = validator.SanitizeString(booking.Time)

	// Use authenticated user_id from context (secure, from JWT)
	if ctxUserID, ok := r.Context().Value("user_id").(string); ok && ctxUserID != "" {
		booking.UserID = &ctxUserID
	}
	currentUserID := userIDString(booking.UserID)

	// 2. Validate all fields
	validationErrors := validator.ValidateBooking(validator.BookingInput{
		Date:  booking.Date,
		Time:  booking.Time,
		Name:  booking.Name,
		Email: booking.Email,
	})
	if len(validationErrors) > 0 {
		appmetrics.RecordBookingOperation("create", "validation_error")
		logger.Warn("Create booking validation failed",
			withRequestID(r,
				zap.String("user_id", currentUserID),
				zap.String("date", booking.Date),
				zap.String("time", booking.Time),
				zap.String("field", validationErrors[0].Field),
			)...,
		)
		// Return the first validation error (most important)
		response.AppErr(w, apperror.ValidationError(validationErrors[0].Field, validationErrors[0].Message))
		return
	}

	// 3. Booking policy checks (capacity-safe mode + allowed weekdays + known slots)
	bookingDate, err := time.Parse("2006-01-02", booking.Date)
	if err != nil {
		appmetrics.RecordBookingOperation("create", "validation_error")
		logger.Warn("Create booking rejected: invalid date",
			withRequestID(r,
				zap.String("user_id", currentUserID),
				zap.String("date", booking.Date),
				zap.String("time", booking.Time),
			)...,
		)
		response.AppErr(w, apperror.ValidationError("date", "Invalid date format. Use YYYY-MM-DD."))
		return
	}
	policy := getBookingPolicyConfig()
	if !isWeekdayAllowed(bookingDate.Weekday(), policy.AllowedWeekdays) {
		appmetrics.RecordBookingOperation("create", "validation_error")
		logger.Warn("Create booking rejected: weekday not allowed",
			withRequestID(r,
				zap.String("user_id", currentUserID),
				zap.String("date", booking.Date),
				zap.String("time", booking.Time),
			)...,
		)
		response.AppErr(w, apperror.ValidationError("date", "This date is not available for booking"))
		return
	}

	allowedByWindow, policyMessage, err := isBookingDateAllowed(booking.Date, time.Now(), policy)
	if err != nil {
		appmetrics.RecordBookingOperation("create", "validation_error")
		logger.Warn("Create booking rejected: date policy parse error",
			withRequestID(r,
				zap.String("user_id", currentUserID),
				zap.String("date", booking.Date),
				zap.String("time", booking.Time),
			)...,
		)
		response.AppErr(w, apperror.ValidationError("date", "Invalid date format"))
		return
	}
	if !allowedByWindow {
		appmetrics.RecordBookingOperation("create", "validation_error")
		logger.Warn("Create booking rejected: outside booking window",
			withRequestID(r,
				zap.String("user_id", currentUserID),
				zap.String("date", booking.Date),
				zap.String("time", booking.Time),
			)...,
		)
		response.AppErr(w, apperror.ValidationError("date", policyMessage))
		return
	}

	if !isTimeSlotAllowed(booking.Time, policy) {
		appmetrics.RecordBookingOperation("create", "validation_error")
		logger.Warn("Create booking rejected: slot not allowed",
			withRequestID(r,
				zap.String("user_id", currentUserID),
				zap.String("date", booking.Date),
				zap.String("time", booking.Time),
			)...,
		)
		response.AppErr(w, apperror.ValidationError("time", "This time slot is not available for booking"))
		return
	}

	// 4. Check if this is a paid session
	isPaid, err := isPaidSession(booking.Date)
	if err != nil {
		appmetrics.RecordBookingOperation("create", "validation_error")
		logger.Warn("Create booking rejected: paid-session check failed",
			withRequestID(r,
				zap.String("user_id", currentUserID),
				zap.String("date", booking.Date),
				zap.String("time", booking.Time),
			)...,
		)
		response.AppErr(w, apperror.ValidationError("date", "Invalid date format"))
		return
	}

	// 2. Generate Meeting Link (before transaction)
	// Use internal session page for branded experience
	meetingID := uuid.New().String()[:8]
	booking.MeetingLink = fmt.Sprintf("https://hidden-depths-web.pages.dev/session?room=%s-%s", meetingID, booking.Date)

	booking.Amount = 0
	booking.PaymentStatus = paymentStatusPaid // Default for free sessions
	statusReason := "free_session_confirmed"
	var confirmedAt *time.Time
	now := time.Now().UTC()
	confirmedAt = &now

	// 3. Create Razorpay order BEFORE transaction (if paid session)
	// This prevents holding DB locks while waiting for external API
	if isPaid {
		booking.Amount = 99.00
		booking.PaymentStatus = paymentStatusPending
		statusReason = "payment_pending"
		confirmedAt = nil

		keyID := os.Getenv("RAZORPAY_KEY_ID")
		keySecret := os.Getenv("RAZORPAY_KEY_SECRET")
		if keyID == "" || keySecret == "" {
			logger.Error("Create booking failed: Razorpay configuration missing",
				withRequestID(r,
					zap.String("user_id", currentUserID),
					zap.String("date", booking.Date),
					zap.String("time", booking.Time),
				)...,
			)
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
			logger.Error("Razorpay order creation failed",
				withRequestID(r,
					zap.String("user_id", currentUserID),
					zap.String("date", booking.Date),
					zap.String("time", booking.Time),
					zap.Error(err),
				)...,
			)
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
		appmetrics.RecordBookingOperation("create", "db_error")
		logger.Error("Create booking failed: transaction start",
			withRequestID(r,
				zap.String("user_id", currentUserID),
				zap.String("date", booking.Date),
				zap.String("time", booking.Time),
				zap.Error(err),
			)...,
		)
		response.AppErr(w, apperror.DatabaseError("begin transaction", err))
		return
	}
	defer tx.Rollback(txCtx)

	// 2. Expire stale pending holds for this slot inside the transaction.
	if _, err := tx.Exec(txCtx,
		`UPDATE bookings
		 SET payment_status = $3,
		     status_reason = 'hold_expired',
		     failed_at = COALESCE(failed_at, NOW()),
		     released_at = COALESCE(released_at, NOW())
		 WHERE date = $1
		   AND time = $2
		   AND payment_status = $4
		   AND created_at <= NOW() - INTERVAL '`+pendingHoldWindow+`'`,
		booking.Date, booking.Time, paymentStatusFailed, paymentStatusPending,
	); err != nil {
		appmetrics.RecordBookingOperation("create", "db_error")
		logger.Error("Create booking failed: stale hold cleanup",
			withRequestID(r,
				zap.String("user_id", currentUserID),
				zap.String("date", booking.Date),
				zap.String("time", booking.Time),
				zap.Error(err),
			)...,
		)
		response.AppErr(w, apperror.DatabaseError("expire stale pending booking", err))
		return
	}

	// 3. Check slot availability.
	// Same-user idempotency for paid flow: return existing active pending hold instead of creating duplicates.
	if isPaid && currentUserID != "" {
		var (
			existingBookingID string
			existingOrderID   string
			existingAmount    float64
		)
		err := tx.QueryRow(txCtx,
			`SELECT id, razorpay_order_id, amount
			 FROM bookings
			 WHERE date = $1
			   AND time = $2
			   AND user_id = $3
			   AND payment_status = $4
			   AND created_at > NOW() - INTERVAL '`+pendingHoldWindow+`'
			 ORDER BY created_at DESC
			 LIMIT 1`,
			booking.Date, booking.Time, currentUserID, paymentStatusPending,
		).Scan(&existingBookingID, &existingOrderID, &existingAmount)
		if err == nil {
			if err := tx.Commit(txCtx); err != nil {
				appmetrics.RecordBookingOperation("create", "db_error")
				logger.Error("Create booking failed: existing pending commit",
					withRequestID(r,
						zap.String("user_id", currentUserID),
						zap.String("date", booking.Date),
						zap.String("time", booking.Time),
						zap.String("booking_id", existingBookingID),
						zap.String("order_id", existingOrderID),
						zap.Error(err),
					)...,
				)
				response.AppErr(w, apperror.DatabaseError("commit existing booking lookup", err))
				return
			}
			appmetrics.RecordBookingOperation("create", "initiated_pending")
			logger.Info("Create booking reused active pending booking",
				withRequestID(r,
					zap.String("booking_id", existingBookingID),
					zap.String("order_id", existingOrderID),
					zap.String("user_id", currentUserID),
					zap.String("date", booking.Date),
					zap.String("time", booking.Time),
				)...,
			)
			response.JSON(w, http.StatusOK, map[string]interface{}{
				"booking_id": existingBookingID,
				"order_id":   existingOrderID,
				"amount":     existingAmount * 100,
				"currency":   "INR",
				"key_id":     os.Getenv("RAZORPAY_KEY_ID"),
			}, "Payment already initiated")
			return
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			appmetrics.RecordBookingOperation("create", "db_error")
			logger.Error("Create booking failed: check existing pending",
				withRequestID(r,
					zap.String("user_id", currentUserID),
					zap.String("date", booking.Date),
					zap.String("time", booking.Time),
					zap.Error(err),
				)...,
			)
			response.AppErr(w, apperror.DatabaseError("check existing pending booking", err))
			return
		}
	}

	var paidCount, otherPendingCount int
	if err := tx.QueryRow(txCtx,
		`SELECT 
			COUNT(*) FILTER (WHERE payment_status = $4),
			COUNT(*) FILTER (WHERE payment_status = $5
				AND COALESCE(user_id::text, '') != $3
				AND created_at > NOW() - INTERVAL '`+pendingHoldWindow+`')
		 FROM bookings 
		 WHERE date = $1 AND time = $2`,
		booking.Date, booking.Time, currentUserID, paymentStatusPaid, paymentStatusPending,
	).Scan(&paidCount, &otherPendingCount); err != nil {
		appmetrics.RecordBookingOperation("create", "db_error")
		logger.Error("Create booking failed: slot availability query",
			withRequestID(r,
				zap.String("user_id", currentUserID),
				zap.String("date", booking.Date),
				zap.String("time", booking.Time),
				zap.Error(err),
			)...,
		)
		response.AppErr(w, apperror.DatabaseError("check slot availability", err))
		return
	}

	if paidCount > 0 {
		appmetrics.RecordBookingOperation("create", "slot_unavailable")
		logger.Info("Create booking rejected: slot unavailable",
			withRequestID(r,
				zap.String("user_id", currentUserID),
				zap.String("date", booking.Date),
				zap.String("time", booking.Time),
			)...,
		)
		response.AppErr(w, apperror.SlotUnavailable(booking.Date, booking.Time))
		return
	}
	if otherPendingCount > 0 {
		appmetrics.RecordBookingOperation("create", "slot_held")
		logger.Info("Create booking deferred: slot held by another payment",
			withRequestID(r,
				zap.String("user_id", currentUserID),
				zap.String("date", booking.Date),
				zap.String("time", booking.Time),
			)...,
		)
		response.AppErr(w, apperror.SlotHeldByOther(booking.Date, booking.Time))
		return
	}

	// 4. Insert into Database (within transaction)
	var newID string
	err = tx.QueryRow(txCtx,
		`INSERT INTO bookings
		(date, time, name, email, user_id, meeting_link, payment_status, razorpay_order_id, amount, status_reason, confirmed_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id`,
		booking.Date, booking.Time, booking.Name, booking.Email, booking.UserID,
		booking.MeetingLink, booking.PaymentStatus, booking.RazorpayOrderID, booking.Amount, statusReason, confirmedAt,
	).Scan(&newID)

	if err != nil {
		appmetrics.RecordBookingOperation("create", "slot_unavailable")
		logger.Warn("Create booking insert conflict",
			withRequestID(r,
				zap.String("user_id", currentUserID),
				zap.String("date", booking.Date),
				zap.String("time", booking.Time),
				zap.Error(err),
			)...,
		)
		response.AppErr(w, apperror.SlotUnavailable(booking.Date, booking.Time))
		return
	}

	// 5. Commit the transaction
	if err := tx.Commit(txCtx); err != nil {
		appmetrics.RecordBookingOperation("create", "db_error")
		logger.Error("Create booking failed: transaction commit",
			withRequestID(r,
				zap.String("booking_id", newID),
				zap.String("user_id", currentUserID),
				zap.String("date", booking.Date),
				zap.String("time", booking.Time),
				zap.String("order_id", booking.RazorpayOrderID),
				zap.Error(err),
			)...,
		)
		response.AppErr(w, apperror.DatabaseError("commit booking", err))
		return
	}

	// Invalidate slots cache for this date (write-through pattern)
	InvalidateSlotsCache(r.Context(), booking.Date)
	logger.Info("Booking created",
		withRequestID(r,
			zap.String("booking_id", newID),
			zap.String("order_id", booking.RazorpayOrderID),
			zap.String("user_id", currentUserID),
			zap.String("date", booking.Date),
			zap.String("time", booking.Time),
			zap.String("payment_status", booking.PaymentStatus),
		)...,
	)

	// 6. Response Handling
	if isPaid {
		appmetrics.RecordBookingOperation("create", "initiated_pending")
		// Broadcast slot status change for active hold
		hub.Broadcast("SLOT_PENDING", map[string]string{
			"date": booking.Date,
			"time": booking.Time,
		})

		response.JSON(w, http.StatusOK, map[string]interface{}{
			"booking_id": newID,
			"order_id":   booking.RazorpayOrderID,
			"amount":     booking.Amount * 100,
			"currency":   "INR",
			"key_id":     os.Getenv("RAZORPAY_KEY_ID"),
		}, "Payment initiated")
	} else {
		appmetrics.RecordBookingOperation("create", "created_free")
		finalizeBooking(r.Context(), hub, audit, newID, booking, "booking.confirmed", r.RemoteAddr, r.UserAgent())
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
// @Router /bookings/verify [post]
func VerifyPayment(w http.ResponseWriter, r *http.Request, hub *ws.Hub, audit *services.AuditService) {
	var req struct {
		BookingID         string `json:"booking_id"`
		RazorpayPaymentID string `json:"razorpay_payment_id"`
		RazorpayOrderID   string `json:"razorpay_order_id"`
		RazorpaySignature string `json:"razorpay_signature"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		appmetrics.RecordPaymentOperation("declined")
		logger.Warn("Payment verification payload invalid",
			withRequestID(r, zap.Error(err))...,
		)
		response.AppErr(w, apperror.InvalidPayload(err))
		return
	}

	if req.BookingID == "" || req.RazorpayPaymentID == "" || req.RazorpayOrderID == "" || req.RazorpaySignature == "" {
		appmetrics.RecordPaymentOperation("declined")
		logger.Warn("Payment verification rejected: missing required fields",
			withRequestID(r,
				zap.String("booking_id", req.BookingID),
				zap.String("order_id", req.RazorpayOrderID),
				zap.String("payment_id", req.RazorpayPaymentID),
			)...,
		)
		response.AppErr(w, apperror.ValidationError("payment", "All payment fields are required"))
		return
	}

	// 1. Verify Signature
	keySecret := os.Getenv("RAZORPAY_KEY_SECRET")
	if keySecret == "" {
		appmetrics.RecordPaymentOperation("declined")
		logger.Error("Payment verification failed: Razorpay secret missing",
			withRequestID(r,
				zap.String("booking_id", req.BookingID),
				zap.String("order_id", req.RazorpayOrderID),
				zap.String("payment_id", req.RazorpayPaymentID),
			)...,
		)
		response.AppErr(w, apperror.ExternalServiceError("razorpay", fmt.Errorf("payment service misconfigured")))
		return
	}

	data := req.RazorpayOrderID + "|" + req.RazorpayPaymentID

	h := hmac.New(sha256.New, []byte(keySecret))
	h.Write([]byte(data))
	expectedSignature := hex.EncodeToString(h.Sum(nil))

	if !strings.EqualFold(expectedSignature, req.RazorpaySignature) {
		appmetrics.RecordPaymentOperation("signature_invalid")
		logger.Warn("Payment signature mismatch",
			withRequestID(r,
				zap.String("booking_id", req.BookingID),
				zap.String("order_id", req.RazorpayOrderID),
				zap.String("payment_id", req.RazorpayPaymentID),
			)...,
		)
		response.AppErr(w, apperror.PaymentSignatureInvalid())
		return
	}

	txCtx, txCancel := context.WithTimeout(r.Context(), dbTransactionTimeout)
	defer txCancel()

	b, changed, appErr := confirmBookingPaymentByID(txCtx, req.BookingID, req.RazorpayOrderID, req.RazorpayPaymentID)
	if appErr != nil {
		paymentResult := "declined"
		if appErr.Code == "DB_ERROR" {
			paymentResult = "db_error"
		}
		appmetrics.RecordPaymentOperation(paymentResult)
		logFields := withRequestID(r,
			zap.String("booking_id", req.BookingID),
			zap.String("order_id", req.RazorpayOrderID),
			zap.String("payment_id", req.RazorpayPaymentID),
			zap.String("error_code", appErr.Code),
		)
		if paymentResult == "db_error" {
			logger.Error("Payment verification failed",
				append(logFields, zap.Error(appErr))...,
			)
		} else {
			logger.Warn("Payment verification declined", logFields...)
		}
		response.AppErr(w, appErr)
		return
	}

	if !changed {
		appmetrics.RecordPaymentOperation("already_verified")
		logger.Info("Payment already verified (idempotent)",
			withRequestID(r,
				zap.String("booking_id", req.BookingID),
				zap.String("order_id", req.RazorpayOrderID),
				zap.String("payment_id", req.RazorpayPaymentID),
				zap.String("user_id", userIDString(b.UserID)),
				zap.String("date", b.Date),
				zap.String("time", b.Time),
			)...,
		)
		response.JSON(w, http.StatusOK, nil, "Payment already verified")
		return
	}

	// Invalidate slots cache (payment confirmed = slot truly taken)
	appmetrics.RecordPaymentOperation("confirmed")
	InvalidateSlotsCache(r.Context(), b.Date)
	logger.Info("Payment verified",
		withRequestID(r,
			zap.String("booking_id", b.ID),
			zap.String("order_id", req.RazorpayOrderID),
			zap.String("payment_id", req.RazorpayPaymentID),
			zap.String("user_id", userIDString(b.UserID)),
			zap.String("date", b.Date),
			zap.String("time", b.Time),
		)...,
	)

	// 4. Finalize (Email + WebSocket)
	finalizeBooking(r.Context(), hub, audit, b.ID, b, "booking.confirmed", r.RemoteAddr, r.UserAgent())

	response.JSON(w, http.StatusOK, nil, "Payment verified and booking confirmed")
}

// finalizeBooking handles post-confirmation logic (Emails, WebSocket, Audit)
func finalizeBooking(ctx context.Context, hub *ws.Hub, audit *services.AuditService, bookingID string, b models.Booking, action, ipAddress, userAgent string) {
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
	audit.Log(ctx, action, userID, bookingID, "booking", ipAddress, userAgent, nil)

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

	switch releasePendingActionForStatus(payStatus) {
	case releasePendingActionRejectPaid:
		response.AppErr(w, apperror.ValidationError("booking", "Booking is already confirmed and cannot be auto-released"))
		return
	case releasePendingActionNoopAlreadyReleased:
		response.JSON(w, http.StatusOK, nil, "Pending booking already released")
		return
	}

	result, err := database.Pool.Exec(ctx,
		`UPDATE bookings
		 SET payment_status = $3,
		     status_reason = 'released_by_user',
		     failed_at = COALESCE(failed_at, NOW()),
		     released_at = COALESCE(released_at, NOW()),
		     released_by = $2
		 WHERE id = $1
		   AND user_id = $2
		   AND payment_status = $4`,
		bookingID, userID, paymentStatusFailed, paymentStatusPending,
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

	// Fetch booking details before status transition (for WebSocket broadcast & email)
	var date, timeSlot, name, email, paymentStatus string
	err := database.Pool.QueryRow(ctx,
		"SELECT date, time, name, email, payment_status FROM bookings WHERE id = $1 AND user_id = $2",
		bookingID, userID,
	).Scan(&date, &timeSlot, &name, &email, &paymentStatus)

	if err != nil {
		response.AppErr(w, apperror.BookingNotFound(bookingID).WithContext("reason", "not found or not authorized"))
		return
	}
	if paymentStatus != paymentStatusPaid {
		response.AppErr(w, apperror.ValidationError("booking", "Only confirmed bookings can be cancelled here"))
		return
	}

	result, err := database.Pool.Exec(ctx,
		`UPDATE bookings
		 SET payment_status = $3,
		     status_reason = 'cancelled_by_user',
		     cancelled_at = COALESCE(cancelled_at, NOW()),
		     released_at = COALESCE(released_at, NOW()),
		     released_by = $2
		 WHERE id = $1
		   AND user_id = $2
		   AND payment_status = $4`,
		bookingID, userID, paymentStatusCancelled, paymentStatusPaid,
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
		appmetrics.RecordBookingOperation("webhook", "processing_error")
		logger.Log.Error("Webhook: failed to read body",
			withRequestID(r, zap.Error(err))...,
		)
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Verify webhook signature
	webhookSecret := os.Getenv("RAZORPAY_WEBHOOK_SECRET")
	if webhookSecret == "" {
		// Backward-compatible fallback for existing environments.
		webhookSecret = os.Getenv("RAZORPAY_KEY_SECRET")
		logger.Log.Warn("Webhook secret not configured separately; falling back to RAZORPAY_KEY_SECRET",
			withRequestID(r)...,
		)
	}
	if webhookSecret == "" {
		appmetrics.RecordBookingOperation("webhook", "processing_error")
		logger.Log.Error("Webhook: webhook secret not configured",
			withRequestID(r)...,
		)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	signature := r.Header.Get("X-Razorpay-Signature")
	if signature == "" {
		appmetrics.RecordBookingOperation("webhook", "invalid_signature")
		logger.Log.Warn("Webhook: missing signature header",
			withRequestID(r)...,
		)
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	h := hmac.New(sha256.New, []byte(webhookSecret))
	h.Write(body)
	expectedSig := hex.EncodeToString(h.Sum(nil))

	if !hmac.Equal([]byte(expectedSig), []byte(signature)) {
		appmetrics.RecordBookingOperation("webhook", "invalid_signature")
		logger.Log.Warn("Webhook: invalid signature",
			withRequestID(r)...,
		)
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
		appmetrics.RecordBookingOperation("webhook", "processing_error")
		logger.Log.Error("Webhook: failed to parse event",
			withRequestID(r, zap.Error(err))...,
		)
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	paymentID := event.Payload.Payment.Entity.ID
	orderID := event.Payload.Payment.Entity.OrderID
	eventID := buildWebhookEventID(event.Event, paymentID, orderID)

	appmetrics.RecordBookingOperation("webhook", "received_event")
	logger.Log.Info("Webhook received",
		withRequestID(r,
			zap.String("event", event.Event),
			zap.String("payment_id", paymentID),
			zap.String("order_id", orderID),
		)...,
	)

	// Idempotency lock (with timeout)
	ctx, cancel := context.WithTimeout(r.Context(), dbTransactionTimeout)
	defer cancel()

	lockResult, err := database.Pool.Exec(ctx,
		`INSERT INTO processed_webhooks (event_id, event_type, order_id, payment_id)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (event_id) DO NOTHING`,
		eventID, event.Event, orderID, paymentID,
	)
	if err != nil {
		appmetrics.RecordBookingOperation("webhook", "processing_error")
		logger.Log.Error("Webhook: failed to acquire idempotency lock",
			withRequestID(r,
				zap.String("event_id", eventID),
				zap.String("payment_id", paymentID),
				zap.String("order_id", orderID),
				zap.Error(err),
			)...,
		)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if lockResult.RowsAffected() == 0 {
		appmetrics.RecordBookingOperation("webhook", "duplicate_event")
		logger.Log.Info("Webhook already processed",
			withRequestID(r,
				zap.String("event_id", eventID),
				zap.String("payment_id", paymentID),
				zap.String("order_id", orderID),
			)...,
		)
		w.WriteHeader(http.StatusOK)
		return
	}

	var processErr error
	switch event.Event {
	case "payment.captured":
		processErr = webhookConfirmPayment(ctx, orderID, paymentID, hub, audit)

	case "payment.failed":
		processErr = webhookReleaseSlot(ctx, orderID, paymentID, hub)

	default:
		logger.Log.Info("Webhook: unhandled event",
			withRequestID(r,
				zap.String("event", event.Event),
				zap.String("payment_id", paymentID),
				zap.String("order_id", orderID),
			)...,
		)
	}

	if processErr != nil {
		appmetrics.RecordBookingOperation("webhook", "processing_error")
		logger.Log.Error("Webhook processing failed",
			withRequestID(r,
				zap.String("event_id", eventID),
				zap.String("event", event.Event),
				zap.String("payment_id", paymentID),
				zap.String("order_id", orderID),
				zap.Error(processErr),
			)...,
		)
		_, _ = database.Pool.Exec(ctx, "DELETE FROM processed_webhooks WHERE event_id = $1", eventID)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	switch event.Event {
	case "payment.captured":
		appmetrics.RecordBookingOperation("webhook", "processed_captured")
	case "payment.failed":
		appmetrics.RecordBookingOperation("webhook", "processed_failed")
	}

	w.WriteHeader(http.StatusOK)
}

// webhookConfirmPayment marks a booking as paid when Razorpay confirms capture.
func webhookConfirmPayment(ctx context.Context, orderID, paymentID string, hub *ws.Hub, audit *services.AuditService) error {
	if orderID == "" {
		return fmt.Errorf("missing order ID for payment.captured webhook")
	}

	b, changed, err := confirmBookingPaymentByOrderID(ctx, orderID, paymentID)
	if err != nil {
		return err
	}
	if b.ID == "" {
		logger.Log.Warn("Webhook: booking not found for order",
			zap.String("order_id", orderID),
			zap.String("payment_id", paymentID),
		)
		return nil
	}
	if !changed {
		logger.Log.Info("Webhook: booking already settled",
			zap.String("booking_id", b.ID),
			zap.String("order_id", orderID),
			zap.String("payment_id", paymentID),
			zap.String("user_id", userIDString(b.UserID)),
			zap.String("date", b.Date),
			zap.String("time", b.Time),
		)
		return nil
	}

	InvalidateSlotsCache(ctx, b.Date)
	logger.Log.Info("Webhook: booking confirmed",
		zap.String("booking_id", b.ID),
		zap.String("order_id", orderID),
		zap.String("payment_id", paymentID),
		zap.String("user_id", userIDString(b.UserID)),
		zap.String("date", b.Date),
		zap.String("time", b.Time),
	)
	finalizeBooking(ctx, hub, audit, b.ID, b, "booking.webhook_confirmed", "", "")
	return nil
}

// webhookReleaseSlot marks pending booking as failed to free slot when payment fails.
func webhookReleaseSlot(ctx context.Context, orderID, paymentID string, hub *ws.Hub) error {
	if orderID == "" {
		return fmt.Errorf("missing order ID for payment.failed webhook")
	}

	// Fetch slot info first for cache invalidation + websocket broadcast.
	var (
		date     string
		timeSlot string
	)
	err := database.Pool.QueryRow(ctx,
		"SELECT date, time FROM bookings WHERE razorpay_order_id = $1 AND payment_status = $2 ORDER BY created_at DESC LIMIT 1",
		orderID, paymentStatusPending,
	).Scan(&date, &timeSlot)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			logger.Log.Warn("Webhook: no pending booking found for failed payment",
				zap.String("order_id", orderID),
				zap.String("payment_id", paymentID),
			)
			return nil
		}
		return err
	}

	result, err := database.Pool.Exec(ctx,
		`UPDATE bookings
		 SET payment_status = $2,
		     status_reason = 'payment_failed_webhook',
		     failed_at = COALESCE(failed_at, NOW()),
		     released_at = COALESCE(released_at, NOW())
		 WHERE razorpay_order_id = $1
		   AND payment_status = $3`,
		orderID, paymentStatusFailed, paymentStatusPending,
	)
	if err != nil {
		return err
	}
	if result.RowsAffected() > 0 {
		InvalidateSlotsCache(ctx, date)
		hub.Broadcast("SLOT_CANCELLED", map[string]string{
			"date": date,
			"time": timeSlot,
		})
		logger.Log.Info("Webhook: slot released after payment failure",
			zap.String("order_id", orderID),
			zap.String("payment_id", paymentID),
			zap.String("date", date),
			zap.String("time", timeSlot),
		)
	}
	return nil
}
