package middleware

import (
	"net/http"
	"os"
	"strings"
)

func AdminMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 1. Get email from context (set by AuthMiddleware)
		email, ok := r.Context().Value(UserEmailKey).(string)
		if !ok || email == "" {
			http.Error(w, "Unauthorized: Email required", http.StatusUnauthorized)
			return
		}

		// 2. Check against allowed admin emails
		adminEmails := os.Getenv("ADMIN_EMAILS")
		if adminEmails == "" {
			// Fail safe: if no admins configured, nobody is admin
			http.Error(w, "Unauthorized: No admins configured", http.StatusForbidden)
			return
		}

		allowedList := strings.Split(adminEmails, ",")
		isAllowed := false
		for _, allowed := range allowedList {
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
