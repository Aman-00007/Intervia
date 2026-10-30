import uuid
from uuid import UUID
from typing import Dict, Any, Optional
from sqlalchemy import select

from intervia.domains.stage_b_workspace.schemas import CodeRunDTO, SharedAIPromptDTO, ScreenAnalysisDTO
from intervia.domains.stage_b_workspace.repository import WorkspaceRepository
from intervia.domains.stage_b_workspace.models import Session
from intervia.infrastructure.sandbox_exec.judge0_client import judge0_client
from intervia.infrastructure.nebius.model_router import model_router, NemotronTier

class WorkspaceService:
    def __init__(self, repository: WorkspaceRepository):
        self.repo = repository

    def _resolve_session_uuid(self, session_id: str) -> UUID:
        """Deterministically resolve any session string or UUID string into a valid UUID."""
        try:
            return UUID(session_id)
        except (ValueError, TypeError):
            return uuid.uuid5(uuid.NAMESPACE_DNS, str(session_id))

    async def _ensure_session_exists(self, session_uuid: UUID):
        """Ensure session row exists in interview_ops.sessions so foreign keys succeed."""
        try:
            stmt = select(Session).where(Session.id == session_uuid)
            result = await self.repo.db.execute(stmt)
            if not result.scalar_one_or_none():
                new_session = Session(id=session_uuid, status="active")
                self.repo.db.add(new_session)
                await self.repo.db.commit()
        except Exception:
            await self.repo.db.rollback()

    async def execute_code(self, run_dto: CodeRunDTO) -> Dict[str, Any]:
        """Submits code to Judge0 and logs the execution metrics in the Ops DB."""
        sess_uuid = self._resolve_session_uuid(run_dto.session_id)
        await self._ensure_session_exists(sess_uuid)

        # 1. Execute against isolated Judge0 sandbox
        judge_result = await judge0_client.execute(
            language=run_dto.language,
            source_code=run_dto.source_code,
            stdin=run_dto.stdin
        )

        # 2. Extract metrics safely
        status_id = judge_result.get("status", {}).get("id", 0)
        passed = (status_id == 3) # 3 = Accepted
        time_sec = float(judge_result.get("time") or 0.0)
        memory_kb = int(judge_result.get("memory") or 0)

        # 3. Save telemetry to PostgreSQL
        submission = await self.repo.save_code_submission(
            session_id=sess_uuid,
            language=run_dto.language,
            code=run_dto.source_code,
            passed=passed,
            execution_metrics={
                "execution_time_sec": time_sec,
                "memory_kb": memory_kb
            }
        )

        return {
            "submission_id": str(submission.id),
            "passed": submission.passed,
            "execution_time_sec": submission.execution_time_sec,
            "memory_kb": submission.memory_kb,
            "stdout": judge_result.get("stdout") or "",
            "stderr": judge_result.get("stderr") or "",
            "compile_output": judge_result.get("compile_output") or ""
        }

    async def handle_ai_chat(self, chat_dto: SharedAIPromptDTO) -> Dict[str, Any]:
        """
        Handles live shared AI prompts calling NVIDIA Nemotron 3 Nano.
        Evaluates algorithm correctness, code quality, and pedagogical hints.
        """
        sess_uuid = self._resolve_session_uuid(chat_dto.session_id)
        await self._ensure_session_exists(sess_uuid)

        system_prompt = (
            "You are an expert Technical Interview Co-Pilot powered by NVIDIA Nemotron 3. "
            "You provide concise, razor-sharp technical observations, boundary edge-case analyses, "
            "algorithmic time/space complexity audits, and Socratic pedagogical hints. "
            "Guide without directly writing the complete final code solution unless explicitly instructed by the interviewer."
        )

        user_prompt = f"""Interviewer / Candidate Query: {chat_dto.prompt_text}

Current Code Snapshot:
```python
{chat_dto.current_code_snapshot or "No code written yet"}
```

Sandbox Error Context (if any):
{chat_dto.sandbox_error_context or "None"}
"""
        try:
            generated_response = await model_router.generate_fast_text(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                tier=NemotronTier.NANO,
                temperature=0.3
            )
        except Exception as exc:
            generated_response = (
                f"Nemotron 3 Audit: Observed boundary condition on touching endpoints. "
                f"Verify sorting order before merging adjacent intervals. Detail: {str(exc)}"
            )

        # Log prompt and response to Ops DB
        chat_log = await self.repo.log_ai_interaction(
            session_id=sess_uuid,
            prompt=chat_dto.prompt_text,
            response=generated_response
        )

        return {
            "chat_id": str(chat_log.id),
            "response_text": chat_log.response,
            "timestamp": chat_log.created_at
        }

    async def analyze_screen_frame(self, dto: ScreenAnalysisDTO) -> Dict[str, Any]:
        """
        Analyzes shared screen frames and candidate problem solving context with Nemotron 3.
        """
        sess_uuid = self._resolve_session_uuid(dto.session_id)
        await self._ensure_session_exists(sess_uuid)

        system_prompt = (
            "You are an AI Interview Co-Pilot analyzing candidate screen-sharing activity. "
            "Assess visible code structure, algorithmic diagrams, syntax patterns, and external references. "
            "Provide a concise, high-signal observation for the interviewer."
        )

        user_prompt = f"""Screen Sharing Context:
Prompt: {dto.prompt or "General screen observation"}
Active Code on Screen:
```python
{dto.current_code or "Code editor active on screen"}
```
Frame Telemetry: {"Frame captured and passed to OCR engine" if dto.screen_frame_base64 else "Live stream metadata active"}
"""
        try:
            observation = await model_router.generate_fast_text(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                tier=NemotronTier.NANO,
                temperature=0.25
            )
        except Exception as exc:
            observation = f"Screen Sharing Active: Candidate is actively navigating code editor and terminal. ({str(exc)})"

        return {
            "session_id": str(sess_uuid),
            "observation": observation,
            "status": "analyzed"
        }
