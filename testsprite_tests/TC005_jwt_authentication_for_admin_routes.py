import requests
from test_config import BASE_URL, AUTH_TOKEN

ADMIN_ENDPOINTS = {
    "/api/admin/bookings": "GET",
    "/api/admin/bookings/status": "POST",
    "/api/admin/bookings/meeting-link": "POST",
    "/api/admin/analytics": "GET",
    "/api/admin/users": "GET",
    "/api/admin/settings": "GET"
}

def test_jwt_authentication_for_admin_routes():
    headers_with_token = {
        "Authorization": f"Bearer {AUTH_TOKEN}",
        "Accept": "application/json"
    }
    headers_without_token = {"Accept": "application/json"}

    for endpoint, method in ADMIN_ENDPOINTS.items():
        url = BASE_URL + endpoint

        # ── Test 1: No token → must return 401 or 403 ──────────────────────
        try:
            if method == "GET":
                response = requests.get(url, headers=headers_without_token, timeout=30)
            else:
                response = requests.post(url, headers={**headers_without_token, "Content-Type": "application/json"}, json={}, timeout=30)
            assert response.status_code in (401, 403), \
                f"Expected 401/403 for no token on {endpoint}, got {response.status_code}"
        except requests.exceptions.RequestException as e:
            assert False, f"Request failed for {endpoint} without token: {e}"

        # ── Test 2: Invalid token → must return 401 or 403 ─────────────────
        invalid_headers = {"Authorization": "Bearer invalid.token.string", "Accept": "application/json"}
        try:
            if method == "GET":
                response = requests.get(url, headers=invalid_headers, timeout=30)
            else:
                response = requests.post(url, headers={**invalid_headers, "Content-Type": "application/json"}, json={}, timeout=30)
            assert response.status_code in (401, 403), \
                f"Expected 401/403 for invalid token on {endpoint}, got {response.status_code}"
        except requests.exceptions.RequestException as e:
            assert False, f"Request failed for {endpoint} with invalid token: {e}"

        # ── Test 3: Valid admin token → must return 200 ─────────────────────
        try:
            if method == "GET":
                response = requests.get(url, headers=headers_with_token, timeout=30)
            else:
                response = requests.post(url, headers={**headers_with_token, "Content-Type": "application/json"}, json={}, timeout=30)
            assert response.status_code == 200, \
                f"Expected 200 for valid token on {endpoint}, got {response.status_code}"
        except requests.exceptions.RequestException as e:
            assert False, f"Request failed for {endpoint} with valid token: {e}"

test_jwt_authentication_for_admin_routes()
