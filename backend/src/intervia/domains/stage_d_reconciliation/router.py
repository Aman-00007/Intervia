from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List

from intervia.domains.stage_d_reconciliation.service import ReconciliationService

router = APIRouter(prefix="/v1/reconciliation", tags=["Stage D: Reconciliation & Anti-Cheat"])

# --- Pydantic Schemas for Validation ---
class OfflineEventDTO(BaseModel):
    seq: int
    timestamp_ms: int
    event_type: str
    hmac_hash: str

class SyncChainRequest(BaseModel):
    session_id: str
    events: List[OfflineEventDTO]

class MediaChunkDTO(BaseModel):
    session_id: str
    seq: int
    s3_key: str
    sha256_hash: str

# --- Dependency Injection ---
def get_reconciliation_service() -> ReconciliationService:
    return ReconciliationService(secret_key="intervia_offline_secret_key_123")

# --- Endpoints ---
@router.post("/sync-chain")
async def sync_offline_chain(
    payload: SyncChainRequest,
    service: ReconciliationService = Depends(get_reconciliation_service)
):
    """
    Receives events that occurred while the candidate's Wi-Fi was disconnected.
    Validates the cryptographic chain to ensure no code was injected/tampered with.
    """
    events_dict = [event.model_dump() for event in payload.events]
    
    is_valid = service.verify_hmac_chain(events_dict)
    
    if not is_valid:
        raise HTTPException(
            status_code=403, 
            detail="HMAC Chain Validation Failed. Offline tampering detected."
        )
        
    # TODO: Once Track A provides DB logic, save to HMACChainLog table
    return {"status": "success", "message": f"{len(events_dict)} offline events securely synced."}

@router.post("/chunk")
async def register_media_chunk(payload: MediaChunkDTO):
    """
    Registers metadata for a WebRTC video chunk uploaded directly to S3.
    Used by the Media Forensics engine later to analyze face/voice tracking.
    """
    # TODO: Once Track A provides DB logic, save to MediaChunkMeta table
    return {"status": "success", "message": f"Media chunk {payload.seq} registered securely."}