# src/intervia/domains/stage_d_reconciliation/schemas.py
from pydantic import BaseModel, Field, UUID4
from typing import List, Optional, Dict, Any
from datetime import datetime

# Aligned with service.py verification logic
class OfflineEventDTO(BaseModel):
    seq: int
    timestamp_ms: int
    event_type: str
    hmac_hash: str

class SyncChainRequest(BaseModel):
    session_id: str
    offline_duration_sec: int
    events: List[OfflineEventDTO]

class MediaChunkDTO(BaseModel):
    session_id: str
    seq: int
    s3_key: str
    sha256_hash: str

class ReconnectSyncPayload(BaseModel):
    session_id: UUID4
    offline_duration_sec: int
    ast_delta: dict
    logs: List[OfflineEventDTO]
    media_chunks: List[MediaChunkDTO]

class Level1AlertDTO(BaseModel):
    session_id: UUID4
    alert_type: str
    severity: str
    details: str

class TimeLapseSummaryDTO(BaseModel):
    session_id: UUID4
    total_offline_time: int
    face_verification_passed: bool
    multiple_voices_detected: bool
    summary_report: str