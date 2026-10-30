# src/intervia/domains/stage_c_offline/schemas.py
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from uuid import UUID
from datetime import datetime

class OfflineSessionStart(BaseModel):
    session_id: UUID
    started_at: datetime

class LogEntryCreate(BaseModel):
    sequence_number: int
    event_type: str
    payload: Dict[str, Any]
    hmac_hash: str
    previous_hash: Optional[str] = None

class MediaChunkCreate(BaseModel):
    chunk_index: int
    s3_key: str
    chunk_hash: str
    recorded_at: datetime

class SyncOfflineDataRequest(BaseModel):
    offline_session_id: UUID
    logs: List[LogEntryCreate]
    media_chunks: List[MediaChunkCreate]

class SyncResultResponse(BaseModel):
    status: str
    logs_verified: int
    chunks_saved: int
    chain_valid: bool
    message: str