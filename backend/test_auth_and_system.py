import asyncio
import os
import sys

sys.path.append(os.path.join(os.getcwd(), 'backend', 'src'))

from httpx import AsyncClient, ASGITransport
from intervia.main import app

async def run_tests():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Test 1: Register Recruiter with company_name and without terms_accepted
        recruiter_email = f"recruiter_{os.urandom(4).hex()}@intervia.io"
        print(f"Testing Recruiter Registration with email: {recruiter_email}")
        res = await client.post("/v1/auth/register/recruiter", json={
            "full_name": "Senior Tech Lead",
            "company_name": "Antigravity Corp",
            "email": recruiter_email,
            "password": "SecurePassword123"
        })
        print("Register Recruiter Status:", res.status_code)
        if res.status_code != 201:
            print("Register Recruiter Response:", res.text)
            assert res.status_code == 201
        recruiter_data = res.json()
        print("Register Recruiter Success:", recruiter_data)

        # Test 2: Login Recruiter
        print("Testing Recruiter Login...")
        login_res = await client.post("/v1/auth/login", json={
            "email": recruiter_email,
            "password": "SecurePassword123"
        })
        print("Login Recruiter Status:", login_res.status_code)
        assert login_res.status_code == 200
        token_data = login_res.json()
        token = token_data["access_token"]
        print("Token received:", token[:25] + "...")

        # Test 3: Get Current User (/me)
        me_res = await client.get("/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        print("Get Me Status:", me_res.status_code)
        assert me_res.status_code == 200
        print("Current User:", me_res.json())

        # Test 4: Create Interview Invitation
        cand_email = f"cand_{os.urandom(4).hex()}@example.com"
        print(f"Testing Create Interview Invitation for {cand_email}...")
        inv_res = await client.post("/v1/invitations/create", json={
            "role_title": "Senior Distributed Systems Engineer",
            "candidate_email": cand_email,
            "scheduled_at": "2026-10-31T14:00:00Z"
        }, headers={"Authorization": f"Bearer {token}"})
        print("Create Invitation Status:", inv_res.status_code)
        assert inv_res.status_code in (200, 201)
        inv_data = inv_res.json()
        print("Created Invitation:", inv_data)
        code = inv_data["code"]

        # Test 5: Verify Invitation Code
        verify_res = await client.post(f"/v1/invitations/verify-code?code={code}")
        print("Verify Code Status:", verify_res.status_code)
        assert verify_res.status_code == 200
        print("Verified Code Data:", verify_res.json())

        # Test 6: Register Candidate
        print(f"Testing Candidate Registration with email: {cand_email}...")
        cand_res = await client.post("/v1/auth/register/candidate", json={
            "full_name": "Aman Candidate",
            "email": cand_email,
            "password": "CandidatePass123"
        })
        print("Register Candidate Status:", cand_res.status_code)
        assert cand_res.status_code == 201
        print("Candidate Registered:", cand_res.json())

        # Test 6b: Login Candidate
        cand_login = await client.post("/v1/auth/login", json={
            "email": cand_email,
            "password": "CandidatePass123"
        })
        assert cand_login.status_code == 200
        cand_token = cand_login.json()["access_token"]

        # Test 7: Submit Candidate Consent
        consent_res = await client.post("/v1/onboarding/consent", json={
            "real_full_name": "Aman Candidate",
            "real_email": cand_email,
            "is_above_18_verified": True,
            "purposes_accepted": {
                "camera_audio": True,
                "ai_processing": True,
                "data_retention": True
            }
        }, headers={"Authorization": f"Bearer {cand_token}"})
        print("Consent Submission Status:", consent_res.status_code)
        if consent_res.status_code != 200:
            print("Consent Error Detail:", consent_res.text)
        assert consent_res.status_code == 200
        print("Consent Response:", consent_res.json())

        # Test 8: NVIDIA Nemotron Screen Analysis
        print("Testing NVIDIA Nemotron live screen analysis...")
        screen_res = await client.post("/v1/workspace/screen-analysis", json={
            "session_id": "IV-2048",
            "prompt": "Evaluate candidate code algorithm and approach",
            "current_code": "def merge_intervals(intervals):\n    ordered = sorted(intervals, key=lambda pair: pair[0])\n    merged = [ordered[0][:]]\n    for start, end in ordered[1:]:\n        if start <= merged[-1][1]:\n            merged[-1][1] = max(merged[-1][1], end)\n        else:\n            merged.append([start, end])\n    return merged"
        })
        print("Screen Analysis Status:", screen_res.status_code)
        assert screen_res.status_code == 200
        print("Nemotron Screen Observation:", screen_res.json())

        print("\nALL 8 CORE SYSTEM TESTS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    asyncio.run(run_tests())
