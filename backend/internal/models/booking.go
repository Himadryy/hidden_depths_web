package models

import "time"

type Booking struct {
	ID        string    `json:"id"`
	Date      string    `json:"date"` // Format: "YYYY-MM-DD"
	Time      string    `json:"time"` // Format: "12:00 PM"
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	UserID    *string   `json:"user_id,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}
