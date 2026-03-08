package middleware

import (
	"net/http"
	"strings"

	"github.com/Himadryy/hidden-depths-backend/pkg/response"
)

func AdminMiddleware(adminEmails []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// 1. Get email from context (set by AuthMiddleware)
			email, ok := r.Context().Value(UserEmailKey).(string)
			if !ok || email == "" {
				response.Error(w, http.StatusUnauthorized, "Email required for admin access")
				return
			}

			// 2. Check against allowed admin emails
			if len(adminEmails) == 0 {
				response.Error(w, http.StatusForbidden, "No admins configured")
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
				response.Error(w, http.StatusForbidden, "Admin access only")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
