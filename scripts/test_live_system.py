import asyncio
import sys
import httpx

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000"

async def test_all():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        print("1. Testing AI Chat (NVIDIA Nemotron 3 Nano)...")
        ai_resp = await client.post("/v1/workspace/ai-chat", json={
            "session_id": "IV-2048",
            "prompt_text": "Explain boundary test failure on Run #2 and line 10 condition",
            "current_code_snapshot": "def merge_intervals(intervals):\n    intervals.sort()\n    merged = [intervals[0]]\n    for start, end in intervals[1:]:\n        if start < merged[-1][1]:\n            merged[-1][1] = max(merged[-1][1], end)\n        else:\n            merged.append([start, end])\n    return merged",
            "sandbox_error_context": "Run #2 failed on touching endpoints: [[1,3],[3,5]]"
        })
        print(f"   Status: {ai_resp.status_code}")
        if ai_resp.status_code == 200:
            data = ai_resp.json()
            print(f"   AI Chat Response (first 120 chars): {data.get('response_text')[:120]}...")
        else:
            print(f"   Error: {ai_resp.text}")

        print("\n2. Testing Shared Screen Analysis (NVIDIA Nemotron 3)...")
        screen_resp = await client.post("/v1/workspace/screen-analysis", json={
            "session_id": "IV-2048",
            "prompt": "Analyze candidate screen activity and editor layout",
            "current_code": "def merge_intervals(intervals): ..."
        })
        print(f"   Status: {screen_resp.status_code}")
        if screen_resp.status_code == 200:
            print(f"   Observation: {screen_resp.json().get('observation')[:120]}...")
        else:
            print(f"   Error: {screen_resp.text}")

        print("\n3. Testing Reports Retrieval...")
        student_resp = await client.get("/v1/reports/IV-2048/student")
        print(f"   Student Report Status: {student_resp.status_code}")
        if student_resp.status_code == 200:
            print(f"   Strengths count: {len(student_resp.json().get('strengths', []))}")

        exec_resp = await client.get("/v1/reports/IV-2048/executive")
        print(f"   Executive Report Status: {exec_resp.status_code}")
        if exec_resp.status_code == 200:
            print(f"   Recommendation: {exec_resp.json().get('hiring_recommendation')}")

        print("\n4. Testing PDF Download...")
        pdf_resp = await client.get("/v1/reports/IV-2048/download-pdf")
        print(f"   PDF Download Status: {pdf_resp.status_code}, Length: {len(pdf_resp.content)} bytes")

asyncio.run(test_all())
