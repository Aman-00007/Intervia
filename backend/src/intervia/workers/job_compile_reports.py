# src/intervia/workers/job_compile_reports.py
import asyncio
import json
import logging
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from intervia.core.database import OpsSessionLocal
from intervia.domains.stage_b_workspace.models import CodeSubmission, SharedAIChat, Session, Transcript, SecurityLog
from intervia.domains.stage_d_reconciliation.models import ReconnectAudit, HMACChainLog
from intervia.domains.stage_d_reconciliation.risk_scoring import calculate_risk_level
from intervia.domains.stage_e_reporting.repository import ReportingRepository
from intervia.domains.stage_e_reporting.service import ReportingService
from intervia.infrastructure.nebius.model_router import model_router, NemotronTier
from intervia.infrastructure.privacy.presidio_engine import pii_shield

logger = logging.getLogger(__name__)

# Schema to enforce structured output from Nebius Ultra
class AIEvaluationResult(BaseModel):
    composite_score: str
    hiring_recommendation: str
    transcript_summary: str
    risk_flags: List[str]
    strengths: List[str]
    weaknesses: List[str]
    skill_radar: List[Dict[str, Any]]
    growth_roadmap: List[Dict[str, Any]]
    # New field to capture the specific offline block
    offline_time_lapse_summary: Optional[str] = None

async def compile_interview_reports(session_id: UUID, candidate_id: str):
    """
    Background worker that runs when an interview ends.
    1. Gathers all telemetry (Code, AI, Transcripts, Reconnect Logs, Security Events).
    2. Calculates Risk Level.
    3. Calls Nemotron Ultra to evaluate.
    4. Triggers Stage E to generate reports and PDF.
    """
    logger.info(f"Starting report compilation for session: {session_id}")
    
    async with OpsSessionLocal() as db:
        try:
            # ---------------------------------------------------------
            # 1. FETCH ALL TELEMETRY DATA
            # ---------------------------------------------------------
            
            # A. Code Submissions
            code_stmt = select(CodeSubmission).where(CodeSubmission.session_id == session_id)
            code_res = await db.execute(code_stmt)
            submissions = code_res.scalars().all()
            code_context = [
                {
                    "language": s.language, 
                    "passed": s.passed, 
                    "code": pii_shield.scrub_text(s.source_code) # <-- SCRUB CODE COMMENTS
                } 
                for s in submissions
            ]

            # B. Shared AI Chats
            chat_stmt = select(SharedAIChat).where(SharedAIChat.session_id == session_id)
            chat_res = await db.execute(chat_stmt)
            chats = chat_res.scalars().all()
            ai_context = [{"prompt": c.prompt, "response": c.response} for c in chats]

            # C. Reconnect Audits (Offline Black Box)
            audit_stmt = select(ReconnectAudit).where(ReconnectAudit.session_id == str(session_id))
            audit_res = await db.execute(audit_stmt)
            audits = audit_res.scalars().all()
            audit_context = [
                {"duration_sec": a.offline_duration_sec, "chain_valid": a.level_1_validation_passed} 
                for a in audits
            ]

            # D. Conversation Transcripts (STT from Frontend)
            transcript_stmt = select(Transcript).where(Transcript.session_id == session_id).order_by(Transcript.created_at)
            transcript_res = await db.execute(transcript_stmt)
            transcripts = transcript_res.scalars().all()
            
            transcript_context = "\n".join([f"[{t.speaker}]: {t.text_content}" for t in transcripts])
            if not transcript_context:
                transcript_context = "No verbal transcript recorded."

            # E. Security Logs (Anti-Cheat Events)
            sec_stmt = select(SecurityLog).where(SecurityLog.session_id == session_id)
            sec_res = await db.execute(sec_stmt)
            security_logs = sec_res.scalars().all()
            security_event_types = [log.event_type for log in security_logs]

            # ---------------------------------------------------------
            # 2. CALCULATE RISK LEVEL & BUILD OFFLINE BLOCK
            # ---------------------------------------------------------
            offline_block_prompt = ""
            risk_level = "LOW"
            
            if audits:
                latest_audit = audits[0]
                risk_level = calculate_risk_level(latest_audit.anomaly_flags, security_event_types)
                
                # Format the exact block from the Features Document
                offline_block_prompt = f"""
                GENERATE AN 'OFFLINE WINDOW' SUMMARY FOR THE INTERVIEWER REPORT.
                Here is the raw data:
                - Duration: {latest_audit.offline_duration_sec} seconds
                - Integrity (Chain Valid): {latest_audit.level_1_validation_passed}
                - Risk Level: {risk_level}
                - Tab Switches / Pastes: {security_event_types}
                
                Use this EXACT text format for your output:
                OFFLINE WINDOW [Start Time] - [End Time] ([Duration] mins)
                Integrity: [Chain valid / BROKEN]
                Camera: [Face data from logs if available, else 'Not analyzed']
                Audio: [Voice data from logs if available, else 'Not analyzed']
                Screen: [Count of tab switches]
                Code: [Count of pastes]
                Risk level: {risk_level}
                Suggested action: [What the interviewer should ask]
                """

            # ---------------------------------------------------------
            # 3. BUILD AI PROMPT
            # ---------------------------------------------------------
            prompt = f"""
            You are an expert technical interviewer. Evaluate the candidate based on their session data.
            
            CODE SUBMISSIONS:
            {json.dumps(code_context, indent=2)}
            
            AI HINTS/CHATS USED:
            {json.dumps(ai_context, indent=2)}
            
            CONVERSATION TRANSCRIPT:
            {transcript_context}
            
            OFFLINE NETWORK AUDITS:
            {json.dumps(audit_context, indent=2)}
            
            {offline_block_prompt}
            
            Provide a comprehensive evaluation including a composite score (0-10), 
            hiring recommendation (HIRE/HOLD/REJECT), and a summary. 
            Also include strengths, weaknesses, skill radar data, and a growth roadmap.
            If there was an offline window, populate the 'offline_time_lapse_summary' field.
            """

            # ---------------------------------------------------------
            # 4. CALL NEMOTRON ULTRA
            # ---------------------------------------------------------
            logger.info("Calling Nebius Ultra for evaluation...")
            ai_result, telemetry = await model_router.generate_structured(
                tier=NemotronTier.ULTRA,
                system_prompt="You are an expert evaluator. Return ONLY valid JSON matching the schema.",
                user_prompt=prompt,
                response_schema=AIEvaluationResult,
                temperature=0.2
            )

            raw_data = ai_result.model_dump()
            
            # If there's an offline summary, append it to the transcript summary for the DB/PDF
            if raw_data.get("offline_time_lapse_summary"):
                raw_data["transcript_summary"] += f"\n\n{raw_data['offline_time_lapse_summary']}"

            # ---------------------------------------------------------
            # 5. TRIGGER STAGE E REPORTING & PDF
            # ---------------------------------------------------------
            logger.info("Triggering Stage E Report Generation...")
            repo = ReportingRepository(db)
            service = ReportingService(repo)
            
            pdf_path = await service.generate_and_export_report(
                session_id=str(session_id),
                candidate_id=candidate_id,
                raw_data=raw_data
            )
            
            # ---------------------------------------------------------
            # 6. MARK SESSION AS COMPLETED
            # ---------------------------------------------------------
            session_stmt = select(Session).where(Session.id == session_id)
            session_res = await db.execute(session_stmt)
            session_obj = session_res.scalars().first()
            if session_obj:
                session_obj.status = "COMPLETED"
                await db.commit()

            logger.info(f"Report compilation successful! PDF saved at: {pdf_path}")
            return {"status": "success", "pdf_path": pdf_path}

        except Exception as e:
            logger.error(f"Failed to compile reports for session {session_id}: {str(e)}")
            await db.rollback()
            return {"status": "failed", "error": str(e)}

# For testing directly via CLI
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python job_compile_reports.py <session_uuid> <candidate_id>")
        sys.exit(1)
        
    test_session_id = UUID(sys.argv[1])
    test_candidate_id = sys.argv[2]
    asyncio.run(compile_interview_reports(test_session_id, test_candidate_id))