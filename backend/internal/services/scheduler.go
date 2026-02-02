package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/Himadryy/hidden-depths-backend/internal/database"
)

// CheckAndSendReminders runs every hour to find bookings happening tomorrow
func CheckAndSendReminders() {
	log.Println("Running reminder check...")

	// Calculate "Tomorrow" date string (YYYY-MM-DD)
	// Example: If today is 2026-02-01, we want to remind bookings for 2026-02-02
	tomorrow := time.Now().Add(24 * time.Hour).Format("2006-01-02")

	rows, err := database.Pool.Query(context.Background(),
		"SELECT id, name, email, time, meeting_link FROM bookings WHERE date = $1 AND reminder_sent = FALSE",
		tomorrow,
	)
	if err != nil {
		log.Printf("Error querying reminders: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var id, name, email, timeSlot, meetingLink string
		if err := rows.Scan(&id, &name, &email, &timeSlot, &meetingLink); err != nil {
			log.Printf("Error scanning booking: %v", err)
			continue
		}

		// Prepare Email Content
		subject := "Reminder: Your Sanctuary Session Tomorrow"
		body := fmt.Sprintf(`
			<h2>Hello %s,</h2>
			<p>This is a gentle reminder that your session at <strong>Hidden Depths</strong> is scheduled for tomorrow at <strong>%s</strong>.</p>
			<p>Please ensure you are in a quiet space 5 minutes before we begin.</p>
			<p>Here is your secure link to join:</p>
			<p><a href="%s" style="padding: 10px 20px; background-color: #E0B873; color: black; text-decoration: none; border-radius: 5px;">Join Video Session</a></p>
			<br>
			<p>Or view your booking details here: <a href="https://hidden-depths-web.pages.dev/profile">My Sanctuary Profile</a></p>
		`, name, timeSlot, meetingLink)

		// Send Email
		if err := SendEmail(email, subject, body); err != nil {
			log.Printf("Failed to send email to %s: %v", email, err)
			continue
		}

		// Mark as Sent
		_, err := database.Pool.Exec(context.Background(),
			"UPDATE bookings SET reminder_sent = TRUE WHERE id = $1",
			id,
		)
		if err != nil {
			log.Printf("Failed to update booking %s: %v", id, err)
		} else {
			log.Printf("Reminder sent to %s", email)
		}
	}
}
