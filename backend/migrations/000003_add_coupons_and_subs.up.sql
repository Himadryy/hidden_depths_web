-- Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed'
    discount_value DECIMAL(10,2) NOT NULL,
    max_uses INT DEFAULT NULL,
    uses_count INT DEFAULT 0,
    valid_until TIMESTAMPTZ DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Coupon Usage Tracking
CREATE TABLE IF NOT EXISTS coupon_uses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
    user_id UUID, -- References Supabase Auth ID
    booking_id UUID,
    discount_applied DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Mentorship Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- References Supabase Auth ID
    plan_name VARCHAR(100) NOT NULL, -- e.g., 'Deep Thinker'
    status VARCHAR(20) DEFAULT 'active', -- active, cancelled, expired
    price_paid DECIMAL(10,2),
    starts_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed an initial discount code
INSERT INTO coupons (code, description, discount_type, discount_value, max_uses)
VALUES ('WELCOME50', '50% off for first-time users', 'percentage', 50.00, 100);
