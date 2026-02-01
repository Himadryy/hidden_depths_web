ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_bookings_reminder ON bookings(date, reminder_sent);
