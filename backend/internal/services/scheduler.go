package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/Himadryy/hidden-depths-backend/internal/database"
	"github.com/Himadryy/hidden-depths-backend/pkg/cache"
	"github.com/Himadryy/hidden-depths-backend/pkg/logger"
	"go.uber.org/zap"
)

// Scheduler job timeouts - prevents hung connections from blocking the pool
const schedulerTimeout = 30 * time.Second

// CheckAndSendReminders runs every hour to find bookings happening tomorrow
func CheckAndSendReminders() {
	logger.Info("Running reminder check...")

	// Use timeout context to prevent hung queries
	ctx, cancel := context.WithTimeout(context.Background(), schedulerTimeout)
	defer cancel()

	// Calculate "Tomorrow" date string (YYYY-MM-DD)
	tomorrow := time.Now().Add(24 * time.Hour).Format("2006-01-02")

	rows, err := database.Pool.Query(ctx,
		"SELECT id, name, email, time, meeting_link FROM bookings WHERE date = $1 AND reminder_sent = FALSE AND payment_status = 'paid'",
		tomorrow,
	)
	if err != nil {
		logger.Error("Error querying reminders", zap.Error(err))
		return
	}
	defer rows.Close()

	// Get email service for Resend
	emailSvc := GetEmailService()

	for rows.Next() {
		var id, name, email, timeSlot, meetingLink string
		if err := rows.Scan(&id, &name, &email, &timeSlot, &meetingLink); err != nil {
			logger.Error("Error scanning booking for reminder", zap.Error(err))
			continue
		}

		// Send reminder email (prefer Resend, fallback to SMTP)
		var sendErr error
		if emailSvc != nil && emailSvc.IsEnabled() {
			sendErr = emailSvc.SendBookingReminder(email, name, tomorrow, timeSlot, meetingLink)
		} else {
			// Fallback to legacy SMTP
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
			sendErr = SendEmail(email, subject, body)
		}

		if sendErr != nil {
			logger.Error("Failed to send reminder email", zap.String("email", email), zap.Error(sendErr))
			continue
		}

		// Mark as Sent (use fresh context for update, not the same one)
		updateCtx, updateCancel := context.WithTimeout(context.Background(), 10*time.Second)
		_, err := database.Pool.Exec(updateCtx,
			"UPDATE bookings SET reminder_sent = TRUE WHERE id = $1",
			id,
		)
		updateCancel()
		if err != nil {
			logger.Error("Failed to mark reminder as sent", zap.String("booking_id", id), zap.Error(err))
		} else {
			logger.Info("Reminder sent", zap.String("email", email))
		}
	}
}

// CleanupAbandonedBookings settles stale pending bookings to failed state and
// invalidates slot cache for affected dates.
func CleanupAbandonedBookings() {
	logger.Info("Running abandoned booking cleanup...")

	// Use timeout context to prevent hung queries
	ctx, cancel := context.WithTimeout(context.Background(), schedulerTimeout)
	defer cancel()

	rows, err := database.Pool.Query(ctx,
		`WITH expired AS (
			UPDATE bookings
			SET payment_status = 'failed',
			    status_reason = 'hold_expired_scheduler',
			    failed_at = COALESCE(failed_at, NOW()),
			    released_at = COALESCE(released_at, NOW())
			WHERE payment_status = 'pending'
			  AND created_at < NOW() - INTERVAL '10 minutes'
			RETURNING date
		)
		SELECT DISTINCT date FROM expired`,
	)
	if err != nil {
		logger.Error("Error during abandoned booking cleanup", zap.Error(err))
		return
	}
	defer rows.Close()

	updatedDates := make([]string, 0, 4)
	for rows.Next() {
		var date string
		if err := rows.Scan(&date); err != nil {
			logger.Error("Failed to scan cleanup date", zap.Error(err))
			continue
		}
		updatedDates = append(updatedDates, date)
	}
	if err := rows.Err(); err != nil {
		logger.Error("Cleanup cursor error", zap.Error(err))
		return
	}

	if len(updatedDates) == 0 {
		return
	}

	for _, date := range updatedDates {
		if err := cache.Delete(ctx, cache.SlotsKey(date)); err != nil && !errors.Is(err, cache.ErrCacheDisabled) {
			logger.Warn("Failed to invalidate slot cache during cleanup",
				zap.String("date", date),
				zap.Error(err),
			)
		}
	}

	logger.Info("Cleaned up stale pending bookings", zap.Int("affected_dates", len(updatedDates)))
}
