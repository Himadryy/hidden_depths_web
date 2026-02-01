DROP INDEX IF EXISTS idx_bookings_reminder;
ALTER TABLE bookings DROP COLUMN IF EXISTS reminder_sent;
