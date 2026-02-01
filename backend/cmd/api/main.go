package main

import (
	"net/http"
	"os"
	"time"

	"github.com/Himadryy/hidden-depths-backend/internal/database"
	"github.com/Himadryy/hidden-depths-backend/internal/handlers"
	"github.com/Himadryy/hidden-depths-backend/internal/middleware"
	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"
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