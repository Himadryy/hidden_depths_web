-- Rollback: Remove performance indexes
DROP INDEX IF EXISTS idx_bookings_availability;
DROP INDEX IF EXISTS idx_bookings_paid;
DROP INDEX IF EXISTS idx_bookings_stale_pending;
DROP INDEX IF EXISTS idx_bookings_user_history;
