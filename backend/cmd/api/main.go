// Hidden Depths API
// @title Hidden Depths API
// @version 1.0
// @description Mental health mentorship platform API for booking sessions and managing content.
// @termsOfService https://hidden-depths-web.pages.dev/terms

// @contact.name Hidden Depths Support
// @contact.email support@hiddendepths.com

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host hidden-depths-web.onrender.com
// @BasePath /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description JWT token from Supabase authentication. Format: "Bearer {token}"

// @tag.name Bookings
// @tag.description Booking management endpoints
// @tag.name Insights
// @tag.description Insight cards for the homepage carousel
// @tag.name Admin
// @tag.description Admin-only endpoints for managing content
// @tag.name Health
// @tag.description Health check endpoints
// @tag.name Webhooks
// @tag.description External service webhook endpoints
package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Himadryy/hidden-depths-backend/internal/config"
	"github.com/Himadryy/hidden-depths-backend/internal/database"
	"github.com/Himadryy/hidden-depths-backend/internal/handlers"
	"github.com/Himadryy/hidden-depths-backend/internal/middleware"
	"github.com/Himadryy/hidden-depths-backend/internal/services"
	"github.com/Himadryy/hidden-depths-backend/internal/ws"
	"github.com/Himadryy/hidden-depths-backend/pkg/cache"
	"github.com/Himadryy/hidden-depths-backend/pkg/logger"
	"github.com/Himadryy/hidden-depths-backend/pkg/response"
	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/robfig/cron/v3"
	"github.com/rs/cors"
	"go.uber.org/zap"
)

func main() {
	// 1. Load Configuration
	cfg, err := config.Load()
	if err != nil {
		panic("Failed to load config: " + err.Error())
	}

	// 2. Initialize Professional Logger
	if err := logger.Init(cfg.Environment); err != nil {
		panic("Failed to initialize logger: " + err.Error())
	}
	defer logger.Sync()

	// 3. Initialize Sentry Error Tracking (optional - graceful if no DSN)
	if err := middleware.InitSentry(logger.Log); err != nil {
		logger.Warn("Sentry initialization failed, continuing without error tracking", zap.Error(err))
	}
	defer middleware.FlushSentry(2 * time.Second)

	// 4. Connect to Database (Supabase)
	if err := database.ConnectDB(cfg.DatabaseURL); err != nil {
		logger.Fatal("Could not connect to database", zap.Error(err))
	}
	defer database.CloseDB()

	// 4. Initialize Redis Cache (graceful degradation if unavailable)
	if err := cache.Init(cache.Config{
		URL:     cfg.RedisURL,
		Enabled: cfg.CacheEnabled,
	}, logger.Log); err != nil {
		logger.Warn("Redis cache initialization failed, continuing without cache", zap.Error(err))
	}
	defer cache.Close()

	// 5. Start Background Scheduler (Email Reminders & Cleanup)
	c := cron.New()
	c.AddFunc("0 * * * *", services.CheckAndSendReminders)
	c.AddFunc("*/5 * * * *", services.CleanupAbandonedBookings) // Every 5 min — faster self-healing
	c.Start()
	logger.Info("Scheduler started")

	// 6. Initialize Services
	auditService := services.NewAuditService()
	handlers.SetBookingPolicy(handlers.BookingPolicy{
		SafeMode:         cfg.BookingSafeMode,
		AllowedWeekdays:  []time.Weekday{time.Sunday, time.Monday},
		SearchWindowDays: cfg.BookingSearchWindowDays,
		MaxBookableDates: cfg.BookingMaxBookableDates,
		TimeSlots:        cfg.BookingTimeSlots,
	})

	// 7. Initialize WebSocket Hub (with origin validation)
	hub := ws.NewHub(cfg.AllowedOrigins)
	go hub.Run()
	logger.Info("WebSocket Hub started")

	// 8. Rate Limiters — protect critical endpoints (uses Redis when available)
	globalLimiter := middleware.NewNamedRateLimiter("global", 200, time.Minute)  // 200 req/min general
	bookingLimiter := middleware.NewNamedRateLimiter("booking", 10, time.Minute) // 10 req/min for booking creation
	paymentLimiter := middleware.NewNamedRateLimiter("payment", 5, time.Minute)  // 5 req/min for payment verification

	// 9. Setup Router & Middleware
	r := chi.NewRouter()

	r.Use(chiMiddleware.RequestID)
	r.Use(middleware.RequestIDResponse) // Propagate request ID to response headers
	r.Use(chiMiddleware.RealIP)
	r.Use(chiMiddleware.Logger)
	r.Use(middleware.SentryRecovery(logger.Log)) // Sentry panic capture (before chi Recoverer)
	r.Use(chiMiddleware.Recoverer)
	r.Use(chiMiddleware.Timeout(60 * time.Second))
	r.Use(middleware.SecurityHeaders)   // Security headers (CSP, HSTS, X-Frame-Options, etc.)
	r.Use(middleware.PrometheusMetrics) // Prometheus metrics collection
	r.Use(globalLimiter.Handler)

	// CORS Setup
	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization", "X-Request-Id", "X-Requested-With"},
		ExposedHeaders:   []string{"Link", "X-Request-Id"},
		AllowCredentials: true,
		MaxAge:           300,
	})
	r.Use(corsHandler.Handler)

	// 10. Define Routes
	r.Route("/api", func(r chi.Router) {
		// Health endpoints at /api level (not versioned - for infrastructure)
		r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			response.JSON(w, http.StatusOK, map[string]string{"status": "ok"}, "Healthy")
		})
		r.Get("/health/ready", handlers.HealthReady)

		// Prometheus metrics endpoint (for Grafana/monitoring)
		r.Handle("/metrics", promhttp.Handler())

		// WebSocket at /api level (not versioned - stateful connection)
		r.Get("/ws", hub.ServeWS)

		// Versioned API routes
		r.Route("/v1", func(r chi.Router) {
			// Bookings
			r.Route("/bookings", func(r chi.Router) {
				r.Get("/policy", handlers.GetBookingPolicy)
				r.Get("/slots/{date}", handlers.GetBookedSlots)
				r.Get("/recommendations/{date}", handlers.GetRecommendedSlots)
				r.With(paymentLimiter.Handler).Post("/verify", func(w http.ResponseWriter, r *http.Request) {
					handlers.VerifyPayment(w, r, hub, auditService)
				})

				// Protected User Routes
				r.Group(func(r chi.Router) {
					r.Use(middleware.AuthMiddleware(cfg.JWTSecret, cfg.SupabaseAnonKey))

					r.Get("/my", handlers.GetUserBookings)
					r.Get("/{id}/status", handlers.GetBookingStatus)
					r.Get("/subscriptions/active", handlers.GetActiveSubscription)
					r.With(bookingLimiter.Handler).Post("/", func(w http.ResponseWriter, r *http.Request) {
						handlers.CreateBooking(w, r, hub, auditService)
					})
					r.Post("/{id}/release-pending", func(w http.ResponseWriter, r *http.Request) {
						handlers.ReleasePendingBooking(w, r, hub, auditService)
					})
					r.Delete("/{id}", func(w http.ResponseWriter, r *http.Request) {
						handlers.CancelBooking(w, r, hub, auditService)
					})
				})
			})

			// Razorpay Webhook (public, signature-verified internally)
			r.Post("/webhook/razorpay", func(w http.ResponseWriter, r *http.Request) {
				handlers.RazorpayWebhook(w, r, hub, auditService)
			})

			// Insights (Public)
			r.Get("/insights", handlers.GetAllInsights)

			// Admin Portal (Double Protected)
			r.Route("/admin", func(r chi.Router) {
				r.Use(middleware.AuthMiddleware(cfg.JWTSecret, cfg.SupabaseAnonKey))
				r.Use(middleware.AdminMiddleware(cfg.AdminEmails))

				r.Get("/stats", handlers.GetAdminStats)
				r.Post("/test-email", handlers.TestEmail)

				r.Route("/insights", func(r chi.Router) {
					r.Post("/", handlers.CreateInsight)
					r.Put("/{id}", handlers.UpdateInsight)
					r.Delete("/{id}", handlers.DeleteInsight)
				})
			})
		})

		// Legacy routes redirect to v1 (backward compatibility)
		r.Get("/bookings/*", func(w http.ResponseWriter, r *http.Request) {
			http.Redirect(w, r, "/api/v1"+r.URL.Path[4:], http.StatusMovedPermanently)
		})
		r.Get("/insights", func(w http.ResponseWriter, r *http.Request) {
			http.Redirect(w, r, "/api/v1/insights", http.StatusMovedPermanently)
		})
	})

	// 9. Start Server with Graceful Shutdown
	srv := &http.Server{
		Addr:         "0.0.0.0:" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		logger.Info("Server starting", zap.String("port", cfg.Port), zap.String("env", cfg.Environment))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Server failed to start", zap.Error(err))
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info("Shutting down server...")

	// Give outstanding requests 10 seconds to complete
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	c.Stop()
	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", zap.Error(err))
	}

	logger.Info("Server exited gracefully")
}
