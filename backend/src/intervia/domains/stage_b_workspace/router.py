from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from typing import AsyncGenerator

from intervia.domains.stage_b_workspace.schemas import CodeRunDTO, CodeRunResponseDTO, SharedAIPromptDTO, SharedAIResponseDTO
from intervia.domains.stage_b_workspace.service import WorkspaceService
from intervia.domains.stage_b_workspace.repository import WorkspaceRepository
from intervia.infrastructure.sandbox_exec.yjs_crdt_hub import yjs_crdt_hub

router = APIRouter(prefix="/v1/workspace", tags=["Stage B: Live Workspace"])

# Stub for Database session dependency (Track A handles the actual session maker)
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    yield None

def get_workspace_service(db_session: AsyncSession = Depends(get_db_session)) -> WorkspaceService:
    repo = WorkspaceRepository(db_session)
    return WorkspaceService(repo)

@router.post("/run", response_model=CodeRunResponseDTO)
async def run_candidate_code(
    payload: CodeRunDTO,
    service: WorkspaceService = Depends(get_workspace_service)
):
    """Executes candidate code via Judge0 and logs telemetry."""
    return await service.execute_code(payload)

@router.post("/ai-chat", response_model=SharedAIResponseDTO)
async def ask_shared_ai(
    payload: SharedAIPromptDTO,
    service: WorkspaceService = Depends(get_workspace_service)
):
    """Sends candidate query to Nebius AI and returns strict pedagogical hints."""
    return await service.handle_ai_chat(payload)

@router.websocket("/ws/yjs/{session_id}")
async def yjs_websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    Real-time collaborative editing endpoint.
    Delegates all PyCRDT sync and AST diffing logic to the Day 2 YjsCRDTHub.
    """
    await yjs_crdt_hub.handle_websocket(session_id, websocket)