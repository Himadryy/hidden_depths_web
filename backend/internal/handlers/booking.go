package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/Himadryy/hidden-depths-backend/internal/database"
	"github.com/Himadryy/hidden-depths-backend/internal/models"
	"github.com/go-chi/chi/v5"
)

// GetBookedSlots returns all time slots booked for a specific date
func GetBookedSlots(w http.ResponseWriter, r *http.Request) {
	date := chi.URLParam(r, "date")
	if date == "" {
		http.Error(w, "Date is required", http.StatusBadRequest)
		return
	}

	rows, err := database.Pool.Query(context.Background(), "SELECT time FROM bookings WHERE date = $1", date)
	if err != nil {
		http.Error(w, "Failed to fetch slots", http.StatusInternalServerError)
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

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(slots)
}

// CreateBooking saves a new booking to the database
func CreateBooking(w http.ResponseWriter, r *http.Request) {
	var booking models.Booking
	if err := json.NewDecoder(r.Body).Decode(&booking); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	_, err := database.Pool.Exec(context.Background(),
		"INSERT INTO bookings (date, time, name, email, user_id) VALUES ($1, $2, $3, $4, $5)",
		booking.Date, booking.Time, booking.Name, booking.Email, booking.UserID,
	)

	if err != nil {
		// Handle unique constraint violation (date, time)
		// PostgreSQL error code 23505 is unique_violation
		// With pgx, we can check the error code
		// For simplicity in this step, we'll return a general error or check the message
		http.Error(w, "Failed to create booking or slot already taken", http.StatusConflict)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "Booking successful"})
}

// GetUserBookings returns all bookings for the authenticated user
func GetUserBookings(w http.ResponseWriter, r *http.Request) {
	// Get user_id from context (set by AuthMiddleware)
	userID := r.Context().Value("user_id") // We'll need to import the key or use a string
	// To avoid circular imports, usually middleware defines the key type
	// For now, let's assume it's passed as a string or handled via a helper
	
	rows, err := database.Pool.Query(context.Background(), 
		"SELECT id, date, time, name, email, created_at FROM bookings WHERE user_id = $1 ORDER BY date DESC", 
		userID,
	)
	if err != nil {
		http.Error(w, "Failed to fetch your bookings", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var bookings []models.Booking
	for rows.Next() {
		var b models.Booking
		if err := rows.Scan(&b.ID, &b.Date, &b.Time, &b.Name, &b.Email, &b.CreatedAt); err != nil {
			continue
		}
		bookings = append(bookings, b)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(bookings)
}

// CancelBooking allows a user to cancel their own booking
func CancelBooking(w http.ResponseWriter, r *http.Request) {
	bookingID := chi.URLParam(r, "id")
	userID := r.Context().Value("user_id").(string)

	if bookingID == "" {
		http.Error(w, "Booking ID is required", http.StatusBadRequest)
		return
	}

	// Only delete if the booking belongs to the authenticated user
	result, err := database.Pool.Exec(context.Background(),
		"DELETE FROM bookings WHERE id = $1 AND user_id = $2",
		bookingID, userID,
	)

	if err != nil {
		http.Error(w, "Failed to cancel booking", http.StatusInternalServerError)
		return
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Booking not found or not authorized to cancel", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

