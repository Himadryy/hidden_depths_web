DROP INDEX IF EXISTS public.idx_processed_webhooks_processed_at;
DROP TABLE IF EXISTS public.processed_webhooks;

DROP INDEX IF EXISTS public.idx_bookings_order_status_created;
DROP INDEX IF EXISTS public.idx_bookings_active_slot_unique;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_payment_status_check
    CHECK (payment_status IN ('pending', 'paid', 'failed'));

ALTER TABLE public.bookings
    DROP COLUMN IF EXISTS status_reason,
    DROP COLUMN IF EXISTS confirmed_at,
    DROP COLUMN IF EXISTS failed_at,
    DROP COLUMN IF EXISTS cancelled_at,
    DROP COLUMN IF EXISTS released_at,
    DROP COLUMN IF EXISTS released_by;

-- Restores legacy uniqueness across every booking record.
ALTER TABLE public.bookings
    ADD CONSTRAINT unique_booking UNIQUE (date, time);
