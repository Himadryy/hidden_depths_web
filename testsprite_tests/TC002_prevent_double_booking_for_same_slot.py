import requests
import threading
from test_config import BASE_URL, HEADERS

BOOKING_ENDPOINT = f"{BASE_URL}/api/bookings"
TIMEOUT = 30

def create_booking(slot_payload, result_list, index):
    try:
        response = requests.post(BOOKING_ENDPOINT, json=slot_payload, headers=HEADERS, timeout=TIMEOUT)
        result_list[index] = response
    except Exception as e:
        result_list[index] = e

def test_prevent_double_booking_for_same_slot():
    booking_date = "2026-02-23"  # upcoming Sunday
    booking_time = "10:00"

    booking_payload = {
        "date": booking_date,
        "time": booking_time,
        "user_email": "testuser@example.com",
        "mentor_email": "mentor@example.com",
        "phone": "+1234567890",
        "notes": "Test booking for concurrency"
    }

    results = [None, None]

    thread1 = threading.Thread(target=create_booking, args=(booking_payload, results, 0))
    thread2 = threading.Thread(target=create_booking, args=(booking_payload, results, 1))

    thread1.start()
    thread2.start()
    thread1.join()
    thread2.join()

    success_responses = []
    error_responses = []

    for res in results:
        if isinstance(res, Exception):
            error_responses.append(res)
        else:
            if res.status_code == 201:
                success_responses.append(res)
            else:
                error_responses.append(res)

    assert len(success_responses) == 1, f"Expected exactly one successful booking, got {len(success_responses)}"
    assert len(error_responses) == 1, f"Expected one failed booking due to double-booking prevention, got {len(error_responses)}"

    try:
        booking_id_created = success_responses[0].json().get("id")
        if booking_id_created:
            delete_url = f"{BOOKING_ENDPOINT}/{booking_id_created}"
            del_resp = requests.delete(delete_url, headers=HEADERS, timeout=TIMEOUT)
            assert del_resp.status_code in (200, 204), "Cleanup delete failed"
    except Exception:
        pass

test_prevent_double_booking_for_same_slot()
