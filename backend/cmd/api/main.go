package main

import (
	"net/http"
	"time"

	"github.com/Himadryy/hidden-depths-backend/internal/config"
	"github.com/Himadryy/hidden-depths-backend/internal/database"
	"github.com/Himadryy/hidden-depths-backend/internal/handlers"
	"github.com/Himadryy/hidden-depths-backend/internal/middleware"
	"github.com/Himadryy/hidden-depths-backend/internal/services"
	"github.com/Himadryy/hidden-depths-backend/pkg/logger"
	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
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

	// 3. Connect to Database (Supabase)
	if err := database.ConnectDB(cfg.DatabaseURL); err != nil {
		logger.Fatal("Could not connect to database", zap.Error(err))
	}
	defer database.CloseDB()

	// 4. Start Background Scheduler (Email Reminders)
	c := cron.New()
	c.AddFunc("0 * * * *", services.CheckAndSendReminders)
	c.Start()
	logger.Info("Scheduler started")

	// 5. Setup Router & Middleware
	r := chi.NewRouter()

	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.RealIP)
	r.Use(chiMiddleware.Logger) // Chi's default logger is fine, but we'll use ours for business logic
	r.Use(chiMiddleware.Recoverer)
	r.Use(chiMiddleware.Timeout(60 * time.Second))

	// CORS Setup
	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	})
	r.Use(corsHandler.Handler)

	// 6. Define Routes
	r.Route("/api", func(r chi.Router) {
		r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte("ok"))
		})

		// Bookings
		r.Route("/bookings", func(r chi.Router) {
			r.Post("/", handlers.CreateBooking)
			r.Get("/slots/{date}", handlers.GetBookedSlots)
			
			// Protected User Routes
			r.Group(func(r chi.Router) {
				r.Use(middleware.AuthMiddleware(cfg.JWTSecret))
				r.Get("/my", handlers.GetUserBookings)
				r.Delete("/{id}", handlers.CancelBooking)
			})
		})

		// Insights (Public)
		r.Get("/insights", handlers.GetAllInsights)

		// Admin Portal (Double Protected)
		r.Route("/admin", func(r chi.Router) {
			r.Use(middleware.AuthMiddleware(cfg.JWTSecret))
			r.Use(middleware.AdminMiddleware(cfg.AdminEmails))
			
			r.Get("/stats", handlers.GetAdminStats)
			
			r.Route("/insights", func(r chi.Router) {
				r.Post("/", handlers.CreateInsight)
				r.Put("/{id}", handlers.UpdateInsight)
				r.Delete("/{id}", handlers.DeleteInsight)
			})
		})
	})

	// 7. Start Server
	logger.Info("Server starting", zap.String("port", cfg.Port), zap.String("env", cfg.Environment))
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		logger.Fatal("Server failed to start", zap.Error(err))
	}
}
