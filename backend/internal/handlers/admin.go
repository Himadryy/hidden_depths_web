package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
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

type AdminBooking struct {
	ID                string    `json:"id"`
	UserID            string    `json:"user_id,omitempty"`
	UserEmail         string    `json:"user_email"`
	Date              string    `json:"date"`
	Time              string    `json:"time"`
	PaymentStatus     string    `json:"payment_status"`
	RazorpayPaymentID string    `json:"razorpay_payment_id,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
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

// GetAdminBookings godoc
// @Summary List bookings (Admin)
// @Description Returns paginated bookings for the admin dashboard.
// @Tags Admin
// @Produce json
// @Param page query int false "Page number (1-based)"
// @Param per_page query int false "Results per page (max 100)"
// @Param status query string false "Status filter (paid, pending, failed, cancelled, confirmed)"
// @Param search query string false "Search by name, email, booking id, or user id"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /admin/bookings [get]
// @Security BearerAuth
// GetAdminBookings returns paginated booking data for admin dashboards.
func GetAdminBookings(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	page := 1
	perPage := 20

	if raw := strings.TrimSpace(r.URL.Query().Get("page")); raw != "" {
		val, err := strconv.Atoi(raw)
		if err != nil || val < 1 {
			response.AppErr(w, apperror.ValidationError("page", "Page must be a positive integer"))
			return
		}
		page = val
	}

	if raw := strings.TrimSpace(r.URL.Query().Get("per_page")); raw != "" {
		val, err := strconv.Atoi(raw)
		if err != nil || val < 1 {
			response.AppErr(w, apperror.ValidationError("per_page", "per_page must be a positive integer"))
			return
		}
		if val > 100 {
			val = 100
		}
		perPage = val
	}

	status := strings.TrimSpace(strings.ToLower(r.URL.Query().Get("status")))
	if status == "confirmed" {
		status = "paid"
	}

	if status != "" && status != "all" && status != "paid" && status != "pending" && status != "failed" && status != "cancelled" {
		response.AppErr(w, apperror.ValidationError("status", "Invalid status filter"))
		return
	}

	search := strings.TrimSpace(r.URL.Query().Get("search"))
	searchValue := ""
	if search != "" {
		searchValue = "%" + strings.ToLower(search) + "%"
	}

	conditions := make([]string, 0, 2)
	args := make([]interface{}, 0, 4)
	argIndex := 1

	if status != "" && status != "all" {
		conditions = append(conditions, fmt.Sprintf("payment_status = $%d", argIndex))
		args = append(args, status)
		argIndex++
	}

	if searchValue != "" {
		conditions = append(conditions, fmt.Sprintf(`(LOWER(email) LIKE $%d OR LOWER(name) LIKE $%d OR id::text ILIKE $%d OR COALESCE(user_id::text, '') ILIKE $%d)`, argIndex, argIndex, argIndex, argIndex))
		args = append(args, searchValue)
		argIndex++
	}

	whereClause := "TRUE"
	if len(conditions) > 0 {
		whereClause = strings.Join(conditions, " AND ")
	}

	query := fmt.Sprintf(`
		SELECT id, user_id, email, date, time, payment_status, COALESCE(razorpay_payment_id, ''), created_at,
		       COUNT(*) OVER() AS total
		FROM bookings
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`, whereClause, argIndex, argIndex+1)

	args = append(args, perPage, (page-1)*perPage)

	rows, err := database.Pool.Query(ctx, query, args...)
	if err != nil {
		logger.Log.Error("Failed to fetch admin bookings", zap.Error(err))
		response.AppErr(w, apperror.DatabaseError("fetch admin bookings", err))
		return
	}
	defer rows.Close()

	bookings := make([]AdminBooking, 0, perPage)
	total := 0

	for rows.Next() {
		var (
			booking       AdminBooking
			userID        *string
			paymentID     string
			rowTotalCount int
		)
		if err := rows.Scan(
			&booking.ID,
			&userID,
			&booking.UserEmail,
			&booking.Date,
			&booking.Time,
			&booking.PaymentStatus,
			&paymentID,
			&booking.CreatedAt,
			&rowTotalCount,
		); err != nil {
			logger.Log.Warn("Failed to scan admin booking row", zap.Error(err))
			continue
		}
		if userID != nil {
			booking.UserID = *userID
		}
		if paymentID != "" {
			booking.RazorpayPaymentID = paymentID
		}
		total = rowTotalCount
		bookings = append(bookings, booking)
	}

	if err := rows.Err(); err != nil {
		logger.Log.Error("Admin bookings query error", zap.Error(err))
		response.AppErr(w, apperror.DatabaseError("fetch admin bookings", err))
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"bookings": bookings,
		"total":    total,
		"page":     page,
		"per_page": perPage,
	}, "Admin bookings fetched")
}
