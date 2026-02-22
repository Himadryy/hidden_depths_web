import requests
from datetime import datetime, timedelta
from test_config import BASE_URL, HEADERS

TIMEOUT = 30

def next_weekday(d, weekday):
    days_ahead = weekday - d.weekday()
    if days_ahead <= 0:
        days_ahead += 7
    return d + timedelta(days_ahead)

def test_successful_payment_processing_before_booking_confirmation():
    today = datetime.now()
    next_sunday = next_weekday(today, 6)
    next_monday = next_weekday(today, 0)

    if (next_sunday - today) < (next_monday - today):
        booking_date = next_sunday.date().isoformat()
    else:
        booking_date = next_monday.date().isoformat()

    booking_payload = {
        "date": booking_date,
        "slot": "10:00-11:00",
        "user_email": "himadrydey09@gmail.com",
        "payment_order_id": "dummy_order_id",
        "payment_signature": "dummy_signature",
        "payment_id": "dummy_payment_id"
    }

    booking_id = None
    try:
        booking_response = requests.post(
            f"{BASE_URL}/api/bookings",
            headers=HEADERS,
            json=booking_payload,
            timeout=TIMEOUT,
        )
        booking_response.raise_for_status()
        assert booking_response.status_code == 201, f"Expected 201 Created, got {booking_response.status_code}"
        booking_resp_json = booking_response.json()
        assert "id" in booking_resp_json and booking_resp_json["id"], "Booking ID missing in response"
        booking_id = booking_resp_json["id"]
    except requests.RequestException as e:
        assert False, f"Booking creation failed: {e}"
    finally:
        if booking_id:
            try:
                del_response = requests.delete(
                    f"{BASE_URL}/api/bookings/{booking_id}",
                    headers=HEADERS,
                    timeout=TIMEOUT,
                )
                if del_response.status_code not in (200, 204):
                    print(f"Warning: failed to delete booking id {booking_id}, status {del_response.status_code}")
            except Exception as ex:
                print(f"Warning: exception during booking cleanup: {ex}")

test_successful_payment_processing_before_booking_confirmation()
