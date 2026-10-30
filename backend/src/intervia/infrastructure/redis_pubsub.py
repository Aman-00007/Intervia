import json
from typing import Any
import redis.asyncio as redis


class RedisSessionHub:
    """Manages ephemeral HMAC seeds and pushes Level-1 Instant Reconnect Alerts in real time."""

    def __init__(self, redis_url: str = "redis://localhost:6379/0") -> None:
        self.client = redis.from_url(redis_url, decode_responses=True)

    async def store_hmac_seed(self, session_id: str, seed_hex: str, ttl_seconds: int = 10800) -> None:
        """Saves the cryptographic HMAC seed for an active interview session."""
        await self.client.setex(f"session:{session_id}:hmac_seed", ttl_seconds, seed_hex)

    async def get_hmac_seed(self, session_id: str) -> str | None:
        """Retrieves the HMAC seed when the student reconnects after dropping Wi-Fi."""
        return await self.client.get(f"session:{session_id}:hmac_seed")

    async def publish_interviewer_alert(self, session_id: str, alert_payload: dict[str, Any]) -> None:
        """Pushes an instant alert (like a large paste or tab switch) to the interviewer's screen."""
        channel = f"session:{session_id}:interviewer_alerts"
        await self.client.publish(channel, json.dumps(alert_payload))


redis_hub = RedisSessionHub()