from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Sequence

from intervia.domains.stage_b_workspace.models import CodeSubmission, SharedAIChat, Session

class WorkspaceRepository:
    def __init__(self, db_session: AsyncSession):
        self.db = db_session

    async def save_code_submission(self, session_id: UUID, language: str, code: str, passed: bool, execution_metrics: dict) -> CodeSubmission:
        submission = CodeSubmission(
            session_id=session_id,
            language=language,
            source_code=code,
            passed=passed,
            execution_time_sec=execution_metrics.get("execution_time_sec", 0.0),
            memory_kb=execution_metrics.get("memory_kb", 0)
        )
        self.db.add(submission)
        await self.db.commit()
        await self.db.refresh(submission)
        return submission

    async def log_ai_interaction(self, session_id: UUID, prompt: str, response: str) -> SharedAIChat:
        chat_log = SharedAIChat(
            session_id=session_id,
            prompt=prompt,
            response=response
        )
        self.db.add(chat_log)
        await self.db.commit()
        await self.db.refresh(chat_log)
        return chat_log

    async def get_session_chat_history(self, session_id: UUID) -> Sequence[SharedAIChat]:
        stmt = select(SharedAIChat).where(SharedAIChat.session_id == session_id).order_by(SharedAIChat.created_at.asc())
        result = await self.db.execute(stmt)
        return result.scalars().all()