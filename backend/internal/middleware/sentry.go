package middleware

import (
	"net/http"
	"os"
	"runtime/debug"
	"time"

	"github.com/getsentry/sentry-go"
	"go.uber.org/zap"
)

// InitSentry initializes the Sentry SDK for error tracking
// Returns error if DSN is provided but initialization fails
func InitSentry(logger *zap.Logger) error {
	dsn := os.Getenv("SENTRY_DSN")
	if dsn == "" {
		logger.Info("Sentry DSN not configured, error tracking disabled")
		return nil
	}

	environment := os.Getenv("ENVIRONMENT")
	if environment == "" {
		environment = "development"
	}

	err := sentry.Init(sentry.ClientOptions{
		Dsn:              dsn,
		Environment:      environment,
		Release:          getVersion(),
		EnableTracing:    true,
		TracesSampleRate: 0.1, // Sample 10% of transactions
		BeforeSend: func(event *sentry.Event, hint *sentry.EventHint) *sentry.Event {
			// Filter out expected errors to reduce noise
			if event.Level == sentry.LevelWarning {
				// Don't send warnings for common client errors
				for _, exception := range event.Exception {
					if exception.Type == "RateLimitError" || exception.Type == "ValidationError" {
						return nil
					}
				}
			}
			return event
		},
	})

	if err != nil {
		logger.Error("Failed to initialize Sentry", zap.Error(err))
		return err
	}

	logger.Info("Sentry initialized", zap.String("environment", environment))
	return nil
}

// getVersion returns the application version from build info
func getVersion() string {
	info, ok := debug.ReadBuildInfo()
	if !ok {
		return "unknown"
	}
	return info.Main.Version
}

// SentryRecovery returns middleware that captures panics and sends them to Sentry
func SentryRecovery(logger *zap.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if err := recover(); err != nil {
					// Create Sentry hub for this request
					hub := sentry.CurrentHub().Clone()
					hub.Scope().SetRequest(r)
					hub.Scope().SetTag("panic", "true")

					// Capture the panic
					hub.RecoverWithContext(r.Context(), err)

					// Log the panic
					logger.Error("Panic recovered",
						zap.Any("error", err),
						zap.String("path", r.URL.Path),
						zap.String("method", r.Method),
						zap.Stack("stack"),
					)

					// Return 500 error
					w.WriteHeader(http.StatusInternalServerError)
					w.Write([]byte(`{"success":false,"error":"Internal server error","error_code":"INTERNAL_ERROR"}`))
				}
			}()

			next.ServeHTTP(w, r)
		})
	}
}

// CaptureError sends an error to Sentry with request context
func CaptureError(r *http.Request, err error, tags map[string]string) {
	if sentry.CurrentHub().Client() == nil {
		return // Sentry not initialized
	}

	hub := sentry.CurrentHub().Clone()
	hub.Scope().SetRequest(r)

	for key, value := range tags {
		hub.Scope().SetTag(key, value)
	}

	hub.CaptureException(err)
}

// CaptureMessage sends a message to Sentry
func CaptureMessage(message string, level sentry.Level, tags map[string]string) {
	if sentry.CurrentHub().Client() == nil {
		return // Sentry not initialized
	}

	hub := sentry.CurrentHub().Clone()
	hub.Scope().SetLevel(level)

	for key, value := range tags {
		hub.Scope().SetTag(key, value)
	}

	hub.CaptureMessage(message)
}

// FlushSentry waits for all Sentry events to be sent before shutdown
func FlushSentry(timeout time.Duration) {
	sentry.Flush(timeout)
}
