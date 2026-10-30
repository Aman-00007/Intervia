"""initial tables

Revision ID: 123456789abc
Revises: 
Create Date: 2023-10-27 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '123456789abc'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create Users table (identity_vault)
    op.create_table('users',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('role', sa.Enum('ADMIN', 'INTERVIEWER', 'CANDIDATE', name='userrole'), nullable=False),
        sa.Column('organization_name', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('terms_accepted', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        schema='identity_vault'
    )
    op.create_index(op.f('ix_identity_vault_users_email'), 'users', ['email'], unique=True, schema='identity_vault')

    # 2. Create Invitations table (interview_ops)
    op.create_table('invitations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('interviewer_id', sa.UUID(), nullable=False),
        sa.Column('role_title', sa.String(length=255), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.Enum('SCHEDULED', 'DELIVERED', 'ACCEPTED', 'COMPLETED', 'CANCELLED', name='invitationstatus'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        schema='interview_ops'
    )
    op.create_index(op.f('ix_interview_ops_invitations_code'), 'invitations', ['code'], unique=True, schema='interview_ops')
    op.create_index(op.f('ix_interview_ops_invitations_interviewer_id'), 'invitations', ['interviewer_id'], unique=False, schema='interview_ops')


def downgrade() -> None:
    op.drop_table('invitations', schema='interview_ops')
    op.drop_table('users', schema='identity_vault')
    sa.Enum(name='invitationstatus').drop(op.get_bind(), checkfirst=False)
    sa.Enum(name='userrole').drop(op.get_bind(), checkfirst=False)