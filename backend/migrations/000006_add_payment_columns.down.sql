ALTER TABLE bookings DROP COLUMN IF EXISTS payment_status;
ALTER TABLE bookings DROP COLUMN IF EXISTS razorpay_order_id;
ALTER TABLE bookings DROP COLUMN IF EXISTS razorpay_payment_id;
ALTER TABLE bookings DROP COLUMN IF EXISTS amount;
