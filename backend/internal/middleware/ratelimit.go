package middleware

import (
	"context"
	"net/http"
	"sync"
	"time"

	"github.com/Himadryy/hidden-depths-backend/pkg/apperror"
	"github.com/Himadryy/hidden-depths-backend/pkg/cache"
	"github.com/Himadryy/hidden-depths-backend/pkg/logger"
	"github.com/Himadryy/hidden-depths-backend/pkg/response"
	"go.uber.org/zap"
)

// rateBucket tracks request counts per IP (in-memory fallback).
type rateBucket struct {
	count   int
	resetAt time.Time
}

// RateLimiter provides per-IP rate limiting.
// Uses Redis when available, falls back to in-memory when Redis is unavailable.
type RateLimiter struct {
	mu      sync.Mutex
	buckets map[string]*rateBucket
	limit   int
	window  time.Duration
	name    string // identifier for this limiter (e.g., "global", "booking")
}

// NewRateLimiter creates a rate limiter: limit requests per window per IP.
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return NewNamedRateLimiter("default", limit, window)
}

// NewNamedRateLimiter creates a rate limiter with a name for Redis key namespacing.
func NewNamedRateLimiter(name string, limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		buckets: make(map[string]*rateBucket),
		limit:   limit,
		window:  window,
		name:    name,
	}
	// Cleanup stale entries every 5 minutes (for in-memory fallback)
	go rl.cleanup()
	return rl
}

func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for ip, bucket := range rl.buckets {
			if now.After(bucket.resetAt) {
				delete(rl.buckets, ip)
			}
		}
		rl.mu.Unlock()
	}
}

// allowRedis checks rate limit using Redis sliding window counter.
func (rl *RateLimiter) allowRedis(ctx context.Context, ip string) (bool, error) {
	key := cache.RateLimitKey(ip, rl.name)

	// Increment counter
	count, err := cache.Incr(ctx, key)
	if err != nil {
		return false, err
	}

	// Set expiry only on first request (count == 1)
	if count == 1 {
		if err := cache.Expire(ctx, key, rl.window); err != nil {
			logger.Log.Warn("Failed to set rate limit TTL", zap.String("key", key), zap.Error(err))
		}
	}

	return count <= int64(rl.limit), nil
}

// allowInMemory checks rate limit using in-memory bucket (fallback).
func (rl *RateLimiter) allowInMemory(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	bucket, exists := rl.buckets[ip]

	if !exists || now.After(bucket.resetAt) {
		rl.buckets[ip] = &rateBucket{count: 1, resetAt: now.Add(rl.window)}
		return true
	}

	bucket.count++
	return bucket.count <= rl.limit
}

// Allow checks if the IP is within rate limit.
// Tries Redis first, falls back to in-memory if Redis is unavailable.
func (rl *RateLimiter) Allow(ctx context.Context, ip string) bool {
	// Try Redis first
	if cache.IsEnabled() {
		allowed, err := rl.allowRedis(ctx, ip)
		if err == nil {
			return allowed
		}
		// Redis error — fall through to in-memory
		logger.Log.Debug("Rate limit Redis fallback", zap.String("ip", ip), zap.Error(err))
	}

	// Fallback to in-memory
	return rl.allowInMemory(ip)
}

// Handler returns a middleware that enforces the rate limit.
func (rl *RateLimiter) Handler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr
		if fwd := r.Header.Get("X-Real-Ip"); fwd != "" {
			ip = fwd
		} else if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
			ip = fwd
		}

		if !rl.Allow(r.Context(), ip) {
			appErr := apperror.RateLimitExceeded()
			response.AppErr(w, appErr)
			return
		}
		next.ServeHTTP(w, r)
	})
}
