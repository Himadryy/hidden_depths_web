-- Migration 000010: Index optimization
-- Removes duplicate indexes on bookings, adds missing FK index on session_history

-- Drop duplicate UNIQUE constraint (bookings_date_time_key already exists with same definition)
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS unique_booking;

-- idx_bookings_date is subset of idx_bookings_date_time_status (date vs date,time,status)
DROP INDEX IF EXISTS public.idx_bookings_date;

-- idx_bookings_stale_pending is duplicate of idx_bookings_pending_cleanup (both: created_at WHERE pending)
DROP INDEX IF EXISTS public.idx_bookings_stale_pending;

-- idx_bookings_user and idx_bookings_user_id are covered by idx_bookings_user_history
DROP INDEX IF EXISTS public.idx_bookings_user;
DROP INDEX IF EXISTS public.idx_bookings_user_id;

-- Add missing FK index for session_history.booking_id
CREATE INDEX IF NOT EXISTS idx_session_history_booking_id 
ON public.session_history (booking_id);
