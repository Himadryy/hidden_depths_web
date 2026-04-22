-- Migration 000012: reconcile processed_webhooks schema drift after 000011.
-- Some environments had a legacy processed_webhooks table before 000011.
-- 000011 uses CREATE TABLE IF NOT EXISTS, so legacy shape could persist.

CREATE TABLE IF NOT EXISTS public.processed_webhooks (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    order_id TEXT,
    payment_id TEXT,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.processed_webhooks
    ADD COLUMN IF NOT EXISTS event_id TEXT,
    ADD COLUMN IF NOT EXISTS event_type TEXT,
    ADD COLUMN IF NOT EXISTS order_id TEXT,
    ADD COLUMN IF NOT EXISTS payment_id TEXT,
    ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ DEFAULT now();

-- Backfill order_id / payment_id / event_type from legacy payload when available.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'processed_webhooks'
          AND column_name = 'payload'
    ) THEN
        EXECUTE $sql$
            UPDATE public.processed_webhooks
            SET order_id = COALESCE(
                    NULLIF(order_id, ''),
                    NULLIF(payload ->> 'order_id', ''),
                    NULLIF(payload #>> '{payment,entity,order_id}', '')
                ),
                payment_id = COALESCE(
                    NULLIF(payment_id, ''),
                    NULLIF(payload ->> 'payment_id', ''),
                    NULLIF(payload #>> '{payment,entity,id}', '')
                ),
                event_type = COALESCE(
                    NULLIF(event_type, ''),
                    NULLIF(payload ->> 'event', '')
                )
            WHERE payload IS NOT NULL
        $sql$;
    END IF;
END $$;

-- Prefer stable legacy UUID as event_id where legacy id exists.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'processed_webhooks'
          AND column_name = 'id'
    ) THEN
        EXECUTE $sql$
            UPDATE public.processed_webhooks
            SET event_id = COALESCE(NULLIF(event_id, ''), 'legacy:id:' || id::text)
            WHERE event_id IS NULL OR btrim(event_id) = ''
        $sql$;
    END IF;
END $$;

-- Backfill event_id from legacy payload if still missing.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'processed_webhooks'
          AND column_name = 'payload'
    ) THEN
        EXECUTE $sql$
            UPDATE public.processed_webhooks
            SET event_id = COALESCE(
                    NULLIF(event_id, ''),
                    NULLIF(payload ->> 'id', ''),
                    NULLIF(payload #>> '{payment,entity,id}', ''),
                    NULLIF(payload #>> '{entity,id}', '')
                )
            WHERE event_id IS NULL OR btrim(event_id) = ''
        $sql$;
    END IF;
END $$;

-- Final backfill fallbacks to satisfy NOT NULL + uniqueness constraints.
UPDATE public.processed_webhooks
SET event_id = 'legacy:ctid:' || ctid::text
WHERE event_id IS NULL OR btrim(event_id) = '';

UPDATE public.processed_webhooks
SET event_type = 'unknown_legacy'
WHERE event_type IS NULL OR btrim(event_type) = '';

UPDATE public.processed_webhooks
SET processed_at = now()
WHERE processed_at IS NULL;

-- Keep most recent row for duplicated event_id values before adding PK(event_id).
WITH ranked AS (
    SELECT ctid,
           ROW_NUMBER() OVER (
               PARTITION BY event_id
               ORDER BY processed_at DESC NULLS LAST, ctid DESC
           ) AS rn
    FROM public.processed_webhooks
)
DELETE FROM public.processed_webhooks p
USING ranked r
WHERE p.ctid = r.ctid
  AND r.rn > 1;

ALTER TABLE public.processed_webhooks DROP CONSTRAINT IF EXISTS processed_webhooks_pkey;
ALTER TABLE public.processed_webhooks DROP CONSTRAINT IF EXISTS processed_webhooks_event_id_key;

DROP INDEX IF EXISTS public.processed_webhooks_event_id_key;
DROP INDEX IF EXISTS public.idx_processed_webhooks_event_id;
DROP INDEX IF EXISTS public.idx_processed_webhooks_event;

ALTER TABLE public.processed_webhooks
    ALTER COLUMN event_id SET NOT NULL,
    ALTER COLUMN event_type SET NOT NULL,
    ALTER COLUMN processed_at SET NOT NULL,
    ALTER COLUMN processed_at SET DEFAULT now();

ALTER TABLE public.processed_webhooks
    ADD CONSTRAINT processed_webhooks_pkey PRIMARY KEY (event_id);

CREATE INDEX IF NOT EXISTS idx_processed_webhooks_processed_at
ON public.processed_webhooks (processed_at DESC);
