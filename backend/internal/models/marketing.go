package models

import (
	"time"
)

type Coupon struct {
	ID            string     `json:"id"`
	Code          string     `json:"code"`
	Description   string     `json:"description"`
	DiscountType  string     `json:"discount_type"` // 'percentage', 'fixed'
	DiscountValue float64    `json:"discount_value"`
	MaxUses       *int       `json:"max_uses"`
	UsesCount     int        `json:"uses_count"`
	ValidUntil    *time.Time `json:"valid_until"`
	IsActive      bool       `json:"is_active"`
}

type Subscription struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	PlanName  string    `json:"plan_name"`
	Status    string    `json:"status"`
	PricePaid float64   `json:"price_paid"`
	StartsAt  time.Time `json:"starts_at"`
	ExpiresAt time.Time `json:"expires_at"`
}
