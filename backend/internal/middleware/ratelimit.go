package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/Himadryy/hidden-depths-backend/pkg/apperror"
	"github.com/Himadryy/hidden-depths-backend/pkg/response"
	"github.com/go-chi/chi/v5/middleware"
)

// rateBucket tracks request counts per IP.
type rateBucket struct {
	count    int
	resetAt  time.Time
}

// RateLimiter provides per-IP rate limiting with a sliding window.
// Uses in-memory storage — no Redis needed.
type RateLimiter struct {
	mu       sync.Mutex
	buckets  map[string]*rateBucket
	limit    int
	window   time.Duration
}

// NewRateLimiter creates a rate limiter: limit requests per window per IP.
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		buckets: make(map[string]*rateBucket),
		limit:   limit,
		window:  window,
	}
	// Cleanup stale entries every 5 minutes
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

// Allow checks if the IP is within rate limit.
func (rl *RateLimiter) Allow(ip string) bool {
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

// Handler returns a middleware that enforces the rate limit.
func (rl *RateLimiter) Handler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr
		if realIP := middleware.GetReqID(r.Context()); realIP != "" {
			// Use the real IP from chi's RealIP middleware
		}
		if fwd := r.Header.Get("X-Real-Ip"); fwd != "" {
			ip = fwd
		}

		if !rl.Allow(ip) {
			appErr := apperror.RateLimitExceeded()
			response.AppErr(w, appErr)
			return
		}
		next.ServeHTTP(w, r)
	})
}
