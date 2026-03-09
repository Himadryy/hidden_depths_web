package services

import (
	"context"
	"crypto/tls"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/Himadryy/hidden-depths-backend/pkg/apperror"
	"github.com/Himadryy/hidden-depths-backend/pkg/circuitbreaker"
	"github.com/Himadryy/hidden-depths-backend/pkg/logger"
	"github.com/Himadryy/hidden-depths-backend/pkg/retry"
	"go.uber.org/zap"
	"gopkg.in/gomail.v2"
)

// EmailBreaker protects the SMTP service from cascading failures.
var EmailBreaker = circuitbreaker.New("email-smtp", circuitbreaker.Config{
	FailureThreshold: 3,
	SuccessThreshold: 1,
	OpenTimeout:      60 * time.Second,
})

func SendEmail(to, subject, body string) error {
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPortStr := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")

	if smtpHost == "" || smtpPortStr == "" || smtpUser == "" || smtpPass == "" {
		return apperror.ExternalServiceError("email", fmt.Errorf("SMTP configuration missing"))
	}

	smtpPort, err := strconv.Atoi(smtpPortStr)
	if err != nil {
		return apperror.ValidationError("SMTP_PORT", fmt.Sprintf("invalid port '%s'", smtpPortStr))
	}

	// Retry with circuit breaker: 3 attempts, exponential backoff
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	return retry.Do(ctx, retry.Config{
		MaxAttempts: 3,
		BaseDelay:   500 * time.Millisecond,
		MaxDelay:    3 * time.Second,
		Jitter:      true,
	}, "send-email", func() error {
		return EmailBreaker.Execute(func() error {
			m := gomail.NewMessage()
			m.SetHeader("From", smtpUser)
			m.SetHeader("To", to)
			m.SetHeader("Subject", subject)
			m.SetBody("text/html", body)

			d := gomail.NewDialer(smtpHost, smtpPort, smtpUser, smtpPass)
			d.TLSConfig = &tls.Config{InsecureSkipVerify: false}

			if err := d.DialAndSend(m); err != nil {
				logger.Log.Warn("Email send attempt failed",
					zap.String("to", to),
					zap.Error(err),
				)
				// Wrap as retryable external service error
				return apperror.ExternalServiceError("email", err)
			}
			return nil
		})
	})
}
