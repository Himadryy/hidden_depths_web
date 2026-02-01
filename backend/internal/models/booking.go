package models

import "time"

type Booking struct {
	ID        string    `json:"id"`
	Date      string    `json:"date"` // Format: "YYYY-MM-DD"
	Time      string    `json:"time"` // Format: "12:00 PM"
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	// Notes
	UserNotes   string    `json:"user_notes,omitempty"`
	MentorNotes string    `json:"mentor_notes,omitempty"`
	
	// Meeting
	MeetingLink string    `json:"meeting_link,omitempty"`

	UserID    *string   `json:"user_id,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}
