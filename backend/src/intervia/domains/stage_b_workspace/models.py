# src/intervia/domains/stage_b_workspace/models.py
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Boolean, Float, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from intervia.core.database import OpsBase
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import Integer

class Session(OpsBase):
    __tablename__ = 'sessions'
    __table_args__ = {'schema': 'interview_ops'}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    status = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

class CodeSubmission(OpsBase):
    __tablename__ = 'code_submissions'
    __table_args__ = {'schema': 'interview_ops'}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey('interview_ops.sessions.id'), nullable=False)
    language = Column(String(20), nullable=False)
    source_code = Column(Text, nullable=False)
    passed = Column(Boolean, nullable=False)
    execution_time_sec = Column(Float, nullable=False)
    memory_kb = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

class SharedAIChat(OpsBase):
    __tablename__ = 'shared_ai_chats'
    __table_args__ = {'schema': 'interview_ops'}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey('interview_ops.sessions.id'), nullable=False)
    prompt = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

# NEW ADDITION: Transcription Model
class Transcript(OpsBase):
    __tablename__ = 'transcripts'
    __table_args__ = {'schema': 'interview_ops'}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey('interview_ops.sessions.id'), nullable=False)
    speaker = Column(String(50), nullable=False)  # 'STUDENT' or 'INTERVIEWER'
    text_content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

class SecurityLog(OpsBase):
    __tablename__ = 'security_logs'
    __table_args__ = {'schema': 'interview_ops'}

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(UUID(as_uuid=True), nullable=False)
    event_type = Column(String(100), nullable=False)
    details = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)