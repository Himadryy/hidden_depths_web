package main

import (
	"net/http"
	"os"
	"time"

	"github.com/Himadryy/hidden-depths-backend/internal/database"
	"github.com/Himadryy/hidden-depths-backend/internal/handlers"
	"github.com/Himadryy/hidden-depths-backend/internal/middleware"
	"github.com/Himadryy/hidden-depths-backend/internal/services"
	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"
	"github.com/robfig/cron/v3"
	"github.com/rs/cors"
	"go.uber.org/zap"
)

func main() {
	// Initialize Logger
	logger, _ := zap.NewProduction()
	defer logger.Sync()
	sugar := logger.Sugar()

	// Load .env
	if err := godotenv.Load(); err != nil {
		sugar.Info("No .env file found")
	}

	// Connect to DB
	if err := database.ConnectDB(); err != nil {
		sugar.Fatalf("Could not connect to database: %v", err)
	}
	defer database.CloseDB()

	// Start Scheduler
	c := cron.New()
	// Run at minute 0 of every hour
	c.AddFunc("0 * * * *", services.CheckAndSendReminders)
	c.Start()
	sugar.Info("Scheduler started")

	r := chi.NewRouter()

	// Standard Middleware
	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.RealIP)
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)
	r.Use(chiMiddleware.Timeout(60 * time.Second))

	// CORS
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "https://hidden-depths-web.pages.dev"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	})
	r.Use(c.Handler)

	// API Routes
	r.Route("/api", func(r chi.Router) {
		r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte("ok"))
		})

		r.Route("/bookings", func(r chi.Router) {
			r.Post("/", handlers.CreateBooking)
			r.Get("/slots/{date}", handlers.GetBookedSlots)
			
			// Protected Routes
			r.Group(func(r chi.Router) {
				r.Use(middleware.AuthMiddleware)
				r.Get("/my", handlers.GetUserBookings)
				r.Delete("/{id}", handlers.CancelBooking)
			})
		})

		r.Get("/insights", handlers.GetAllInsights)

		r.Route("/admin", func(r chi.Router) {
			r.Use(middleware.AuthMiddleware)
			r.Use(middleware.AdminMiddleware)
			r.Get("/stats", handlers.GetAdminStats)
			
			r.Route("/insights", func(r chi.Router) {
				r.Post("/", handlers.CreateInsight)
				r.Put("/{id}", handlers.UpdateInsight)
				r.Delete("/{id}", handlers.DeleteInsight)
			})
		})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	sugar.Infof("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		sugar.Fatal(err)
	}
}