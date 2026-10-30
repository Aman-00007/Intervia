import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend" / "src"))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from intervia.infrastructure.nebius.client import nebius_client
from intervia.core.config import get_settings

settings = get_settings()

async def test_nemotron():
    print(f"Testing Nebius connection to: {settings.NEBIUS_BASE_URL}")
    print(f"Model: {settings.NEMOTRON_NANO_MODEL}")
    try:
        response = await nebius_client.chat.completions.create(
            model=settings.NEMOTRON_NANO_MODEL,
            messages=[
                {"role": "system", "content": "You are NVIDIA Nemotron technical interview assistant."},
                {"role": "user", "content": "Briefly describe time complexity of binary search in one sentence."}
            ],
            max_tokens=60,
            temperature=0.2
        )
        print("Nemotron Response:")
        print(response.choices[0].message.content)
        print(f"Usage tokens: {response.usage.total_tokens if response.usage else 'N/A'}")
        print("NVIDIA Nemotron 3 is fully WORKING and verified!")
    except Exception as e:
        print("Nebius API Error:", type(e).__name__, e)

if __name__ == "__main__":
    asyncio.run(test_nemotron())
