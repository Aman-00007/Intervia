from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String
from intervia.core.database import OpsBase


class HMACChainLog(OpsBase):
    """Database table to permanently store the offline security events after Wi-Fi reconnects."""
    __tablename__ = "hmac_chain_logs"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), index=True, nullable=False)
    seq = Column(Integer, nullable=False)
    timestamp_ms = Column(Integer, nullable=False)
    event_type = Column(String(64), nullable=False)
    hmac_hash = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class MediaChunkMeta(OpsBase):
    """Database table to point to the uploaded S3 video chunks for the server-side AI to analyze."""
    __tablename__ = "media_chunk_meta"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), index=True, nullable=False)
    seq = Column(Integer, nullable=False)
    s3_key = Column(String(255), nullable=False)
    sha256_hash = Column(String(64), nullable=False)


class ReconnectAudit(OpsBase):
    """Tracks every time a candidate drops offline and reconnects."""
    __tablename__ = "reconnect_audits"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), index=True, nullable=False)
    offline_duration_sec = Column(Integer, nullable=False)
    reconnect_time = Column(DateTime, default=datetime.utcnow)
    status = Column(String(32), default="PENDING_SYNC")