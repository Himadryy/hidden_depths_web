-- Booking lifecycle hardening:
-- 1) Persist webhook idempotency
-- 2) Preserve booking state transitions without destructive deletes
-- 3) Restrict unique slot lock to active states only (pending/paid)

ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS status_reason TEXT,
    ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS released_by UUID;

UPDATE public.bookings
SET confirmed_at = COALESCE(confirmed_at, created_at)
WHERE payment_status = 'paid' AND confirmed_at IS NULL;

UPDATE public.bookings
SET failed_at = COALESCE(failed_at, created_at),
    released_at = COALESCE(released_at, created_at),
    status_reason = COALESCE(status_reason, 'payment_failed')
WHERE payment_status = 'failed';

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_payment_status_check
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled'));

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_date_time_key;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS unique_booking;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_active_slot_unique
ON public.bookings (date, time)
WHERE payment_status IN ('pending', 'paid');

CREATE INDEX IF NOT EXISTS idx_bookings_order_status_created
ON public.bookings (razorpay_order_id, payment_status, created_at DESC)
WHERE razorpay_order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.processed_webhooks (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    order_id TEXT,
    payment_id TEXT,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_processed_webhooks_processed_at
ON public.processed_webhooks (processed_at DESC);
