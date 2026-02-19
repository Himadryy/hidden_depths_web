-- Disable RLS on all tables
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE insights DISABLE ROW LEVEL SECURITY;
ALTER TABLE coupons DISABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_uses DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- Drop Policies
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Public can view insights" ON insights;
DROP POLICY IF EXISTS "Users can view coupons" ON coupons;
DROP POLICY IF EXISTS "Users can view own coupon usage" ON coupon_uses;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
