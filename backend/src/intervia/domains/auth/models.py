# src/intervia/domains/auth/models.py
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
import enum

from intervia.core.database import VaultBase

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    INTERVIEWER = "INTERVIEWER"
    STUDENT = "STUDENT"
    CANDIDATE = "STUDENT"

class User(VaultBase):
    """
    User model stored in identity_vault.
    Contains PII (email, full_name) which must NEVER be exposed to the AI.
    """
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Role-based access with schema="identity_vault" to match Postgres type identity_vault.userrole
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole, name="userrole", schema="identity_vault", inherit_schema=True),
        default=UserRole.STUDENT,
        nullable=False
    )
    
    # For Recruiters/Admins (as seen in Figma "Organization" field)
    organization_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    terms_accepted: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
