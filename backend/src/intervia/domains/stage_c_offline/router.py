# src/intervia/domains/stage_c_offline/router.py
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from intervia.core.database import get_ops_db
from .schemas import OfflineSessionStart, SyncOfflineDataRequest, SyncResultResponse
from .repository import OfflineRepository
from .service import OfflineService
from .models import OfflineSession

router = APIRouter(tags=["Stage C: Offline Buffer"])

def get_offline_service(db_session: AsyncSession = Depends(get_ops_db)) -> OfflineService:
    repo = OfflineRepository(db_session)
    return OfflineService(repo)

@router.post("/start")
async def start_offline(
    payload: OfflineSessionStart,
    service: OfflineService = Depends(get_offline_service)
):
    """Called by the frontend the moment the connection drops."""
    try:
        session = await service.start_session(payload)
        return {"offline_session_id": session.id, "status": "buffer_started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync", response_model=SyncResultResponse)
async def sync_offline_data(
    payload: SyncOfflineDataRequest,
    service: OfflineService = Depends(get_offline_service)
):
    """
    Called when the connection is restored to upload buffered logs and media.
    (Figma: "2m 10s, recovered")
    """
    try:
        return await service.sync_data(payload)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")

@router.post("/timeout/{offline_session_id}")
async def mark_session_timeout(
    offline_session_id: uuid.UUID,
    db: AsyncSession = Depends(get_ops_db)
):
    """
    Called by the frontend if the 10-minute offline buffer runs out.
    (Figma: "Suggested limit" feature)
    """
    stmt = select(OfflineSession).where(OfflineSession.id == offline_session_id)
    result = await db.execute(stmt)
    session = result.scalars().first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Offline session not found.")
        
    session.status = "TIMEOUT"
    await db.commit()
    
    return {"status": "success", "message": "Session marked as TIMEOUT."}