from typing import Dict, Any
from uuid import UUID

from intervia.domains.stage_b_workspace.schemas import CodeRunDTO, SharedAIPromptDTO
from intervia.domains.stage_b_workspace.repository import WorkspaceRepository
from intervia.infrastructure.sandbox_exec.judge0_client import judge0_client

class WorkspaceService:
    def __init__(self, repository: WorkspaceRepository):
        self.repo = repository

    async def execute_code(self, run_dto: CodeRunDTO) -> Dict[str, Any]:
        """Submits code to Judge0 and logs the execution metrics in the Ops DB."""
        
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
        
        # 3. Save telemetry to PostgreSQL via Day 3 Repository
        submission = await self.repo.save_code_submission(
            session_id=run_dto.session_id,
            language=run_dto.language,
            code=run_dto.source_code,
            passed=passed,
            execution_metrics={
                "execution_time_sec": time_sec,
                "memory_kb": memory_kb
            }
        )
        
        return {
            "submission_id": submission.id,
            "passed": submission.passed,
            "execution_time_sec": submission.execution_time_sec,
            "memory_kb": submission.memory_kb,
            "stdout": judge_result.get("stdout") or "",
            "stderr": judge_result.get("stderr") or "",
            "compile_output": judge_result.get("compile_output") or ""
        }

    async def handle_ai_chat(self, chat_dto: SharedAIPromptDTO) -> Dict[str, Any]:
        """
        Handles live shared AI prompts.
        """
        
        # FIXED: Removed the invalid chat_dto.language reference
        generated_response = "Simulated AI hint for the provided debugging context. (Nebius integration pending)"
        
        # Log the prompt and response into the DB for Stage D evaluation later
        chat_log = await self.repo.log_ai_interaction(
            session_id=chat_dto.session_id,
            prompt=chat_dto.prompt_text,
            response=generated_response
        )
        
        return {
            "chat_id": chat_log.id,
            "response_text": chat_log.response,
            "timestamp": chat_log.created_at
        }