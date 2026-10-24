"""init_interview_ops

Revision ID: 002_init_interview_ops
Revises: 001_init_identity_vault
Create Date: 2026-10-20 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_init_interview_ops'
down_revision = '001_init_identity_vault'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Ensure the schema exists
    op.execute('CREATE SCHEMA IF NOT EXISTS interview_ops')

    op.create_table('sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        schema='interview_ops'
    )

    op.create_table('code_submissions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('interview_ops.sessions.id'), nullable=False),
        sa.Column('language', sa.String(20), nullable=False),
        sa.Column('source_code', sa.Text(), nullable=False),
        sa.Column('passed', sa.Boolean(), nullable=False),
        sa.Column('execution_time_sec', sa.Float(), nullable=False),
        sa.Column('memory_kb', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        schema='interview_ops'
    )

    op.create_table('shared_ai_chats',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('interview_ops.sessions.id'), nullable=False),
        sa.Column('prompt', sa.Text(), nullable=False),
        sa.Column('response', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        schema='interview_ops'
    )

    op.create_table('hmac_chain_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('interview_ops.sessions.id'), nullable=False),
        sa.Column('sequence_id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('payload_hash', sa.String(256), nullable=False),
        sa.Column('hmac_signature', sa.String(256), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        schema='interview_ops'
    )

    op.create_table('media_chunk_meta',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('interview_ops.sessions.id'), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('s3_object_key', sa.String(255), nullable=False),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('size_bytes', sa.Integer(), nullable=False),
        schema='interview_ops'
    )

    op.create_table('reconnect_audits',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('interview_ops.sessions.id'), nullable=False),
        sa.Column('offline_duration_sec', sa.Integer(), nullable=False),
        sa.Column('level_1_validation_passed', sa.Boolean(), nullable=False),
        sa.Column('anomaly_flags', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        schema='interview_ops'
    )

def downgrade() -> None:
    op.drop_table('reconnect_audits', schema='interview_ops')
    op.drop_table('media_chunk_meta', schema='interview_ops')
    op.drop_table('hmac_chain_logs', schema='interview_ops')
    op.drop_table('shared_ai_chats', schema='interview_ops')
    op.drop_table('code_submissions', schema='interview_ops')
    op.drop_table('sessions', schema='interview_ops')