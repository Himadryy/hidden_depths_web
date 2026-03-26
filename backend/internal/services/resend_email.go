package services

import (
	"bytes"
	"context"
	"fmt"
	"html/template"
	"os"
	"sync"
	"time"

	"github.com/Himadryy/hidden-depths-backend/internal/templates"
	"github.com/Himadryy/hidden-depths-backend/pkg/apperror"
	"github.com/Himadryy/hidden-depths-backend/pkg/circuitbreaker"
	"github.com/Himadryy/hidden-depths-backend/pkg/logger"
	"github.com/Himadryy/hidden-depths-backend/pkg/retry"
	"github.com/resend/resend-go/v2"
	"go.uber.org/zap"
)

// ResendBreaker protects the Resend API from cascading failures.
var ResendBreaker = circuitbreaker.New("resend-api", circuitbreaker.Config{
	FailureThreshold: 3,
	SuccessThreshold: 1,
	OpenTimeout:      60 * time.Second,
})

// EmailService handles email delivery via Resend.
type EmailService struct {
	client    *resend.Client
	fromEmail string
	templates *template.Template
	mu        sync.RWMutex
}

// EmailTemplateData holds common data for email templates.
type EmailTemplateData struct {
	Name        string
	Date        string
	Time        string
	MeetingLink string
	LogoURL     string
	ProfileURL  string
	SupportURL  string
	Year        int
}

var (
	emailServiceInstance *EmailService
	emailServiceOnce     sync.Once
)

// GetEmailService returns the singleton EmailService instance.
// Creates one if it doesn't exist.
func GetEmailService() *EmailService {
	emailServiceOnce.Do(func() {
		apiKey := os.Getenv("RESEND_API_KEY")
		if apiKey == "" {
			logger.Warn("RESEND_API_KEY not set, email service will be disabled")
			return
		}
		svc, err := NewEmailService(apiKey)
		if err != nil {
			logger.Error("Failed to initialize email service", zap.Error(err))
			return
		}
		emailServiceInstance = svc
	})
	return emailServiceInstance
}

// NewEmailService creates a new EmailService with the provided Resend API key.
func NewEmailService(apiKey string) (*EmailService, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("resend API key is required")
	}

	client := resend.NewClient(apiKey)

	// Parse embedded email templates from the templates package
	tmpl, err := template.ParseFS(templates.EmailTemplates, "emails/*.html")
	if err != nil {
		return nil, fmt.Errorf("failed to parse email templates: %w", err)
	}

	fromEmail := os.Getenv("RESEND_FROM_EMAIL")
	if fromEmail == "" {
		// Use Resend's default domain until custom domain is verified
		fromEmail = "Hidden Depths <onboarding@resend.dev>"
	}

	return &EmailService{
		client:    client,
		fromEmail: fromEmail,
		templates: tmpl,
	}, nil
}

// SendBookingConfirmation sends a booking confirmation email.
func (s *EmailService) SendBookingConfirmation(to, name, date, timeSlot, meetingLink string) error {
	if s == nil || s.client == nil {
		logger.Warn("Email service not initialized, skipping confirmation email")
		return nil
	}

	data := EmailTemplateData{
		Name:        name,
		Date:        date,
		Time:        timeSlot,
		MeetingLink: meetingLink,
		LogoURL:     "https://hidden-depths-web.pages.dev/logo.png",
		ProfileURL:  "https://hidden-depths-web.pages.dev/profile",
		SupportURL:  "https://hidden-depths-web.pages.dev/contact",
		Year:        time.Now().Year(),
	}

	body, err := s.renderTemplate("booking_confirmation.html", data)
	if err != nil {
		return apperror.InternalError(fmt.Errorf("failed to render confirmation template: %w", err))
	}

	return s.sendEmail(to, "✨ Booking Confirmed - Your Journey Begins", body)
}

// SendBookingReminder sends a booking reminder email.
func (s *EmailService) SendBookingReminder(to, name, date, timeSlot, meetingLink string) error {
	if s == nil || s.client == nil {
		logger.Warn("Email service not initialized, skipping reminder email")
		return nil
	}

	data := EmailTemplateData{
		Name:        name,
		Date:        date,
		Time:        timeSlot,
		MeetingLink: meetingLink,
		LogoURL:     "https://hidden-depths-web.pages.dev/logo.png",
		ProfileURL:  "https://hidden-depths-web.pages.dev/profile",
		SupportURL:  "https://hidden-depths-web.pages.dev/contact",
		Year:        time.Now().Year(),
	}

	body, err := s.renderTemplate("booking_reminder.html", data)
	if err != nil {
		return apperror.InternalError(fmt.Errorf("failed to render reminder template: %w", err))
	}

	return s.sendEmail(to, "⏰ Reminder: Your Session is Tomorrow", body)
}

// SendBookingCancellation sends a booking cancellation email.
func (s *EmailService) SendBookingCancellation(to, name, date, timeSlot string) error {
	if s == nil || s.client == nil {
		logger.Warn("Email service not initialized, skipping cancellation email")
		return nil
	}

	data := EmailTemplateData{
		Name:       name,
		Date:       date,
		Time:       timeSlot,
		LogoURL:    "https://hidden-depths-web.pages.dev/logo.png",
		ProfileURL: "https://hidden-depths-web.pages.dev/profile",
		SupportURL: "https://hidden-depths-web.pages.dev/contact",
		Year:       time.Now().Year(),
	}

	body, err := s.renderTemplate("booking_cancellation.html", data)
	if err != nil {
		return apperror.InternalError(fmt.Errorf("failed to render cancellation template: %w", err))
	}

	return s.sendEmail(to, "Booking Cancelled - Hidden Depths", body)
}

// SendTestEmail sends a test email to verify the integration works.
func (s *EmailService) SendTestEmail(to string) error {
	if s == nil || s.client == nil {
		return apperror.ExternalServiceError("email", fmt.Errorf("email service not initialized"))
	}

	body := `
	<!DOCTYPE html>
	<html>
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
	</head>
	<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
		<div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
			<div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #14B8A6;">
				<h1 style="color: #14B8A6; margin: 0 0 20px 0; font-size: 28px;">✅ Email Test Successful</h1>
				<p style="color: #e0e0e0; font-size: 16px; line-height: 1.6;">
					Your Resend email integration is working correctly.
				</p>
				<p style="color: #a0a0a0; font-size: 14px; margin-top: 20px;">
					Sent at: ` + time.Now().Format("2006-01-02 15:04:05 MST") + `
				</p>
			</div>
		</div>
	</body>
	</html>
	`

	return s.sendEmail(to, "🧪 Test Email - Hidden Depths", body)
}

// renderTemplate renders an email template with the provided data.
func (s *EmailService) renderTemplate(templateName string, data EmailTemplateData) (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var buf bytes.Buffer
	if err := s.templates.ExecuteTemplate(&buf, templateName, data); err != nil {
		return "", fmt.Errorf("failed to execute template %s: %w", templateName, err)
	}
	return buf.String(), nil
}

// sendEmail sends an email via Resend with retry and circuit breaker.
func (s *EmailService) sendEmail(to, subject, htmlBody string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	return retry.Do(ctx, retry.Config{
		MaxAttempts: 3,
		BaseDelay:   500 * time.Millisecond,
		MaxDelay:    3 * time.Second,
		Jitter:      true,
	}, "send-resend-email", func() error {
		return ResendBreaker.Execute(func() error {
			params := &resend.SendEmailRequest{
				From:    s.fromEmail,
				To:      []string{to},
				Subject: subject,
				Html:    htmlBody,
			}

			sent, err := s.client.Emails.Send(params)
			if err != nil {
				logger.Warn("Resend email attempt failed",
					zap.String("to", to),
					zap.String("subject", subject),
					zap.Error(err),
				)
				return apperror.ExternalServiceError("resend", err)
			}

			logger.Info("Email sent successfully",
				zap.String("to", to),
				zap.String("email_id", sent.Id),
			)
			return nil
		})
	})
}

// IsEnabled returns true if the email service is properly configured.
func (s *EmailService) IsEnabled() bool {
	return s != nil && s.client != nil
}
