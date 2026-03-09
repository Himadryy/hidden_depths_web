package middleware

import (
	"net/http"

	"github.com/go-chi/chi/v5/middleware"
)

// RequestIDResponse copies the chi request ID into the response header
// so the response package can include it in error responses.
func RequestIDResponse(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqID := middleware.GetReqID(r.Context())
		if reqID != "" {
			w.Header().Set("X-Request-Id", reqID)
		}
		next.ServeHTTP(w, r)
	})
}
