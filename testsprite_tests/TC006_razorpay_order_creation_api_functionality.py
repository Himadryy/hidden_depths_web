import requests
import datetime
import random
from test_config import BASE_URL, HEADERS

def test_razorpay_order_creation():
    print("🚀 TC006: Verifying Razorpay Order Response Structure...")
    
    # Use a future date (Paid Session)
    today = datetime.date.today()
    days_ahead = (6 - today.weekday()) % 7 # Next Sunday
    if days_ahead == 0: days_ahead = 7
    booking_date = (today + datetime.timedelta(days=days_ahead)).isoformat()
    
    random_minute = random.randint(10, 59)
    booking_time = f"09:{random_minute} PM"
    
    payload = {
        "date": booking_date,
        "time": booking_time,
        "name": "Order Tester",
        "email": "order@example.com",
        "user_id": "6b658fa1-045c-4c78-b62f-ebe18dd72da4"
    }

    print(f"   Step 1: Creating paid booking for {booking_date}...")
    resp = requests.post(f"{BASE_URL}/api/bookings", json=payload, headers=HEADERS)
    
    if resp.status_code == 200:
        data = resp.json().get("data", {})
        print(f"   ✅ Response Received: {data}")
        
        # Verify Critical Payment Fields
        assert "order_id" in data, "Missing 'order_id'"
        assert "amount" in data, "Missing 'amount'"
        assert "currency" in data, "Missing 'currency'"
        assert "key_id" in data, "Missing 'key_id'"
        
        # Verify Values
        assert data["amount"] == 9900, f"Expected amount 9900 (99 INR), got {data['amount']}"
        assert data["currency"] == "INR", f"Expected currency INR, got {data['currency']}"
        assert data["key_id"].startswith("rzp_"), "Invalid Key ID format"
        assert data["order_id"].startswith("order_"), "Invalid Order ID format"
        
        booking_id = data.get("booking_id")
        
        # Cleanup
        if booking_id:
            requests.delete(f"{BASE_URL}/api/bookings/{booking_id}", headers=HEADERS)
            print("   ✅ Cleanup Successful.")
            
    else:
        print(f"❌  Failed: Expected 200, got {resp.status_code}. Body: {resp.text}")
        return

    print("\n✅ TC006 PASSED.")

if __name__ == "__main__":
    test_razorpay_order_creation()
