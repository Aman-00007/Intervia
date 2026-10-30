import asyncio
import sys
from pathlib import Path

# Add backend/src to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend" / "src"))

from intervia.core.database import vault_engine, ops_engine, VaultBase, OpsBase, init_supabase_tables
# Import models so metadata knows all tables
import intervia.domains.auth.models
import intervia.domains.invitations.models
import intervia.domains.stage_a_onboarding.models
import intervia.domains.stage_b_workspace.models
import intervia.domains.stage_c_offline.models
import intervia.domains.stage_d_reconciliation.models
import intervia.domains.stage_e_reporting.models
from sqlalchemy import text

async def main():
    print("Connecting to Supabase PostgreSQL...")
    async with vault_engine.connect() as conn:
        res = await conn.execute(text("SELECT current_database(), current_user"))
        db, user = res.fetchone()
        print(f"Connected successfully! DB: {db}, User: {user}")

        res = await conn.execute(text("""
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_schema IN ('identity_vault', 'interview_ops', 'public')
            ORDER BY table_schema, table_name
        """))
        rows = res.fetchall()
        print(f"Existing tables ({len(rows)}):")
        for schema, name in rows:
            print(f"  - {schema}.{name}")

    print("\nEnsuring all tables are created via init_supabase_tables()...")
    await init_supabase_tables()
    print("Tables synchronized with Supabase!")

if __name__ == "__main__":
    asyncio.run(main())
