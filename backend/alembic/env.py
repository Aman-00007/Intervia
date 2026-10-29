import asyncio
import os
from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlalchemy import pool
from alembic import context
from dotenv import load_dotenv
from intervia.core.database import VaultBase
from intervia.domains.auth.models import User
from intervia.domains.invitations.models import Invitation

# 1. Load the Supabase URLs from your .env file
load_dotenv()

config = context.config

# 2. TELL ALEMBIC WHERE YOUR MODELS ARE
target_metadata = VaultBase.metadata

def do_run_migrations(connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata
    )
    with context.begin_transaction():
        context.run_migrations()

async def run_async_migrations() -> None:
    db_url = os.getenv("VAULT_DATABASE_URL")
    if not db_url:
        raise ValueError("VAULT_DATABASE_URL is missing from your .env file!")
        
    config_section = config.get_section(config.config_ini_section) or {}
    config_section["sqlalchemy.url"] = db_url
    
    connectable = async_engine_from_config(
        config_section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args={"statement_cache_size": 0},
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()

def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())

if context.is_offline_mode():
    context.configure(
        url=os.getenv("VAULT_DATABASE_URL"), 
        target_metadata=target_metadata # <-- ADD THIS
    )
    with context.begin_transaction():
        context.run_migrations()
else:
    run_migrations_online()