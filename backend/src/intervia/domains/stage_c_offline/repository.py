# src/intervia/domains/stage_c_offline/repository.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from .models import OfflineSession, OfflineLogEntry, MediaChunk
from .schemas import LogEntryCreate, MediaChunkCreate

class OfflineRepository:
    def __init__(self, db_session: AsyncSession):
        self.db = db_session

    async def create_session(self, session_id: UUID, started_at) -> OfflineSession:
        offline_session = OfflineSession(
            session_id=session_id,
            started_at=started_at,
            status="ACTIVE"
        )
        self.db.add(offline_session)
        await self.db.commit()
        await self.db.refresh(offline_session)
        return offline_session

    async def get_session(self, offline_session_id: UUID) -> OfflineSession | None:
        stmt = select(OfflineSession).where(OfflineSession.id == offline_session_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def mark_reconnected(self, offline_session: OfflineSession, ended_at):
        offline_session.ended_at = ended_at
        offline_session.status = "RECONNECTED"
        await self.db.commit()
        await self.db.refresh(offline_session)
        return offline_session

    async def save_logs(self, offline_session_id: UUID, logs: list[LogEntryCreate]):
        db_logs = []
        for log in logs:
            db_log = OfflineLogEntry(
                offline_session_id=offline_session_id,
                sequence_number=log.sequence_number,
                event_type=log.event_type,
                payload=log.payload,
                hmac_hash=log.hmac_hash,
                previous_hash=log.previous_hash
            )
            self.db.add(db_log)
            db_logs.append(db_log)
        await self.db.commit()
        return len(db_logs)

    async def save_media_chunks(self, offline_session_id: UUID, chunks: list[MediaChunkCreate]):
        db_chunks = []
        for chunk in chunks:
            db_chunk = MediaChunk(
                offline_session_id=offline_session_id,
                chunk_index=chunk.chunk_index,
                s3_key=chunk.s3_key,
                chunk_hash=chunk.chunk_hash,
                recorded_at=chunk.recorded_at
            )
            self.db.add(db_chunk)
            db_chunks.append(db_chunk)
        await self.db.commit()
        return len(db_chunks)