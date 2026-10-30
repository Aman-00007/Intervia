# src/intervia/domains/stage_d_reconciliation/router.py
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from intervia.core.database import get_ops_db
from intervia.core.config import get_settings
from intervia.domains.stage_d_reconciliation.service import ReconciliationService
from intervia.domains.stage_d_reconciliation.repository import ReconciliationRepository
from intervia.domains.stage_d_reconciliation.models import ReconnectAudit
from intervia.domains.stage_d_reconciliation.schemas import SyncChainRequest, MediaChunkDTO

# IMPORT THE ACTUAL BACKGROUND WORKER HERE
from intervia.workers.job_level2_recon import recon_worker

settings = get_settings()

router = APIRouter(tags=["Stage D: Reconciliation & Anti-Cheat"])

# --- Dependency Injection ---
def get_reconciliation_service() -> ReconciliationService:
    return ReconciliationService(secret_key=settings.HMAC_OFFLINE_SECRET)

def get_reconciliation_repo(db_session: AsyncSession = Depends(get_ops_db)) -> ReconciliationRepository:
    return ReconciliationRepository(db_session)

# --- Endpoints ---

@router.post("/sync-chain")
async def sync_offline_chain(
    payload: SyncChainRequest,
    background_tasks: BackgroundTasks,
    service: ReconciliationService = Depends(get_reconciliation_service),
    repo: ReconciliationRepository = Depends(get_reconciliation_repo)
):
    """
    Receives events from the offline buffer, validates the HMAC chain (Level 1), 
    saves them, and triggers Level 2 background verification.
    """
    events_dict = [event.model_dump() for event in payload.events]
    
    # 1. Validate HMAC Chain (Level 1 Check)
    is_valid = service.verify_hmac_chain(events_dict)
    
    if not is_valid:
        # Save failed audit (Instant Alert for Interviewer)
        await repo.create_reconnect_audit(
            session_id=payload.session_id,
            offline_duration=payload.offline_duration_sec,
            level_1_passed=False,
            flags={"HMAC_CHAIN_BROKEN": True}
        )
        raise HTTPException(
            status_code=403, 
            detail="HMAC Chain Validation Failed. Offline tampering detected."
        )
        
    # 2. Save to Database (Valid chain)
    await repo.bulk_insert_hmac_logs(payload.session_id, events_dict)
    await repo.create_reconnect_audit(
        session_id=payload.session_id,
        offline_duration=payload.offline_duration_sec,
        level_1_passed=True,
        flags={}
    )

    # 3. Trigger Level 2 (Heavy AI checks) in the background
    # THIS IS THE WIRE WE JUST CONNECTED!
    background_tasks.add_task(recon_worker.execute_reconciliation, str(payload.session_id))
    
    return {
        "status": "success", 
        "message": f"{len(events_dict)} offline events securely synced.",
        "level_1_passed": True
    }

@router.post("/chunk")
async def register_media_chunk(
    payload: MediaChunkDTO,
    repo: ReconciliationRepository = Depends(get_reconciliation_repo)
):
    """
    Registers metadata for a video chunk uploaded to S3.
    """
    chunk_data = [payload.model_dump()]
    await repo.bulk_insert_media_chunks(payload.session_id, chunk_data)
    return {"status": "success", "message": f"Media chunk {payload.seq} registered securely."}


@router.get("/audit/{session_id}")
async def get_reconnect_audit(
    session_id: str,
    db_session: AsyncSession = Depends(get_ops_db)
):
    """
    Fetches the Reconnect Audit data for the Interviewer Report.
    (Figma: "Verified reconciliation events")
    """
    stmt = select(ReconnectAudit).where(ReconnectAudit.session_id == session_id).order_by(ReconnectAudit.reconnect_time.desc())
    result = await db_session.execute(stmt)
    audit = result.scalars().first()

    if not audit:
        return {"status": "no_offline_events", "message": "This session had no network drops."}

    return {
        "session_id": audit.session_id,
        "offline_duration_sec": audit.offline_duration_sec,
        "chain_valid": audit.level_1_validation_passed,
        "anomaly_flags": audit.anomaly_flags,
        "reconnect_time": audit.reconnect_time,
        "status": audit.status
    }