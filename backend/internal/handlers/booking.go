package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/Himadryy/hidden-depths-backend/internal/database"
	"github.com/Himadryy/hidden-depths-backend/internal/models"
	"github.com/Himadryy/hidden-depths-backend/internal/ws"
	"github.com/Himadryy/hidden-depths-backend/pkg/response"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// GetBookedSlots returns all time slots booked for a specific date
func GetBookedSlots(w http.ResponseWriter, r *http.Request) {
	date := chi.URLParam(r, "date")
	if date == "" {
		response.Error(w, http.StatusBadRequest, "Date is required")
		return
	}

	rows, err := database.Pool.Query(context.Background(), "SELECT time FROM bookings WHERE date = $1", date)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to fetch slots")
		return
	}
	defer rows.Close()

	var slots []string
	for rows.Next() {
		var time string
		if err := rows.Scan(&time); err != nil {
			continue
		}
		slots = append(slots, time)
	}

	response.JSON(w, http.StatusOK, slots, "Slots fetched successfully")
}

// CreateBooking saves a new booking to the database
func CreateBooking(w http.ResponseWriter, r *http.Request, hub *ws.Hub) {
	var booking models.Booking
	if err := json.NewDecoder(r.Body).Decode(&booking); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Generate Jitsi Meeting Link
	// Format: https://meet.jit.si/HiddenDepths-[RandomID]-[Date]
	meetingID := uuid.New().String()
	booking.MeetingLink = fmt.Sprintf("https://meet.jit.si/HiddenDepths-%s-%s", meetingID[:8], booking.Date)

	_, err := database.Pool.Exec(context.Background(),
		"INSERT INTO bookings (date, time, name, email, user_id, meeting_link) VALUES ($1, $2, $3, $4, $5, $6)",
		booking.Date, booking.Time, booking.Name, booking.Email, booking.UserID, booking.MeetingLink,
	)

	if err != nil {
		response.Error(w, http.StatusConflict, "Failed to create booking or slot already taken")
		return
	}

	// Broadcast the update
	hub.Broadcast("SLOT_BOOKED", map[string]string{
		"date": booking.Date,
		"time": booking.Time,
	})

	response.JSON(w, http.StatusCreated, nil, "Booking successful")
}

// GetUserBookings returns all bookings for the authenticated user
func GetUserBookings(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id") 
	
	rows, err := database.Pool.Query(context.Background(), 
		"SELECT id, date, time, name, email, meeting_link, created_at FROM bookings WHERE user_id = $1 ORDER BY date DESC", 
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
		if err := rows.Scan(&b.ID, &b.Date, &b.Time, &b.Name, &b.Email, &b.MeetingLink, &b.CreatedAt); err != nil {
			continue
		}
		bookings = append(bookings, b)
	}

	response.JSON(w, http.StatusOK, bookings, "User bookings fetched")
}

// CancelBooking allows a user to cancel their own booking
func CancelBooking(w http.ResponseWriter, r *http.Request, hub *ws.Hub) {
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

	response.JSON(w, http.StatusOK, nil, "Booking cancelled successfully")
}

