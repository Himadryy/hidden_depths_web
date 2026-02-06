package handlers

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/Himadryy/hidden-depths-backend/internal/database"
	"github.com/Himadryy/hidden-depths-backend/internal/models"
	"github.com/Himadryy/hidden-depths-backend/internal/services"
	"github.com/Himadryy/hidden-depths-backend/internal/ws"
	"github.com/Himadryy/hidden-depths-backend/pkg/response"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	razorpay "github.com/razorpay/razorpay-go"
)

// Helper to check if payment is required
func isPaidSession(dateStr string) (bool, error) {
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return false, err
	}
	paymentStart, _ := time.Parse("2006-01-02", "2026-02-03")
	return t.After(paymentStart) || t.Equal(paymentStart), nil
}

// GetBookedSlots returns all time slots booked for a specific date (excluding failed ones)
func GetBookedSlots(w http.ResponseWriter, r *http.Request) {
	date := chi.URLParam(r, "date")
	if date == "" {
		response.Error(w, http.StatusBadRequest, "Date is required")
		return
	}

	// Only fetch slots that are NOT failed (paid or pending)
	rows, err := database.Pool.Query(context.Background(), 
		"SELECT time FROM bookings WHERE date = $1 AND payment_status != 'failed'", date)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to fetch slots")
		return
	}
	defer rows.Close()

	var slots []string
	for rows.Next() {
		var timeSlot string
		if err := rows.Scan(&timeSlot); err != nil {
			continue
		}
		slots = append(slots, timeSlot)
	}

	response.JSON(w, http.StatusOK, slots, "Slots fetched successfully")
}

// CreateBooking initiates a booking. 
// If paid: Creates Razorpay Order & saves as 'pending'.
// If free: Saves as 'paid'.
func CreateBooking(w http.ResponseWriter, r *http.Request, hub *ws.Hub, audit *services.AuditService) {
	var booking models.Booking
	if err := json.NewDecoder(r.Body).Decode(&booking); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// 1. Basic Validation
	if booking.Date == "" || booking.Time == "" || booking.Name == "" || booking.Email == "" {
		response.Error(w, http.StatusBadRequest, "Missing required fields")
		return
	}

	// 2. Generate Meeting Link (Pre-generate, but only email on success)
	meetingID := uuid.New().String()
	booking.MeetingLink = fmt.Sprintf("https://meet.jit.si/HiddenDepths-%s-%s", meetingID[:8], booking.Date)
	
	isPaid, err := isPaidSession(booking.Date)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid date format")
		return
	}
	
	booking.Amount = 0
	booking.PaymentStatus = "paid" // Default for free sessions

	var razorpayOrderID string
	
	// 3. Handle Payment Logic
	if isPaid {
		booking.Amount = 99.00
		booking.PaymentStatus = "pending"

		keyID := os.Getenv("RAZORPAY_KEY_ID")
		keySecret := os.Getenv("RAZORPAY_KEY_SECRET")
		if keyID == "" || keySecret == "" {
			response.Error(w, http.StatusInternalServerError, "Payment configuration missing")
			return
		}

		client := razorpay.NewClient(keyID, keySecret)
		data := map[string]interface{}{
			"amount":   int(booking.Amount * 100), // Amount in paise (must be int)
			"currency": "INR",
			"receipt":  uuid.New().String(),
		}
		
		body, err := client.Order.Create(data, nil)
		if err != nil {
			response.Error(w, http.StatusInternalServerError, "Failed to create payment order")
			return
		}
		
		razorpayOrderID = body["id"].(string)
		booking.RazorpayOrderID = razorpayOrderID
	}

	// 4. Insert into Database
	var newID string
	err = database.Pool.QueryRow(context.Background(),
		`INSERT INTO bookings 
		(date, time, name, email, user_id, meeting_link, payment_status, razorpay_order_id, amount) 
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
		RETURNING id`,
		booking.Date, booking.Time, booking.Name, booking.Email, booking.UserID, 
		booking.MeetingLink, booking.PaymentStatus, booking.RazorpayOrderID, booking.Amount,
	).Scan(&newID)

	if err != nil {
		response.Error(w, http.StatusConflict, "Slot already taken")
		return
	}

	// 5. Response Handling
	if isPaid {
		// Return Order ID for frontend to open Checkout
		response.JSON(w, http.StatusOK, map[string]interface{}{
			"booking_id": newID,
			"order_id":   razorpayOrderID,
			"amount":     booking.Amount * 100,
			"currency":   "INR",
			"key_id":     os.Getenv("RAZORPAY_KEY_ID"),
		}, "Payment initiated")
	} else {
		// Free session: Finalize immediately
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
		response.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}

	// 1. Verify Signature
	keySecret := os.Getenv("RAZORPAY_KEY_SECRET")
	data := req.RazorpayOrderID + "|" + req.RazorpayPaymentID
	
	h := hmac.New(sha256.New, []byte(keySecret))
	h.Write([]byte(data))
	expectedSignature := hex.EncodeToString(h.Sum(nil))

	if expectedSignature != req.RazorpaySignature {
		response.Error(w, http.StatusUnauthorized, "Invalid payment signature")
		
		// Optionally mark as failed in DB
		database.Pool.Exec(context.Background(), 
			"UPDATE bookings SET payment_status = 'failed' WHERE id = $1", req.BookingID)
		return
	}

	// 2. Fetch Booking Details
	var b models.Booking
	err := database.Pool.QueryRow(context.Background(),
		"SELECT id, date, time, name, email, meeting_link, user_id FROM bookings WHERE id = $1",
		req.BookingID,
	).Scan(&b.ID, &b.Date, &b.Time, &b.Name, &b.Email, &b.MeetingLink, &b.UserID)

	if err != nil {
		response.Error(w, http.StatusNotFound, "Booking not found")
		return
	}

	// 3. Update DB
	_, err = database.Pool.Exec(context.Background(),
		"UPDATE bookings SET payment_status = 'paid', razorpay_payment_id = $1 WHERE id = $2",
		req.RazorpayPaymentID, req.BookingID,
	)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to update booking")
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

	// Email
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
		
		_ = services.SendEmail(b.Email, subject, body)
	}()
}

// GetUserBookings returns all bookings for the authenticated user
func GetUserBookings(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id") 
	
	rows, err := database.Pool.Query(context.Background(), 
		`SELECT id, date, time, name, email, meeting_link, payment_status, amount, created_at 
		FROM bookings WHERE user_id = $1 ORDER BY date DESC`, 
		userID,
	)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to fetch your bookings")
		return
	}
	defer rows.Close()

	var bookings []models.Booking
	for rows.Next() {
		var b models.Booking
		if err := rows.Scan(&b.ID, &b.Date, &b.Time, &b.Name, &b.Email, &b.MeetingLink, &b.PaymentStatus, &b.Amount, &b.CreatedAt); err != nil {
			continue
		}
		bookings = append(bookings, b)
	}

	response.JSON(w, http.StatusOK, bookings, "User bookings fetched")
}

// CancelBooking allows a user to cancel their own booking
func CancelBooking(w http.ResponseWriter, r *http.Request, hub *ws.Hub, audit *services.AuditService) {
	bookingID := chi.URLParam(r, "id")
	userID := r.Context().Value("user_id").(string)

	if bookingID == "" {
		response.Error(w, http.StatusBadRequest, "Booking ID is required")
		return
	}

	// We need the date and time before deleting to broadcast
	var date, time string
	err := database.Pool.QueryRow(context.Background(),
		"SELECT date, time FROM bookings WHERE id = $1 AND user_id = $2",
		bookingID, userID,
	).Scan(&date, &time)

	if err != nil {
		response.Error(w, http.StatusNotFound, "Booking not found or not authorized")
		return
	}

	result, err := database.Pool.Exec(context.Background(),
		"DELETE FROM bookings WHERE id = $1 AND user_id = $2",
		bookingID, userID,
	)

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to cancel booking")
		return
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		response.Error(w, http.StatusNotFound, "Booking not found or not authorized to cancel")
		return
	}

	// Broadcast the update
	hub.Broadcast("SLOT_CANCELLED", map[string]string{
		"date": date,
		"time": time,
	})

	// Audit Log
	audit.Log(r.Context(), "booking.cancel", userID, bookingID, "booking", r.RemoteAddr, r.UserAgent(), nil)

	response.JSON(w, http.StatusOK, nil, "Booking cancelled successfully")
}