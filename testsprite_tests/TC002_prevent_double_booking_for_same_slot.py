import requests
import threading
import random
from test_config import BASE_URL, HEADERS

BOOKING_ENDPOINT = f"{BASE_URL}/api/bookings"
TIMEOUT = 30

def create_booking(payload, results, index):
    try:
        response = requests.post(BOOKING_ENDPOINT, json=payload, headers=HEADERS, timeout=TIMEOUT)
        results[index] = response
    except Exception as e:
        results[index] = e

def cleanup_booking(booking_id):
    if booking_id:
        try:
            del_url = f"{BOOKING_ENDPOINT}/{booking_id}"
            requests.delete(del_url, headers=HEADERS, timeout=TIMEOUT)
            print(f"🧹 Cleaned up booking {booking_id}")
        except Exception as e:
            print(f"⚠️ Cleanup failed: {e}")

def test_prevent_double_booking_for_same_slot():
    # Use a Monday (2026-02-23 is Monday)
    booking_date = "2026-02-23" 
    
    # Generate random time to avoid conflicts with previous runs
    random_minute = random.randint(10, 59)
    booking_time = f"09:{random_minute} PM"
    
    # Valid Payload matching backend struct
    payload = {
        "date": booking_date,
        "time": booking_time,
        "name": "Concurrent Tester",
        "email": "concurrent@example.com",
        "user_id": "6b658fa1-045c-4c78-b62f-ebe18dd72da4" # Valid User ID
    }

    print(f"🚀 Testing Double Booking for {booking_date} at {booking_time}...")
    
    results = [None, None]
    
    # Simulate 2 simultaneous requests
    t1 = threading.Thread(target=create_booking, args=(payload, results, 0))
    t2 = threading.Thread(target=create_booking, args=(payload, results, 1))

    t1.start()
    t2.start()
    t1.join()
    t2.join()

    success_count = 0
    fail_count = 0
    created_booking_id = None

    for i, res in enumerate(results):
        if isinstance(res, Exception):
            print(f"❌ Request {i+1} Exception: {res}")
            fail_count += 1
        else:
            print(f"📝 Request {i+1} Status: {res.status_code}")
            if res.status_code in [200, 201]:
                success_count += 1
                try:
                    # Handle both response formats
                    data = res.json().get("data", {}) if "data" in res.json() else res.json()
                    created_booking_id = data.get("booking_id") or data.get("id")
                except:
                    pass
            elif res.status_code == 409:
                fail_count += 1
            else:
                print(f"⚠️ Unexpected status: {res.status_code} Body: {res.text}")
                fail_count += 1

    # Cleanup immediately
    if created_booking_id:
        cleanup_booking(created_booking_id)

    # Assertions
    if success_count == 1 and fail_count == 1:
        print("✅ TC002 PASSED: Exactly one booking succeeded, one failed.")
    elif success_count == 0:
        raise AssertionError("❌ TC002 FAILED: Both requests failed (maybe slot already taken?).")
    elif success_count == 2:
        raise AssertionError("❌ TC002 FAILED: Race condition! Both bookings succeeded (Double Booking occurred).")
    else:
        raise AssertionError(f"❌ TC002 FAILED: Unexpected outcome. Success: {success_count}, Fail: {fail_count}")

if __name__ == "__main__":
    test_prevent_double_booking_for_same_slot()
