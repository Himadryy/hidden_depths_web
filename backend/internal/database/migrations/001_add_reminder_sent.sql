-- Add a flag to track email reminders
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Optional: Index for performance since we will query this often
CREATE INDEX IF NOT EXISTS idx_bookings_reminder ON bookings(date, reminder_sent);
