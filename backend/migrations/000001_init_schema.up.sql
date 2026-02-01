-- Users table is managed by Supabase Auth (auth.users), but we reference it.
-- We do NOT create it here.

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- References auth.users
    date TEXT NOT NULL,    -- YYYY-MM-DD
    time TEXT NOT NULL,    -- 12:00 PM
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(date, time)
);

-- Insights Table (CMS)
CREATE TABLE IF NOT EXISTS insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);
