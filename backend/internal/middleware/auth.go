package middleware

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/Himadryy/hidden-depths-backend/pkg/apperror"
	"github.com/Himadryy/hidden-depths-backend/pkg/cache"
	"github.com/Himadryy/hidden-depths-backend/pkg/logger"
	"github.com/Himadryy/hidden-depths-backend/pkg/response"
	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
)

const UserIDKey = "user_id"
const UserEmailKey = "user_email"

// cachedSession stores validated session claims in Redis
type cachedSession struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
}

// hashToken creates a SHA256 hash of the token for cache key
func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

func resolveSupabaseAuthURL(supabaseURL string) string {
	baseURL := strings.TrimRight(strings.TrimSpace(supabaseURL), "/")
	if baseURL == "" {
		// Backward-compatible fallback to existing project URL.
		baseURL = "https://msriduejyxcdpvcawacj.supabase.co"
	}
	return baseURL + "/auth/v1/user"
}

func AuthMiddleware(jwtSecret, supabaseAnonKey, supabaseURL string) func(http.Handler) http.Handler {
	supabaseAuthURL := resolveSupabaseAuthURL(supabaseURL)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				response.AppErr(w, apperror.AuthRequired())
				return
			}

			bearerToken := strings.Split(authHeader, " ")
			if len(bearerToken) != 2 || strings.ToLower(bearerToken[0]) != "bearer" {
				response.AppErr(w, apperror.AuthInvalidFormat())
				return
			}

			tokenString := bearerToken[1]
			tokenHash := hashToken(tokenString)
			cacheKey := cache.SessionKey(tokenHash)
			ctx := r.Context()

			var userID, email string

			// 0. Try session cache first (fastest path)
			if session, err := cache.Get[cachedSession](ctx, cacheKey); err == nil {
				userID = session.UserID
				email = session.Email
				logger.Log.Debug("Session cache hit", zap.String("user_id", userID))
			} else {
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
					verifyCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
					defer cancel()

					req, err := http.NewRequestWithContext(verifyCtx, "GET", supabaseAuthURL, nil)
					if err != nil {
						logger.Error("Failed to create Supabase auth request", zap.Error(err))
						response.AppErr(w, apperror.AuthTokenInvalid(err))
						return
					}
					req.Header.Set("Authorization", "Bearer "+tokenString)
					req.Header.Set("apikey", supabaseAnonKey)

					client := &http.Client{Timeout: 5 * time.Second}
					resp, err := client.Do(req)
					if err != nil {
						logger.Error("Supabase auth request failed", zap.Error(err))
						response.AppErr(w, apperror.AuthTokenInvalid(err))
						return
					}
					defer resp.Body.Close()

					if resp.StatusCode != 200 {
						response.AppErr(w, apperror.AuthTokenInvalid(fmt.Errorf("supabase returned %d", resp.StatusCode)))
						return
					}

					var userResp struct {
						ID    string `json:"id"`
						Email string `json:"email"`
					}
					if err := json.NewDecoder(resp.Body).Decode(&userResp); err != nil {
						logger.Error("Failed to decode Supabase auth response", zap.Error(err))
						response.AppErr(w, apperror.AuthTokenInvalid(err))
						return
					}
					userID = userResp.ID
					email = userResp.Email
				}

				// Cache the validated session for future requests
				if userID != "" {
					_ = cache.Set(ctx, cacheKey, cachedSession{UserID: userID, Email: email}, cache.SessionTTL)
				}
			}

			if userID == "" {
				response.AppErr(w, apperror.AuthTokenInvalid(fmt.Errorf("no user ID extracted")))
				return
			}

			// Add User ID and Email to context
			ctx = context.WithValue(ctx, UserIDKey, userID)
			ctx = context.WithValue(ctx, UserEmailKey, email)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
