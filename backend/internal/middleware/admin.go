package middleware

import (
	"net/http"
	"strings"

	"github.com/Himadryy/hidden-depths-backend/pkg/apperror"
	"github.com/Himadryy/hidden-depths-backend/pkg/response"
)

func AdminMiddleware(adminEmails []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			email, ok := r.Context().Value(UserEmailKey).(string)
			if !ok || email == "" {
				response.AppErr(w, apperror.AuthRequired().WithContext("reason", "email missing from token"))
				return
			}

			if len(adminEmails) == 0 {
				response.AppErr(w, apperror.AdminAccessDenied().WithContext("reason", "no admins configured"))
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
				response.AppErr(w, apperror.AdminAccessDenied())
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
