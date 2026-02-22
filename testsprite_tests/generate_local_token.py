
import jwt
import datetime
import os

# Read JWT_SECRET from environment or use a default for testing if safe
JWT_SECRET = os.getenv("JWT_SECRET", "YOUR_JWT_SECRET_HERE")

def generate_token():
    if JWT_SECRET == "YOUR_JWT_SECRET_HERE":
        print("❌  Please set JWT_SECRET environment variable or edit this file.")
        return None

    payload = {
        "sub": "6b658fa1-045c-4c78-b62f-ebe18dd72da4", # Real User ID from Supabase
        "email": "test@example.com",
        "role": "authenticated",
        "aud": "authenticated",
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24),
        "iat": datetime.datetime.utcnow()
    }
    
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    return token

if __name__ == "__main__":
    token = generate_token()
    if token:
        print(token)
