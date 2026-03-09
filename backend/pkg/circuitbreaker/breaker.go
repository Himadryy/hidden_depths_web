package circuitbreaker

import (
	"fmt"
	"sync"
	"time"

	"go.uber.org/zap"

	"github.com/Himadryy/hidden-depths-backend/pkg/logger"
)

type State int

const (
	Closed   State = iota // Normal operation
	Open                  // Failing fast, not calling downstream
	HalfOpen              // Probing with limited requests
)

func (s State) String() string {
	switch s {
	case Closed:
		return "CLOSED"
	case Open:
		return "OPEN"
	case HalfOpen:
		return "HALF_OPEN"
	default:
		return "UNKNOWN"
	}
}

// Config controls circuit breaker thresholds.
type Config struct {
	FailureThreshold int           // Consecutive failures to open circuit
	SuccessThreshold int           // Successes in half-open to close circuit
	OpenTimeout      time.Duration // How long to stay open before probing
}

// DefaultConfig returns sensible defaults.
func DefaultConfig() Config {
	return Config{
		FailureThreshold: 5,
		SuccessThreshold: 2,
		OpenTimeout:      30 * time.Second,
	}
}

// Breaker implements the circuit breaker pattern in-memory (no Redis needed).
type Breaker struct {
	name            string
	config          Config
	state           State
	failureCount    int
	successCount    int
	lastFailureTime time.Time
	mu              sync.RWMutex
}

// New creates a new circuit breaker for a named service.
func New(name string, cfg Config) *Breaker {
	return &Breaker{
		name:   name,
		config: cfg,
		state:  Closed,
	}
}

// Execute wraps an operation with circuit breaker logic.
// Returns an error immediately if the circuit is open.
func (b *Breaker) Execute(fn func() error) error {
	if err := b.checkState(); err != nil {
		return err
	}

	err := fn()
	if err != nil {
		b.recordFailure()
		return err
	}

	b.recordSuccess()
	return nil
}

// ExecuteWithResult wraps an operation that returns a value.
func ExecuteWithResult[T any](b *Breaker, fn func() (T, error)) (T, error) {
	var zero T
	if err := b.checkState(); err != nil {
		return zero, err
	}

	result, err := fn()
	if err != nil {
		b.recordFailure()
		return result, err
	}

	b.recordSuccess()
	return result, nil
}

// State returns the current state (thread-safe).
func (b *Breaker) CurrentState() State {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return b.state
}

func (b *Breaker) checkState() error {
	b.mu.Lock()
	defer b.mu.Unlock()

	switch b.state {
	case Closed:
		return nil
	case Open:
		// Check if enough time has passed to try again
		if time.Since(b.lastFailureTime) >= b.config.OpenTimeout {
			b.state = HalfOpen
			b.successCount = 0
			logger.Log.Info("Circuit breaker half-open, probing",
				zap.String("service", b.name),
			)
			return nil
		}
		// Fail fast
		logger.Log.Warn("Circuit breaker rejecting request",
			zap.String("service", b.name),
			zap.String("state", b.state.String()),
		)
		return fmt.Errorf("circuit breaker OPEN for %s: service unavailable", b.name)
	case HalfOpen:
		return nil
	}
	return nil
}

func (b *Breaker) recordSuccess() {
	b.mu.Lock()
	defer b.mu.Unlock()

	b.failureCount = 0
	if b.state == HalfOpen {
		b.successCount++
		if b.successCount >= b.config.SuccessThreshold {
			b.state = Closed
			b.successCount = 0
			logger.Log.Info("Circuit breaker closed, service recovered",
				zap.String("service", b.name),
			)
		}
	}
}

func (b *Breaker) recordFailure() {
	b.mu.Lock()
	defer b.mu.Unlock()

	b.failureCount++
	b.lastFailureTime = time.Now()

	if b.state == HalfOpen {
		// Probe failed, back to open
		b.state = Open
		logger.Log.Warn("Circuit breaker re-opened after probe failure",
			zap.String("service", b.name),
		)
		return
	}

	if b.failureCount >= b.config.FailureThreshold {
		b.state = Open
		logger.Log.Error("Circuit breaker OPENED — too many failures",
			zap.String("service", b.name),
			zap.Int("failures", b.failureCount),
		)
	}
}
