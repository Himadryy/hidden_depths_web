package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/Himadryy/hidden-depths-backend/internal/database"
	"github.com/Himadryy/hidden-depths-backend/internal/services"
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

// TestEmailRequest holds the request body for test email endpoint
type TestEmailRequest struct {
	To string `json:"to"`
}

// TestEmail godoc
// @Summary Send a test email
// @Description Sends a test email to verify Resend integration is working. Admin only.
// @Tags Admin
// @Accept json
// @Produce json
// @Param request body TestEmailRequest true "Test email request"
// @Success 200 {object} map[string]interface{} "Test email sent"
// @Failure 400 {object} map[string]interface{} "Invalid request"
// @Failure 500 {object} map[string]interface{} "Email service error"
// @Router /admin/test-email [post]
// @Security BearerAuth
func TestEmail(w http.ResponseWriter, r *http.Request) {
	var req TestEmailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.AppErr(w, apperror.InvalidPayload(err))
		return
	}

	if req.To == "" {
		response.AppErr(w, apperror.ValidationError("to", "Email address is required"))
		return
	}

	emailSvc := services.GetEmailService()
	if emailSvc == nil || !emailSvc.IsEnabled() {
		response.AppErr(w, apperror.ExternalServiceError("email", nil).WithContext("reason", "Email service not configured. Set RESEND_API_KEY environment variable."))
		return
	}

	if err := emailSvc.SendTestEmail(req.To); err != nil {
		logger.Log.Error("Test email failed", zap.String("to", req.To), zap.Error(err))
		response.AppErr(w, apperror.ExternalServiceError("email", err))
		return
	}

	logger.Log.Info("Test email sent successfully", zap.String("to", req.To))
	response.JSON(w, http.StatusOK, map[string]string{
		"sent_to": req.To,
		"status":  "sent",
	}, "Test email sent successfully")
}
