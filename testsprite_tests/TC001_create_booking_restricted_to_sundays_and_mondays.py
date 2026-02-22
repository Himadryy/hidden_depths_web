import requests
import random
from datetime import datetime, timedelta
from test_config import BASE_URL, HEADERS

def create_booking(date_iso):
    # Generate a random time to avoid conflicts with existing bookings from other users
    random_minute = random.randint(10, 59)
    time_str = f"08:{random_minute} PM"
    
    url = f"{BASE_URL}/api/bookings"
    payload = {
        "date": date_iso,
        "time": time_str,
        "name": "Test User",
        "email": "testuser@example.com",
        "user_id": "6b658fa1-045c-4c78-b62f-ebe18dd72da4"
    }
    response = requests.post(url, json=payload, headers=HEADERS, timeout=30)
    return response

def cleanup_user_bookings():
    """Fetches all bookings for the test user and deletes them to ensure a clean state."""
    print("🧹 Cleaning up stale bookings for test user...")
    try:
        url = f"{BASE_URL}/api/bookings/my"
        response = requests.get(url, headers=HEADERS, timeout=10)
        
        if response.status_code == 200:
            body = response.json()
            # The API wraps the list in 'data'
            bookings = body.get("data", [])
            if bookings is None: # Handle if data is explicitly null
                bookings = []
                
            print(f"   Found {len(bookings)} existing bookings to delete.")
            deleted_count = 0
            
            for b in bookings:
                bid = b.get("id")
                if bid:
                    del_url = f"{BASE_URL}/api/bookings/{bid}"
                    del_resp = requests.delete(del_url, headers=HEADERS, timeout=10)
                    if del_resp.status_code == 200:
                        deleted_count += 1
                    else:
                        print(f"   Failed to delete {bid}: {del_resp.status_code}")
                        
            print(f"   Deleted {deleted_count} stale bookings.")
        else:
            print(f"   Warning: Could not fetch user bookings (Status {response.status_code}). Body: {response.text}")
            
    except Exception as e:
        print(f"   Warning: Cleanup failed: {e}")

def test_create_booking_restricted_to_sundays_and_mondays():
    cleanup_user_bookings()
    
    base_date = datetime.utcnow()
    results = {}
    booked_ids = []

    try:
        for i in range(7):
            check_date = base_date + timedelta(days=i)
            date_iso = check_date.strftime("%Y-%m-%d")

            response = create_booking(date_iso)
            results[date_iso] = {
                "status_code": response.status_code,
                "response_body": response.json() if response.headers.get("Content-Type", "").startswith("application/json") else response.text
            }

            if response.status_code in [200, 201]:
                try:
                    booking_id = response.json().get("data", {}).get("booking_id")
                    if booking_id:
                        booked_ids.append(booking_id)
                except Exception:
                    pass
    finally:
        for bid in booked_ids:
            try:
                requests.delete(f"{BASE_URL}/api/bookings/{bid}", headers=HEADERS, timeout=30)
            except Exception:
                pass

    for i in range(7):
        test_date = (base_date + timedelta(days=i)).strftime("%Y-%m-%d")
        status = results[test_date]["status_code"]
        weekday = (base_date + timedelta(days=i)).weekday()

        if weekday in [0, 6]:  # Monday=0, Sunday=6
            assert status in [200, 201], f"Expected booking to succeed on {test_date} (weekday {weekday}), got status {status}. Body: {results[test_date]['response_body']}"
        else:
            assert status not in [200, 201] and 400 <= status < 500, f"Expected booking to be rejected on {test_date} (weekday {weekday}), got status {status}. Body: {results[test_date]['response_body']}"

test_create_booking_restricted_to_sundays_and_mondays()
