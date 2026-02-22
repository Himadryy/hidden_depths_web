import requests
from test_config import BASE_URL, HEADERS

def test_razorpay_order_creation_api_functionality():
    url = f"{BASE_URL}/api/payments/order"

    payload = {
        "amount": 50000,         # in paise → ₹500.00
        "currency": "INR",
        "receipt": "order_rcptid_11",
        "payment_capture": 1
    }

    try:
        response = requests.post(url, json=payload, headers=HEADERS, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code in (200, 201), \
        f"Unexpected status code: {response.status_code}, response: {response.text}"

    try:
        resp_json = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    for key in ["id", "amount", "currency", "receipt", "status"]:
        assert key in resp_json, f"Key '{key}' missing in response"

    assert resp_json["amount"] == payload["amount"], \
        f"Amount mismatch: expected {payload['amount']} got {resp_json['amount']}"
    assert resp_json["currency"] == payload["currency"], \
        f"Currency mismatch: expected {payload['currency']} got {resp_json['currency']}"
    assert resp_json["receipt"] == payload["receipt"], \
        f"Receipt mismatch: expected {payload['receipt']} got {resp_json['receipt']}"
    assert resp_json["status"] in ("created", "attempted", "paid", ""), \
        f"Unexpected status value: {resp_json['status']}"
    assert isinstance(resp_json["id"], str) and resp_json["id"].strip() != "", \
        "Order id is empty or not a string"

test_razorpay_order_creation_api_functionality()
