-- Enable RLS on all tables
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Bookings Policies
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
CREATE POLICY "Users can view own bookings" ON bookings
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;
CREATE POLICY "Users can update own bookings" ON bookings
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 2. Insights Policies
DROP POLICY IF EXISTS "Public can view insights" ON insights;
CREATE POLICY "Public can view insights" ON insights
    FOR SELECT TO anon, authenticated
    USING (true);

-- 3. Coupons Policies
DROP POLICY IF EXISTS "Users can view coupons" ON coupons;
CREATE POLICY "Users can view coupons" ON coupons
    FOR SELECT TO authenticated
    USING (is_active = true);

-- 4. Coupon Uses Policies
DROP POLICY IF EXISTS "Users can view own coupon usage" ON coupon_uses;
CREATE POLICY "Users can view own coupon usage" ON coupon_uses
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- 5. Subscriptions Policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- 6. Audit Logs Policies
-- NO ONE can view audit logs via API (Admin dashboard uses Go backend as superuser)
-- We leave it enabled but with no policies, which defaults to denying all access.
