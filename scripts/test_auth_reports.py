import asyncio
import sys
import httpx
import jwt
from datetime import datetime, timezone, timedelta
from intervia.core.config import get_settings

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

settings = get_settings()

def make_token(role="INTERVIEWER"):
    payload = {
        "sub": "00000000-0000-0000-0000-000000000001",
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=1)
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

async def test_auth_reports():
    token = make_token("INTERVIEWER")
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000", timeout=30.0) as client:
        print("1. Fetching Student Report with JWT...")
        s_res = await client.get("/v1/reports/IV-2048/student", headers=headers)
        print(f"   Status: {s_res.status_code}")
        if s_res.status_code == 200:
            print(f"   Strengths ({len(s_res.json().get('strengths', []))} items): {s_res.json().get('strengths')[:2]}")

        print("\n2. Fetching Executive Report with JWT...")
        e_res = await client.get("/v1/reports/IV-2048/executive", headers=headers)
        print(f"   Status: {e_res.status_code}")
        if e_res.status_code == 200:
            print(f"   Hiring Recommendation: {e_res.json().get('hiring_recommendation')}")
            print(f"   Composite Score: {e_res.json().get('composite_score')}")

        print("\n3. Downloading PDF with JWT...")
        pdf_res = await client.get("/v1/reports/IV-2048/download-pdf", headers=headers)
        print(f"   Status: {pdf_res.status_code}, Length: {len(pdf_res.content)} bytes")

asyncio.run(test_auth_reports())
