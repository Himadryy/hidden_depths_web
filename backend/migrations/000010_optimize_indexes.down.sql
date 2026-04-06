-- Rollback 000010: Restore dropped indexes, remove added index

-- Restore dropped constraint
ALTER TABLE public.bookings ADD CONSTRAINT unique_booking UNIQUE (date, time);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings (date);
CREATE INDEX IF NOT EXISTS idx_bookings_stale_pending ON public.bookings (created_at) WHERE payment_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings (user_id) WHERE user_id IS NOT NULL;

-- Drop added index
DROP INDEX IF EXISTS public.idx_session_history_booking_id;
