"""
=============================================================
 HiddenDepths Test Configuration — SINGLE SOURCE OF TRUTH
=============================================================
 All 6 test files import AUTH_TOKEN from here.
 When your token expires, run:
     python3 refresh_token.py
 That will auto-update this file with a fresh token.
=============================================================
"""

import base64, json, time

BASE_URL = "http://localhost:8081"

# ─── PASTE YOUR FRESH TOKEN HERE (or run refresh_token.py) ───────────────────
AUTH_TOKEN = "PASTE_YOUR_FRESH_SUPABASE_TOKEN_HERE"
# ─────────────────────────────────────────────────────────────────────────────

HEADERS = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

# ── Runtime token expiry check ────────────────────────────────────────────────
def _check_token():
    if AUTH_TOKEN == "PASTE_YOUR_FRESH_SUPABASE_TOKEN_HERE":
        raise RuntimeError(
            "\n\n❌  AUTH_TOKEN not set!\n"
            "   Run:  python3 testsprite_tests/refresh_token.py\n"
            "   Then re-run your tests.\n"
        )
    try:
        payload = AUTH_TOKEN.split(".")[1]
        payload += "=" * (4 - len(payload) % 4)
        data = json.loads(base64.b64decode(payload))
        exp = data.get("exp", 0)
        now = time.time()
        if now > exp:
            expired_ago = int((now - exp) / 3600)
            raise RuntimeError(
                f"\n\n❌  JWT TOKEN IS EXPIRED (expired {expired_ago} hours ago)!\n"
                f"   Run:  python3 testsprite_tests/refresh_token.py\n"
                f"   Then re-run your tests.\n"
            )
        remaining = int((exp - now) / 60)
        print(f"✅  Token valid — expires in {remaining} minutes.")
    except RuntimeError:
        raise
    except Exception as e:
        print(f"⚠️  Could not decode token to check expiry: {e}")

_check_token()
