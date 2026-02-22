import requests
import jwt
import datetime
import os
from test_config import BASE_URL

# Helper to generate tokens
JWT_SECRET = ""
try:
    with open("backend/.env", "r") as f:
        for line in f:
            if line.startswith("JWT_SECRET="):
                JWT_SECRET = line.strip().split("=", 1)[1].strip('"')
                break
except: pass

if not JWT_SECRET:
    print("⚠️  JWT_SECRET missing. Cannot generate admin token.")

def generate_token(email, role="authenticated"):
    payload = {
        "sub": "6b658fa1-045c-4c78-b62f-ebe18dd72da4",
        "email": email,
        "role": role,
        "aud": "authenticated",
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1),
        "iat": datetime.datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def test_jwt_auth_for_admin_routes():
    print("🚀 TC005: Testing Admin Route Protection...")
    
    if not JWT_SECRET:
        print("❌  Skipping due to missing JWT_SECRET.")
        return

    # 1. Test with Normal User Token
    user_token = generate_token("test@example.com")
    headers_user = {"Authorization": f"Bearer {user_token}"}
    
    print("   Step 1: Accessing /api/admin/stats as Normal User...")
    resp = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers_user)
    
    if resp.status_code in [401, 403]:
        print(f"   ✅ Correctly denied access (Status {resp.status_code}).")
    else:
        print(f"❌  Failed: Normal user got {resp.status_code}. Expected 401/403.")
        return

    # 2. Test with Admin Token
    admin_token = generate_token("hiddendepthsss@gmail.com") # Must match .env
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    
    print("   Step 2: Accessing /api/admin/stats as Admin...")
    resp_admin = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers_admin)
    
    if resp_admin.status_code == 200:
        print("   ✅ Admin access granted (Status 200).")
        print(f"      Stats: {resp_admin.json()}")
    else:
        print(f"❌  Failed: Admin user got {resp_admin.status_code}. Expected 200. Body: {resp_admin.text}")
        return

    print("\n✅ TC005 PASSED.")

if __name__ == "__main__":
    test_jwt_auth_for_admin_routes()
