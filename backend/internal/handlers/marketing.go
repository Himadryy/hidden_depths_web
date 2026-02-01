package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/Himadryy/hidden-depths-backend/internal/database"
	"github.com/Himadryy/hidden-depths-backend/internal/models"
	"github.com/Himadryy/hidden-depths-backend/pkg/response"
	"github.com/go-chi/chi/v5"
)

// ValidateCoupon checks if a coupon code is valid and returns its details
func ValidateCoupon(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")
	if code == "" {
		response.Error(w, http.StatusBadRequest, "Coupon code is required")
		return
	}

	var c models.Coupon
	err := database.Pool.QueryRow(context.Background(),
		`SELECT id, code, discount_type, discount_value, max_uses, uses_count, valid_until, is_active 
		 FROM coupons WHERE code = $1`, code,
	).Scan(&c.ID, &c.Code, &c.DiscountType, &c.DiscountValue, &c.MaxUses, &c.UsesCount, &c.ValidUntil, &c.IsActive)

	if err != nil {
		response.Error(w, http.StatusNotFound, "Invalid coupon code")
		return
	}

	// Logic Checks
	if !c.IsActive {
		response.Error(w, http.StatusBadRequest, "This coupon is no longer active")
		return
	}

	if c.MaxUses != nil && c.UsesCount >= *c.MaxUses {
		response.Error(w, http.StatusBadRequest, "This coupon has reached its usage limit")
		return
	}

	if c.ValidUntil != nil && time.Now().After(*c.ValidUntil) {
		response.Error(w, http.StatusBadRequest, "This coupon has expired")
		return
	}

	response.JSON(w, http.StatusOK, c, "Coupon is valid")
}

// GetActiveSubscription checks if the user has an active mentorship plan
func GetActiveSubscription(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)

	var sub models.Subscription
	err := database.Pool.QueryRow(context.Background(),
		`SELECT id, plan_name, status, expires_at FROM subscriptions 
		 WHERE user_id = $1 AND status = 'active' AND expires_at > now() 
		 LIMIT 1`, userID,
	).Scan(&sub.ID, &sub.PlanName, &sub.Status, &sub.ExpiresAt)

	if err != nil {
		response.JSON(w, http.StatusOK, nil, "No active subscription found")
		return
	}

	response.JSON(w, http.StatusOK, sub, "Active subscription found")
}
