import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from intervia.core.database import OpsBase

class StudentReportModel(OpsBase):
    __tablename__ = "student_reports"
    __table_args__ = {"schema": "interview_ops"}

    report_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    candidate_id = Column(String(255), nullable=False)
    strengths_weaknesses = Column(JSON, nullable=False)
    skill_radar = Column(JSON, nullable=False)
    growth_roadmap = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ExecutiveReportModel(OpsBase):
    __tablename__ = "executive_reports"
    __table_args__ = {"schema": "interview_ops"}

    report_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    hiring_recommendation = Column(String(50), nullable=False) # Hire / Hold / Reject
    composite_score = Column(String(10), nullable=False)
    risk_flags = Column(JSON, nullable=False)
    transcript_summary = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
