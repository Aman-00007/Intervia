import asyncio
import os
from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlalchemy import pool
from alembic import context
from dotenv import load_dotenv

# 1. Load the Supabase URLs from your .env file
load_dotenv()

config = context.config

def do_run_migrations(connection) -> None:
    context.configure(connection=connection)
    with context.begin_transaction():
        context.run_migrations()

async def run_async_migrations() -> None:
    # 2. Grab your Supabase URL securely
    db_url = os.getenv("VAULT_DATABASE_URL")
    if not db_url:
        raise ValueError("VAULT_DATABASE_URL is missing from your .env file!")
        
    config_section = config.get_section(config.config_ini_section) or {}
    config_section["sqlalchemy.url"] = db_url
    
    # 3. Connect to Supabase securely
   # 3. Connect to Supabase securely
    connectable = async_engine_from_config(
        config_section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args={"statement_cache_size": 0},  # <-- ADD THIS LINE
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()

def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())

if context.is_offline_mode():
    context.configure(url=os.getenv("VAULT_DATABASE_URL"))
    with context.begin_transaction():
        context.run_migrations()
else:
    run_migrations_online()