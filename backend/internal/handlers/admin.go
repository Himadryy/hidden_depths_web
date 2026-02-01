package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/Himadryy/hidden-depths-backend/internal/database"
)

type AdminStats struct {
	TotalBookings    int `json:"total_bookings"`
	UpcomingBookings int `json:"upcoming_bookings"`
	Revenue          int `json:"estimated_revenue"`
}

// GetAdminStats returns aggregate metrics for the dashboard
func GetAdminStats(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	// 1. Total Bookings
	var total int
	err := database.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM bookings").Scan(&total)
	if err != nil {
		http.Error(w, "Failed to count total bookings", http.StatusInternalServerError)
		return
	}

	// 2. Upcoming Bookings
	// Using current date string comparison for simplicity, ideally use proper timestamp logic
	today := time.Now().Format("2006-01-02")
	var upcoming int
	err = database.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM bookings WHERE date >= $1", today).Scan(&upcoming)
	if err != nil {
		http.Error(w, "Failed to count upcoming bookings", http.StatusInternalServerError)
		return
	}

	// 3. Estimated Revenue
	// Logic: Count bookings AFTER Feb 3rd 2026 (Payment Start Date) * 99 INR
	// Payment Start Date: 2026-02-03
	var paidBookings int
	err = database.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM bookings WHERE date >= '2026-02-03'").Scan(&paidBookings)
	if err != nil {
		// If query fails (maybe date format issue), just default to 0
		paidBookings = 0
	}
	revenue := paidBookings * 99

	stats := AdminStats{
		TotalBookings:    total,
		UpcomingBookings: upcoming,
		Revenue:          revenue,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}
