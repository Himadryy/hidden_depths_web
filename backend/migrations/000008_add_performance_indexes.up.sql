-- Performance indexes for production reliability
-- Addresses slow slot availability queries and booking operations

-- 1. Composite index for the main slot availability query
-- Covers: SELECT time FROM bookings WHERE date = $1 AND (payment_status = 'paid' OR (payment_status = 'pending' AND created_at > ...))
CREATE INDEX IF NOT EXISTS idx_bookings_availability 
ON bookings(date, payment_status, created_at DESC);

-- 2. Partial index for paid bookings (aggregates and admin queries)
-- Covers: SELECT COUNT(*) FROM bookings WHERE payment_status = 'paid'
CREATE INDEX IF NOT EXISTS idx_bookings_paid 
ON bookings(payment_status) WHERE payment_status = 'paid';

-- 3. Index for abandoned booking cleanup scheduler
-- Covers: DELETE FROM bookings WHERE payment_status = 'pending' AND created_at < NOW() - INTERVAL '5 minutes'
CREATE INDEX IF NOT EXISTS idx_bookings_stale_pending 
ON bookings(created_at) WHERE payment_status = 'pending';

-- 4. Index for user booking history
-- Covers: SELECT * FROM bookings WHERE user_id = $1 ORDER BY date DESC
CREATE INDEX IF NOT EXISTS idx_bookings_user_history 
ON bookings(user_id, date DESC) WHERE user_id IS NOT NULL;
