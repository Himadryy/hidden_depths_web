package handlers

import (
	"net/http"
	"time"

	"github.com/Himadryy/hidden-depths-backend/internal/database"
	"github.com/Himadryy/hidden-depths-backend/pkg/apperror"
	"github.com/Himadryy/hidden-depths-backend/pkg/logger"
	"github.com/Himadryy/hidden-depths-backend/pkg/response"
	"go.uber.org/zap"
)

type AdminStats struct {
	TotalBookings    int     `json:"total_bookings"`
	UpcomingBookings int     `json:"upcoming_bookings"`
	Revenue          float64 `json:"estimated_revenue"`
}

// GetAdminStats returns aggregate metrics for the dashboard
func GetAdminStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var total int
	err := database.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM bookings WHERE payment_status = 'paid'").Scan(&total)
	if err != nil {
		logger.Log.Error("Failed to count total bookings", zap.Error(err))
		response.AppErr(w, apperror.DatabaseError("count total bookings", err))
		return
	}

	today := time.Now().Format("2006-01-02")
	var upcoming int
	err = database.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM bookings WHERE date >= $1 AND payment_status = 'paid'", today).Scan(&upcoming)
	if err != nil {
		logger.Log.Error("Failed to count upcoming bookings", zap.Error(err))
		response.AppErr(w, apperror.DatabaseError("count upcoming bookings", err))
		return
	}

	var revenue float64
	err = database.Pool.QueryRow(ctx, "SELECT COALESCE(SUM(amount), 0) FROM bookings WHERE payment_status = 'paid' AND amount > 0").Scan(&revenue)
	if err != nil {
		logger.Log.Error("Failed to calculate revenue", zap.Error(err))
		revenue = 0
	}

	stats := AdminStats{
		TotalBookings:    total,
		UpcomingBookings: upcoming,
		Revenue:          revenue,
	}

	response.JSON(w, http.StatusOK, stats, "Admin stats fetched")
}
