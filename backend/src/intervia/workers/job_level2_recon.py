# src/intervia/workers/job_level2_recon.py
import asyncio
import logging
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from uuid import UUID
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from sqlalchemy.future import select

from intervia.core.database import OpsSessionLocal
from intervia.domains.stage_c_offline.models import OfflineSession, OfflineLogEntry, MediaChunk
from intervia.domains.stage_d_reconciliation.models import ReconnectAudit
from intervia.domains.stage_b_workspace.models import SecurityLog
from intervia.domains.stage_d_reconciliation.risk_scoring import calculate_risk_level
from intervia.infrastructure.nebius.model_router import model_router, NemotronTier

logger = logging.getLogger("intervia.workers.recon")

# Pydantic schema to enforce the exact output we want from the AI
class TimeLapseSummaryResult(BaseModel):
    offline_window_text: str
    integrity_score: int
    forensic_flags: List[str]

class Level2ReconWorker:
    """
    Background worker that aggregates all interview telemetry, renders the Jinja2 prompt,
    and calls the LLM to generate the final Integrity & Autonomy Report.
    """
    def __init__(self):
        # Keep your original template setup!
        template_dir = Path(__file__).parent.parent / "infrastructure" / "nebius" / "prompts"
        self.env = Environment(loader=FileSystemLoader(str(template_dir)))
        
        try:
            self.template = self.env.get_template("v1_stage_d_timelapse.j2")
        except Exception as e:
            logger.warning(f"Template v1_stage_d_timelapse.j2 not found, using fallback. Error: {e}")
            self.template = None

    async def execute_reconciliation(self, session_id: str) -> dict:
        """
        Runs the Level 2 verification steps (Features Document Section 7).
        """
        logger.info(f"Starting Level 2 Reconciliation for {session_id}")
        
        async with OpsSessionLocal() as db:
            # -------------------------------------------------------------
            # STEP 1: Fetch actual data from the Database (Replacing mock data)
            # -------------------------------------------------------------
            
            # Check if there was even an offline session
            offline_stmt = select(OfflineSession).where(OfflineSession.session_id == UUID(session_id))
            offline_res = await db.execute(offline_stmt)
            offline_session = offline_res.scalars().first()

            if not offline_session:
                logger.info(f"No offline sessions found for {session_id}. Skipping Level 2.")
                return {"status": "skipped", "reason": "No offline drop detected."}

            # Fetch Logs, Media Chunks, and Security Events
            logs_stmt = select(OfflineLogEntry).where(OfflineLogEntry.offline_session_id == offline_session.id)
            logs_res = await db.execute(logs_stmt)
            logs = logs_res.scalars().all()

            media_stmt = select(MediaChunk).where(MediaChunk.offline_session_id == offline_session.id)
            media_res = await db.execute(media_stmt)
            media_chunks = media_res.scalars().all()

            sec_stmt = select(SecurityLog).where(SecurityLog.session_id == UUID(session_id))
            sec_res = await db.execute(sec_stmt)
            security_logs = sec_res.scalars().all()
            security_event_types = [log.event_type for log in security_logs]

            audit_stmt = select(ReconnectAudit).where(ReconnectAudit.session_id == str(session_id))
            audit_res = await db.execute(audit_stmt)
            latest_audit = audit_res.scalars().first()

            # -------------------------------------------------------------
            # STEP 2 & 6: Calculate Risk Level & Prepare AI Data
            # -------------------------------------------------------------
            # Note: Steps 3-5 (Media re-check, Code merge verification) are handled 
            # by the frontend syncing or would require heavy OpenCV processing. 
            # For the hackathon, we pass the metadata to the AI.
            
            risk_level = calculate_risk_level(latest_audit.anomaly_flags if latest_audit else {}, security_event_types)
            
            duration_mins = int((offline_session.ended_at - offline_session.started_at).total_seconds() / 60) if offline_session.ended_at else 0

            # Construct the payload for Jinja / AI
            data_for_prompt = {
                "session_id": session_id,
                "offline_duration_mins": duration_mins,
                "hmac_chain_valid": latest_audit.level_1_validation_passed if latest_audit else True,
                "log_count": len(logs),
                "media_chunk_count": len(media_chunks),
                "security_events": security_event_types,
                "risk_level": risk_level
            }

            # -------------------------------------------------------------
            # STEP 3: Render Prompt
            # -------------------------------------------------------------
            if self.template:
                rendered_prompt = self.template.render(**data_for_prompt)
            else:
                # Fallback prompt if template is missing
                rendered_prompt = f"""
                Generate an OFFLINE WINDOW summary based on this data:
                Duration: {duration_mins} mins
                Chain Valid: {data_for_prompt['hmac_chain_valid']}
                Security Events: {security_event_types}
                Calculated Risk Level: {risk_level}
                
                Follow the exact format: "OFFLINE WINDOW [Start] - [End] ([Duration] mins)..."
                """

            # -------------------------------------------------------------
            # STEP 4: Call Nebius
            # -------------------------------------------------------------
            logger.info(f"Calling Nebius for Time-Lapse Summary ({session_id})...")
            ai_result, telemetry = await model_router.generate_structured(
                tier=NemotronTier.SUPER,
                system_prompt="You are an expert AI integrity auditor. Return valid JSON matching the schema.",
                user_prompt=rendered_prompt,
                response_schema=TimeLapseSummaryResult,
                temperature=0.2
            )

            logger.info(f"Level 2 Reconciliation complete for {session_id}. Risk: {risk_level}")
            
            # In a full production setup, you would save ai_result.offline_window_text 
            # to the DB here so the Stage E report can fetch it.
            
            return {
                "status": "success",
                "risk_level": risk_level,
                "time_lapse_summary": ai_result.offline_window_text
            }

# Singleton instance
recon_worker = Level2ReconWorker()