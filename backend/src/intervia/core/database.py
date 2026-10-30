from collections.abc import AsyncGenerator
from sqlalchemy import MetaData, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from intervia.core.config import get_settings
# from intervia.domains.auth.models import User 

settings = get_settings()

# Supabase pooler compatibility setting (prevents asyncpg prepared statement errors)
supabase_connect_args = {"statement_cache_size": 0}

# Engine 1: Strictly for Schema `identity_vault` (Stage A & Step 7 of Stage E ONLY)
vault_engine = create_async_engine(
    settings.VAULT_DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    connect_args=supabase_connect_args,
)
VaultSessionLocal = async_sessionmaker(vault_engine, class_=AsyncSession, expire_on_commit=False)

# Engine 2: Strictly for Schema `interview_ops` (All AI, Code, HMAC, and Transcripts)
ops_engine = create_async_engine(
    settings.OPS_DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    connect_args=supabase_connect_args,
)
OpsSessionLocal = async_sessionmaker(ops_engine, class_=AsyncSession, expire_on_commit=False)


class VaultBase(DeclarativeBase):
    metadata = MetaData(schema="identity_vault")


class OpsBase(DeclarativeBase):
    metadata = MetaData(schema="interview_ops")


async def init_supabase_tables() -> None:
    """Creates both schemas and all registered tables in Supabase PostgreSQL."""
    async with vault_engine.begin() as conn:
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS identity_vault;"))
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS interview_ops;"))
        await conn.run_sync(VaultBase.metadata.create_all)
        await conn.run_sync(OpsBase.metadata.create_all)


async def get_vault_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for injecting identity vault sessions."""
    async with VaultSessionLocal() as session:
        yield session


async def get_ops_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for injecting interview operations sessions."""
    async with OpsSessionLocal() as session:
        yield session

async def get_ops_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for injecting interview operations sessions."""
    async with OpsSessionLocal() as session:
        yield session
