import asyncio
import logging
from pathlib import Path
from jinja2 import Environment, FileSystemLoader

logger = logging.getLogger("intervia.workers.recon")

class Level2ReconWorker:
    """
    Background worker that aggregates all interview telemetry, renders the Jinja2 prompt,
    and calls the LLM to generate the final Integrity & Autonomy Report.
    """
    def __init__(self):
        template_dir = Path(__file__).parent.parent / "infrastructure" / "nebius" / "prompts"
        self.env = Environment(loader=FileSystemLoader(str(template_dir)))
        self.template = self.env.get_template("v1_stage_d_timelapse.j2")

    async def execute_reconciliation(self, session_id: str) -> dict:
        """
        1. Fetch all data for the session (Simulated DB calls)
        2. Render the LLM prompt
        3. Await LLM response
        """
        logger.info(f"Starting Level 2 Reconciliation for {session_id}")
        
        # In production, these are parallel async calls to Track A's repository
        mock_data = {
            "session_id": session_id,
            "language": "python",
            "total_duration_sec": 3600,
            "offline_disconnect_count": 2,
            "total_offline_duration_sec": 120,
            "hmac_chain_valid": True,
            "face_anomalies": [{"timestamp_ms": 45000, "type": "MULTIPLE_FACES"}],
            "voice_activity_ratio": 0.05,
            "code_snapshots": [],
            "ai_chats": []
        }

        # Render the exact prompt we built in Day 5
        rendered_prompt = self.template.render(**mock_data)
        
        # Simulated Nebius Nemotron API Call
        await asyncio.sleep(1.5)  
        
        simulated_llm_response = {
            "integrity_score": 85,
            "GoodUseOfAIScore": {
                "classification": "INDEPENDENT",
                "overall_ai_usage_score": 90
            },
            "forensic_flags": []
        }
        
        logger.info(f"Reconciliation complete for {session_id}. Integrity Score: {simulated_llm_response['integrity_score']}")
        return simulated_llm_response

recon_worker = Level2ReconWorker()