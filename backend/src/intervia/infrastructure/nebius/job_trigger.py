import httpx
import logging
from typing import Dict, Any

logger = logging.getLogger("intervia.nebius.trigger")

class NebiusJobTrigger:
    """
    Triggers detached serverless tasks (like Level 2 Reconciliation) on Nebius AI.
    Fire-and-forget architecture so the candidate's API response isn't delayed.
    """
    def __init__(self, nebius_base_url: str = "https://api.nebius.ai/v1", api_key: str = "dummy_key"):
        self.base_url = nebius_base_url
        self.api_key = api_key
        
    async def trigger_recon_job(self, session_id: str, metadata: Dict[str, Any] = None) -> bool:
        """Fires the async Stage D reconciliation job after an interview ends."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "session_id": session_id,
            "job_type": "TIMELAPSE_RECON",
            "metadata": metadata or {}
        }
        
        try:
            async with httpx.AsyncClient() as client:
                # We use a short timeout because we only care about the 202 Accepted trigger, not the result.
                response = await client.post(
                    f"{self.base_url}/serverless/jobs",
                    headers=headers,
                    json=payload,
                    timeout=3.0 
                )
                response.raise_for_status()
                logger.info(f"Successfully triggered Nebius Recon Job for session: {session_id}")
                return True
        except httpx.HTTPError as e:
            logger.error(f"Failed to trigger Nebius job for {session_id}: {str(e)}")
            return False

job_trigger = NebiusJobTrigger()