-- Rollback 000012: restore legacy-compatible processed_webhooks shape.

CREATE TABLE IF NOT EXISTS public.processed_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE,
    event_type TEXT NOT NULL,
    payload JSONB,
    processed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.processed_webhooks
    ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS payload JSONB;

UPDATE public.processed_webhooks
SET id = gen_random_uuid()
WHERE id IS NULL;

ALTER TABLE public.processed_webhooks DROP CONSTRAINT IF EXISTS processed_webhooks_pkey;

ALTER TABLE public.processed_webhooks
    ALTER COLUMN id SET NOT NULL;

ALTER TABLE public.processed_webhooks
    ADD CONSTRAINT processed_webhooks_pkey PRIMARY KEY (id);

CREATE UNIQUE INDEX IF NOT EXISTS processed_webhooks_event_id_key
ON public.processed_webhooks (event_id);

CREATE INDEX IF NOT EXISTS idx_processed_webhooks_event
ON public.processed_webhooks (event_type);

CREATE INDEX IF NOT EXISTS idx_processed_webhooks_event_id
ON public.processed_webhooks (event_id);

DROP INDEX IF EXISTS public.idx_processed_webhooks_processed_at;

ALTER TABLE public.processed_webhooks
    DROP COLUMN IF EXISTS order_id,
    DROP COLUMN IF EXISTS payment_id;
