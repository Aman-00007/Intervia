from pydantic import BaseModel, Field, UUID4
from typing import List, Optional
from datetime import datetime

class HMACLogEntry(BaseModel):
    sequence_id: int
    event_type: str
    payload_hash: str
    timestamp: datetime
    hmac_signature: str

class MediaChunkDTO(BaseModel):
    chunk_index: int
    s3_object_key: str
    start_time: datetime
    end_time: datetime
    size_bytes: int

class ReconnectSyncPayload(BaseModel):
    session_id: UUID4
    offline_duration_sec: int
    ast_delta: dict
    logs: List[HMACLogEntry]
    media_chunks: List[MediaChunkDTO]

class Level1AlertDTO(BaseModel):
    session_id: UUID4
    alert_type: str = Field(..., description="E.g., HMAC_CHAIN_BROKEN, AST_BURST_DETECTED")
    severity: str = Field(..., description="LOW, MEDIUM, HIGH, CRITICAL")
    details: str

class TimeLapseSummaryDTO(BaseModel):
    session_id: UUID4
    total_offline_time: int
    face_verification_passed: bool
    multiple_voices_detected: bool
    summary_report: str