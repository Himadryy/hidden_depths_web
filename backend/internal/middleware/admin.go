package middleware

import (
	"net/http"
	"strings"
)

func AdminMiddleware(adminEmails []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// 1. Get email from context (set by AuthMiddleware)
			email, ok := r.Context().Value(UserEmailKey).(string)
			if !ok || email == "" {
				http.Error(w, "Unauthorized: Email required", http.StatusUnauthorized)
				return
			}

			// 2. Check against allowed admin emails
			if len(adminEmails) == 0 {
				// Fail safe: if no admins configured, nobody is admin
				http.Error(w, "Unauthorized: No admins configured", http.StatusForbidden)
				return
			}

			isAllowed := false
			for _, allowed := range adminEmails {
				if strings.TrimSpace(allowed) == email {
					isAllowed = true
					break
				}
			}

			if !isAllowed {
				http.Error(w, "Forbidden: Admin access only", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
