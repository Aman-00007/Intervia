# src/intervia/domains/stage_d_reconciliation/models.py
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from intervia.core.database import OpsBase

class HMACChainLog(OpsBase):
    __tablename__ = "hmac_chain_logs"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), index=True, nullable=False)
    seq = Column(Integer, nullable=False)
    timestamp_ms = Column(Integer, nullable=False)
    event_type = Column(String(64), nullable=False)
    hmac_hash = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class MediaChunkMeta(OpsBase):
    __tablename__ = "media_chunk_meta"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), index=True, nullable=False)
    seq = Column(Integer, nullable=False)
    s3_key = Column(String(255), nullable=False)
    sha256_hash = Column(String(64), nullable=False)

class ReconnectAudit(OpsBase):
    __tablename__ = "reconnect_audits"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), index=True, nullable=False)
    offline_duration_sec = Column(Integer, nullable=False)
    
    # THESE WERE MISSING
    level_1_validation_passed = Column(Boolean, default=False)
    anomaly_flags = Column(JSONB, default={})
    
    reconnect_time = Column(DateTime, default=datetime.utcnow)
    status = Column(String(32), default="PENDING_SYNC")