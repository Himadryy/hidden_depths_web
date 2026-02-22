import requests
import time
from datetime import datetime, timedelta
from test_config import BASE_URL, HEADERS

def next_sunday_or_monday():
    today = datetime.utcnow()
    for i in range(1, 15):
        day = today + timedelta(days=i)
        if day.weekday() in (6, 0):  # Sunday=6, Monday=0
            return day.strftime("%Y-%m-%d")
    return None

def test_automated_email_confirmation_after_successful_booking():
    booking_id = None
    booking_date = next_sunday_or_monday()
    assert booking_date is not None, "No upcoming Sunday or Monday found."

    booking_payload = {
        "date": booking_date,
        "time": "10:00",
        "user": {
            "name": "Test User",
            "email": "testuser@example.com"
        },
        "notes": "Automated test booking"
    }

    try:
        resp = requests.post(f"{BASE_URL}/api/bookings", json=booking_payload, headers=HEADERS, timeout=30)
        assert resp.status_code == 201, f"Expected 201 Created but got {resp.status_code}: {resp.text}"
        booking_info = resp.json()
        assert "id" in booking_info, "Booking creation response missing 'id'"
        booking_id = booking_info["id"]

        assert booking_info.get("payment_status") == "paid", "Booking payment not marked as paid."
        assert booking_info.get("status") == "confirmed", "Booking not confirmed after payment."

        email_confirmed = False
        for _ in range(6):
            time.sleep(5)
            get_resp = requests.get(f"{BASE_URL}/api/bookings/{booking_id}", headers=HEADERS, timeout=30)
            assert get_resp.status_code == 200, f"Failed to get booking details: {get_resp.text}"
            booking_detail = get_resp.json()
            if booking_detail.get("email_sent") is True:
                email_confirmed = True
                break
        assert email_confirmed, "Automated booking confirmation email was not sent via EmailJS after successful booking."

    finally:
        if booking_id:
            del_resp = requests.delete(f"{BASE_URL}/api/bookings/{booking_id}", headers=HEADERS, timeout=30)
            assert del_resp.status_code in (200, 204), f"Failed to delete booking after test: {del_resp.text}"

test_automated_email_confirmation_after_successful_booking()
