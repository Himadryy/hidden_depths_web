package middleware

import "net/http"

// SecurityHeaders adds essential security headers to all responses.
// This protects against XSS, clickjacking, MIME sniffing, and enforces HTTPS.
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Prevent MIME type sniffing
		w.Header().Set("X-Content-Type-Options", "nosniff")

		// Prevent clickjacking - deny all framing
		w.Header().Set("X-Frame-Options", "DENY")

		// XSS protection (legacy browsers)
		w.Header().Set("X-XSS-Protection", "1; mode=block")

		// Enforce HTTPS for 1 year, include subdomains
		w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

		// Content Security Policy - restrict resource loading
		// Allow self, inline styles (for Tailwind), and specific external resources
		w.Header().Set("Content-Security-Policy",
			"default-src 'self'; "+
				"script-src 'self' 'unsafe-inline' https://checkout.razorpay.com; "+
				"style-src 'self' 'unsafe-inline'; "+
				"img-src 'self' data: https:; "+
				"connect-src 'self' https://api.razorpay.com https://*.supabase.co wss://*.supabase.co; "+
				"frame-src https://api.razorpay.com https://checkout.razorpay.com; "+
				"font-src 'self' data:;")

		// Prevent browsers from caching sensitive responses
		w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
		w.Header().Set("Pragma", "no-cache")

		// Referrer policy - don't leak URLs to external sites
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		// Permissions policy - disable unnecessary browser features
		w.Header().Set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

		next.ServeHTTP(w, r)
	})
}
