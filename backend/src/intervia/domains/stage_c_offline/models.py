# src/intervia/domains/stage_c_offline/models.py
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from intervia.core.database import OpsBase

class OfflineSession(OpsBase):
    __tablename__ = 'offline_sessions'
    __table_args__ = {'schema': 'interview_ops'}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    started_at = Column(DateTime(timezone=True), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), nullable=False, default="ACTIVE")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

class OfflineLogEntry(OpsBase):
    __tablename__ = 'offline_log_entries'
    __table_args__ = {'schema': 'interview_ops'}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    offline_session_id = Column(UUID(as_uuid=True), ForeignKey('interview_ops.offline_sessions.id', ondelete='CASCADE'), nullable=False)
    sequence_number = Column(Integer, nullable=False)
    event_type = Column(String(100), nullable=False)
    payload = Column(JSONB, nullable=False)
    hmac_hash = Column(String(255), nullable=False)
    previous_hash = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

class MediaChunk(OpsBase):
    __tablename__ = 'media_chunks'
    __table_args__ = {'schema': 'interview_ops'}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    offline_session_id = Column(UUID(as_uuid=True), ForeignKey('interview_ops.offline_sessions.id', ondelete='CASCADE'), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    s3_key = Column(String(255), nullable=False)
    chunk_hash = Column(String(255), nullable=False)
    recorded_at = Column(DateTime(timezone=True), nullable=False)