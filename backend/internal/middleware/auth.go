package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/Himadryy/hidden-depths-backend/pkg/logger"
	"github.com/Himadryy/hidden-depths-backend/pkg/response"
	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
)

const UserIDKey = "user_id"
const UserEmailKey = "user_email"
const SupabaseAuthURL = "https://msriduejyxcdpvcawacj.supabase.co/auth/v1/user"

func AuthMiddleware(jwtSecret, supabaseAnonKey string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				response.Error(w, http.StatusUnauthorized, "Authorization header required")
				return
			}

			bearerToken := strings.Split(authHeader, " ")
			if len(bearerToken) != 2 || strings.ToLower(bearerToken[0]) != "bearer" {
				response.Error(w, http.StatusUnauthorized, "Invalid authorization header format")
				return
			}

			tokenString := bearerToken[1]
			var userID, email string

			// 1. Try Local HMAC Verification (Fast)
			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
				return []byte(jwtSecret), nil
			})

			if err == nil && token.Valid {
				if claims, ok := token.Claims.(jwt.MapClaims); ok {
					if sub, ok := claims["sub"].(string); ok {
						userID = sub
						email, _ = claims["email"].(string)
					}
				}
			}

			// 2. Fallback: Remote Supabase Verification (Slow but supports ES256/Google)
			if userID == "" {
				ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
				defer cancel()

				req, err := http.NewRequestWithContext(ctx, "GET", SupabaseAuthURL, nil)
				if err != nil {
					logger.Error("Failed to create Supabase auth request", zap.Error(err))
					response.Error(w, http.StatusUnauthorized, "Invalid or expired token")
					return
				}
				req.Header.Set("Authorization", "Bearer "+tokenString)
				req.Header.Set("apikey", supabaseAnonKey)
				
				client := &http.Client{Timeout: 5 * time.Second}
				resp, err := client.Do(req)
				if err != nil {
					logger.Error("Supabase auth request failed", zap.Error(err))
					response.Error(w, http.StatusUnauthorized, "Invalid or expired token")
					return
				}
				defer resp.Body.Close()

				if resp.StatusCode != 200 {
					response.Error(w, http.StatusUnauthorized, "Invalid or expired token")
					return
				}
				
				var userResp struct {
					ID    string `json:"id"`
					Email string `json:"email"`
				}
				if err := json.NewDecoder(resp.Body).Decode(&userResp); err != nil {
					logger.Error("Failed to decode Supabase auth response", zap.Error(err))
					response.Error(w, http.StatusUnauthorized, "Invalid or expired token")
					return
				}
				userID = userResp.ID
				email = userResp.Email
			}

			if userID == "" {
				response.Error(w, http.StatusUnauthorized, "Invalid or expired token")
				return
			}

			// Add User ID and Email to context
			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			ctx = context.WithValue(ctx, UserEmailKey, email)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
