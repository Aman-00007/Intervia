from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import insert
from typing import List, Dict, Any

from intervia.domains.stage_d_reconciliation.models import HMACChainLog, MediaChunkMeta, ReconnectAudit

class ReconciliationRepository:
    def __init__(self, db_session: AsyncSession):
        self.db = db_session

    async def bulk_insert_hmac_logs(self, session_id: UUID, logs_data: List[Dict[str, Any]]) -> None:
        if not logs_data:
            return
            
        prepared_logs = [
            {**log, "session_id": session_id} for log in logs_data
        ]
        
        stmt = insert(HMACChainLog).values(prepared_logs)
        await self.db.execute(stmt)
        await self.db.commit()

    async def bulk_insert_media_chunks(self, session_id: UUID, chunks_data: List[Dict[str, Any]]) -> None:
        if not chunks_data:
            return
            
        prepared_chunks = [
            {**chunk, "session_id": session_id} for chunk in chunks_data
        ]
        
        stmt = insert(MediaChunkMeta).values(prepared_chunks)
        await self.db.execute(stmt)
        await self.db.commit()

    async def create_reconnect_audit(self, session_id: UUID, offline_duration: int, level_1_passed: bool, flags: dict) -> ReconnectAudit:
        audit = ReconnectAudit(
            session_id=session_id,
            offline_duration_sec=offline_duration,
            level_1_validation_passed=level_1_passed,
            anomaly_flags=flags
        )
        self.db.add(audit)
        await self.db.commit()
        await self.db.refresh(audit)
        return audit