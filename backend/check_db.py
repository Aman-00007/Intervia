import asyncio
import os
import sys

sys.path.append(os.path.join(os.getcwd(), 'backend', 'src'))

from intervia.core.database import VaultSessionLocal
from sqlalchemy import text

async def check():
    async with VaultSessionLocal() as s:
        res = await s.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'userrole';"))
        rows = [r[0] for r in res.fetchall()]
        print("DB UserRole enum values:", rows)
        
        # Check users table schema
        res_cols = await s.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='identity_vault' AND table_name='users';"))
        print("identity_vault.users columns:", res_cols.fetchall())

if __name__ == '__main__':
    asyncio.run(check())
