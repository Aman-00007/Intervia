"""init_identity_vault

Revision ID: 001
Revises: 
Create Date: 2026-10-20 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create the isolated schema
    op.execute("CREATE SCHEMA IF NOT EXISTS identity_vault;")

    # 2. Create Candidate Identity Table
    op.create_table('candidates',
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('real_full_name', sa.String(length=255), nullable=False),
        sa.Column('real_email', sa.String(length=255), nullable=False),
        sa.Column('real_phone', sa.String(length=50), nullable=True),
        sa.Column('college_id', sa.String(length=100), nullable=True),
        sa.Column('github_username', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('user_id'),
        schema='identity_vault'
    )
    op.create_index(op.f('ix_identity_vault_candidates_real_email'), 'candidates', ['real_email'], unique=True, schema='identity_vault')

    # 3. Create DPDP Consent Table
    op.create_table('consent_records',
        sa.Column('consent_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('session_id', sa.UUID(), nullable=False),
        sa.Column('consent_version', sa.String(length=32), nullable=False),
        sa.Column('is_above_18_verified', sa.Boolean(), nullable=False),
        sa.Column('purposes_accepted', sa.JSON(), nullable=False),
        sa.Column('withdrawn_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('consented_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['identity_vault.candidates.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('consent_id'),
        schema='identity_vault'
    )
    op.create_index(op.f('ix_identity_vault_consent_records_session_id'), 'consent_records', ['session_id'], unique=True, schema='identity_vault')

    # 4. Create PII Token Vault Table
    op.create_table('pii_token_vault',
        sa.Column('session_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('aes_encrypted_map', sa.LargeBinary(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['identity_vault.candidates.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('session_id'),
        schema='identity_vault'
    )


def downgrade() -> None:
    # Reverses the upgrade in case you need to rollback
    op.drop_table('pii_token_vault', schema='identity_vault')
    op.drop_index(op.f('ix_identity_vault_consent_records_session_id'), table_name='consent_records', schema='identity_vault')
    op.drop_table('consent_records', schema='identity_vault')
    op.drop_index(op.f('ix_identity_vault_candidates_real_email'), table_name='candidates', schema='identity_vault')
    op.drop_table('candidates', schema='identity_vault')
    op.execute("DROP SCHEMA IF EXISTS identity_vault;")
