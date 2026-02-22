"""
=============================================================
 refresh_token.py  —  Auto-fetch a fresh Supabase JWT token
=============================================================
 Usage:
     python3 testsprite_tests/refresh_token.py
 
 It will:
   1. Ask for your Supabase password (himadrydey007@gmail.com)
   2. Call the Supabase signInWithPassword API
   3. Write the fresh access_token into test_config.py
=============================================================
"""

import requests, json, os, getpass, re, sys

SUPABASE_URL   = "https://msriduejyxcdpvcawacj.supabase.co"
SUPABASE_ANON  = ("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6"
                  "Im1zcmlkdWVqeXhjZHB2Y2F3YWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMjg1"
                  "MzcsImV4cCI6MjA4NDgwNDUzN30.0ISyTWngMwf0MzOSAT8TH1sUvfLRXjPCHn8qcgvB1nM")
EMAIL          = "himadrydey007@gmail.com"
CONFIG_FILE    = os.path.join(os.path.dirname(__file__), "test_config.py")


def fetch_fresh_token(password: str) -> str:
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": SUPABASE_ANON,
        "Content-Type": "application/json"
    }
    payload = {"email": EMAIL, "password": password}
    resp = requests.post(url, json=payload, headers=headers, timeout=15)
    if resp.status_code != 200:
        print(f"\n❌  Login failed (HTTP {resp.status_code}): {resp.text}")
        sys.exit(1)
    data = resp.json()
    token = data.get("access_token")
    if not token:
        print(f"\n❌  No access_token in response: {data}")
        sys.exit(1)
    return token


def update_config(token: str):
    with open(CONFIG_FILE, "r") as f:
        content = f.read()

    # Replace the token line
    new_content = re.sub(
        r'AUTH_TOKEN = ".*?"',
        f'AUTH_TOKEN = "{token}"',
        content,
        flags=re.DOTALL
    )

    if new_content == content:
        print("⚠️  Could not find AUTH_TOKEN line to replace. Check test_config.py manually.")
        sys.exit(1)

    with open(CONFIG_FILE, "w") as f:
        f.write(new_content)

    print(f"\n✅  test_config.py updated with a fresh token!")
    print(f"    You can now re-run all 6 tests.\n")


if __name__ == "__main__":
    print("=" * 55)
    print("  HiddenDepths Test Token Refresher")
    print("=" * 55)
    print(f"  Supabase account: {EMAIL}")
    print()
    
    if len(sys.argv) > 1:
        password = sys.argv[1]
        print("  Using password from command line argument.")
    else:
        password = getpass.getpass("  Enter your Supabase password: ")

    print("\n  Fetching fresh token from Supabase...")
    token = fetch_fresh_token(password)
    update_config(token)
