package cache

import "time"

// TTL constants for different cache types
const (
	// SlotsTTL - booking slots need aggressive freshness for real-time availability
	// 5 seconds ensures worst-case staleness is minimal while still reducing DB load
	SlotsTTL = 5 * time.Second

	// InsightsTTL - insights data rarely changes (admin-only edits)
	InsightsTTL = 5 * time.Minute

	// RateLimitTTL - sliding window expiry for rate limiting
	RateLimitTTL = 1 * time.Minute

	// SessionTTL - balance security vs. performance for token caching
	SessionTTL = 15 * time.Minute
)

// Key prefixes for cache namespacing
const (
	PrefixSlots     = "slots:"
	PrefixInsights  = "insights:"
	PrefixRateLimit = "ratelimit:"
	PrefixSession   = "session:"
)

// SlotsKey returns the cache key for booking slots for a specific date
func SlotsKey(date string) string {
	return PrefixSlots + date
}

// InsightsKey returns the cache key for all insights
func InsightsKey() string {
	return PrefixInsights + "all"
}

// RateLimitKey returns the cache key for rate limiting a specific IP/endpoint
func RateLimitKey(ip, endpoint string) string {
	return PrefixRateLimit + ip + ":" + endpoint
}

// SessionKey returns the cache key for a session token hash
func SessionKey(tokenHash string) string {
	return PrefixSession + tokenHash
}
