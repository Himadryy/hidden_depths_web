package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

const UserIDKey = "user_id"
const UserEmailKey = "user_email"
const SupabaseAuthURL = "https://msriduejyxcdpvcawacj.supabase.co/auth/v1/user"
const SupabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zcmlkdWVqeXhjZHB2Y2F3YWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMjg1MzcsImV4cCI6MjA4NDgwNDUzN30.0ISyTWngMwf0MzOSAT8TH1sUvfLRXjPCHn8qcgvB1nM"

func AuthMiddleware(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "Authorization header required", http.StatusUnauthorized)
				return
			}

			bearerToken := strings.Split(authHeader, " ")
			if len(bearerToken) != 2 || strings.ToLower(bearerToken[0]) != "bearer" {
				http.Error(w, "Invalid authorization header format", http.StatusUnauthorized)
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
				req, _ := http.NewRequest("GET", SupabaseAuthURL, nil)
				req.Header.Set("Authorization", "Bearer "+tokenString)
				req.Header.Set("apikey", SupabaseAnonKey)
				
				client := &http.Client{}
				resp, err := client.Do(req)
				if err != nil || resp.StatusCode != 200 {
					http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
					return
				}
				defer resp.Body.Close()
				
				var userResp struct {
					ID    string `json:"id"`
					Email string `json:"email"`
				}
				if err := json.NewDecoder(resp.Body).Decode(&userResp); err == nil {
					userID = userResp.ID
					email = userResp.Email
				}
			}

			if userID == "" {
				http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
				return
			}

			// Add User ID and Email to context
			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			ctx = context.WithValue(ctx, UserEmailKey, email)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
