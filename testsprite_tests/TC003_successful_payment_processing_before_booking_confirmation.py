import requests
import hmac
import hashlib
import os
import random
import datetime
from test_config import BASE_URL, HEADERS

# Read RAZORPAY_KEY_SECRET from backend/.env
RAZORPAY_KEY_SECRET = ""
try:
    with open("backend/.env", "r") as f:
        for line in f:
            if line.startswith("RAZORPAY_KEY_SECRET="):
                RAZORPAY_KEY_SECRET = line.strip().split("=", 1)[1].strip('"')
                break
except FileNotFoundError:
    print("⚠️  backend/.env not found! Cannot verify signature locally.")

if not RAZORPAY_KEY_SECRET:
    # Fallback or error
    print("⚠️  RAZORPAY_KEY_SECRET not found. Test might fail on verification step.")

def generate_signature(order_id, payment_id):
    """Generates a valid Razorpay signature for testing."""
    data = f"{order_id}|{payment_id}"
    return hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        data.encode(),
        hashlib.sha256
    ).hexdigest()

def test_successful_payment_processing():
    print("🚀 TC003: Testing Full Payment Flow...")
    
    # 1. Create Booking (Initiate)
    # ---------------------------------------------------
    # Use a future date (Sunday/Monday)
    today = datetime.date.today()
    days_ahead = (6 - today.weekday()) % 7 # Next Sunday
    if days_ahead == 0: days_ahead = 7 # Always pick next week to be safe
    booking_date = (today + datetime.timedelta(days=days_ahead)).isoformat()
    
    random_minute = random.randint(10, 59)
    booking_time = f"10:{random_minute} PM"
    
    payload = {
        "date": booking_date,
        "time": booking_time,
        "name": "Payment Tester",
        "email": "payment@example.com",
        "user_id": "6b658fa1-045c-4c78-b62f-ebe18dd72da4"
    }
    
    print(f"   Step 1: Creating booking for {booking_date} at {booking_time}...")
    resp = requests.post(f"{BASE_URL}/api/bookings", json=payload, headers=HEADERS)
    
    if resp.status_code != 200:
        print(f"❌  Step 1 Failed: Expected 200, got {resp.status_code}. Body: {resp.text}")
        return

    data = resp.json().get("data", {})
    booking_id = data.get("booking_id")
    order_id = data.get("order_id")
    
    if not booking_id or not order_id:
        print(f"❌  Step 1 Failed: Missing booking_id or order_id. Data: {data}")
        return
        
    print(f"   ✅ Booking Created! ID: {booking_id}, Order ID: {order_id}")

    # 2. Verify Payment (Confirm)
    # ---------------------------------------------------
    print(f"   Step 2: Verifying Payment...")
    
    payment_id = f"pay_Test{random.randint(1000,9999)}"
    signature = generate_signature(order_id, payment_id)
    
    verify_payload = {
        "booking_id": booking_id,
        "razorpay_payment_id": payment_id,
        "razorpay_order_id": order_id,
        "razorpay_signature": signature
    }
    
    verify_resp = requests.post(f"{BASE_URL}/api/bookings/verify", json=verify_payload, headers=HEADERS)
    
    if verify_resp.status_code == 200:
        print("   ✅ Payment Verified Successfully!")
    else:
        print(f"❌  Step 2 Failed: Expected 200, got {verify_resp.status_code}. Body: {verify_resp.text}")
        # Try to cleanup anyway
        requests.delete(f"{BASE_URL}/api/bookings/{booking_id}", headers=HEADERS)
        return

    # 3. Cleanup
    # ---------------------------------------------------
    print("   Step 3: Cleaning up...")
    del_resp = requests.delete(f"{BASE_URL}/api/bookings/{booking_id}", headers=HEADERS)
    if del_resp.status_code == 200:
        print("   ✅ Cleanup Successful.")
    else:
        print(f"⚠️  Cleanup Failed: {del_resp.status_code}")

    print("\n✅ TC003 PASSED.")

if __name__ == "__main__":
    test_successful_payment_processing()
