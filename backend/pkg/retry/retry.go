package retry

import (
	"context"
	"math"
	"math/rand"
	"time"

	"go.uber.org/zap"

	"github.com/Himadryy/hidden-depths-backend/pkg/apperror"
	"github.com/Himadryy/hidden-depths-backend/pkg/logger"
)

// Config controls retry behavior.
type Config struct {
	MaxAttempts int
	BaseDelay   time.Duration
	MaxDelay    time.Duration
	Jitter      bool
}

// DefaultConfig returns sensible defaults for most operations.
func DefaultConfig() Config {
	return Config{
		MaxAttempts: 3,
		BaseDelay:   200 * time.Millisecond,
		MaxDelay:    2 * time.Second,
		Jitter:      true,
	}
}

// Do executes the operation with exponential backoff + optional jitter.
// Only retries if the error is retryable (AppError.Retryable == true).
// Respects context cancellation.
func Do(ctx context.Context, cfg Config, operation string, fn func() error) error {
	var lastErr error

	for attempt := 1; attempt <= cfg.MaxAttempts; attempt++ {
		lastErr = fn()
		if lastErr == nil {
			return nil
		}

		// Don't retry non-retryable errors
		if !apperror.IsRetryable(lastErr) {
			logger.Log.Warn("Non-retryable error, aborting retry",
				zap.String("operation", operation),
				zap.Int("attempt", attempt),
				zap.Error(lastErr),
			)
			return lastErr
		}

		// Don't sleep after the last attempt
		if attempt >= cfg.MaxAttempts {
			break
		}

		// Check context before sleeping
		if ctx.Err() != nil {
			return ctx.Err()
		}

		delay := calculateDelay(attempt, cfg)
		logger.Log.Warn("Retrying operation",
			zap.String("operation", operation),
			zap.Int("attempt", attempt),
			zap.Duration("delay", delay),
			zap.Error(lastErr),
		)

		select {
		case <-time.After(delay):
		case <-ctx.Done():
			return ctx.Err()
		}
	}

	logger.Log.Error("All retry attempts exhausted",
		zap.String("operation", operation),
		zap.Int("maxAttempts", cfg.MaxAttempts),
		zap.Error(lastErr),
	)
	return lastErr
}

// DoWithResult is like Do but returns a value on success.
func DoWithResult[T any](ctx context.Context, cfg Config, operation string, fn func() (T, error)) (T, error) {
	var result T
	var lastErr error

	for attempt := 1; attempt <= cfg.MaxAttempts; attempt++ {
		result, lastErr = fn()
		if lastErr == nil {
			return result, nil
		}

		if !apperror.IsRetryable(lastErr) {
			return result, lastErr
		}

		if attempt >= cfg.MaxAttempts {
			break
		}

		if ctx.Err() != nil {
			return result, ctx.Err()
		}

		delay := calculateDelay(attempt, cfg)
		logger.Log.Warn("Retrying operation",
			zap.String("operation", operation),
			zap.Int("attempt", attempt),
			zap.Duration("delay", delay),
			zap.Error(lastErr),
		)

		select {
		case <-time.After(delay):
		case <-ctx.Done():
			return result, ctx.Err()
		}
	}

	return result, lastErr
}

func calculateDelay(attempt int, cfg Config) time.Duration {
	// Exponential: baseDelay * 2^(attempt-1)
	exponential := float64(cfg.BaseDelay) * math.Pow(2, float64(attempt-1))
	capped := math.Min(exponential, float64(cfg.MaxDelay))

	if cfg.Jitter {
		// Add up to 30% jitter to prevent thundering herd
		jitter := rand.Float64() * capped * 0.3
		capped += jitter
	}

	return time.Duration(capped)
}
