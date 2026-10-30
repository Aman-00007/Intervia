import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, ForeignKey, JSON, LargeBinary, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from intervia.core.database import VaultBase
from intervia.core.database import OpsBase
from sqlalchemy import String, DateTime
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone



class CandidateIdentity(VaultBase):
    """Physical Table 1 in `identity_vault` schema: Real candidate identity."""

    __tablename__ = "candidates"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    real_full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    real_email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    real_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    college_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    github_username: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class DPDPConsentRecord(VaultBase):
    """Physical Table 2 in `identity_vault`: Granular DPDP Act consent audit log."""

    __tablename__ = "consent_records"

    consent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("identity_vault.candidates.user_id", ondelete="CASCADE")
    )
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True, index=True)
    consent_version: Mapped[str] = mapped_column(String(32), default="DPDP-2026-v1.0")
    is_above_18_verified: Mapped[bool] = mapped_column(Boolean, nullable=False)
    purposes_accepted: Mapped[dict] = mapped_column(JSON, nullable=False)
    withdrawn_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    consented_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class PIITokenVault(VaultBase):
    """Physical Table 3 in `identity_vault`: AES-256-GCM encrypted [NAME_1] -> Real Name map."""

    __tablename__ = "pii_token_vault"

    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("identity_vault.candidates.user_id", ondelete="CASCADE")
    )
    aes_encrypted_map: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

class SessionSeed(OpsBase):
    """Stores the cryptographic seed for the offline HMAC chain."""
    __tablename__ = "session_seeds"

    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    server_seed: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))