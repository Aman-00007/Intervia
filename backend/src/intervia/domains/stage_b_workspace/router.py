# src/intervia/domains/stage_b_workspace/router.py
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, List
import json
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from sqlalchemy import insert
from intervia.domains.stage_b_workspace.models import Transcript 
from fastapi import BackgroundTasks
from intervia.workers.job_compile_reports import compile_interview_reports


from intervia.core.database import get_ops_db
from intervia.domains.stage_b_workspace.schemas import (
    CodeRunDTO, CodeRunResponseDTO, SharedAIPromptDTO, SharedAIResponseDTO
)
from intervia.domains.stage_b_workspace.models import SecurityLog
from intervia.domains.stage_b_workspace.service import WorkspaceService
from intervia.domains.stage_b_workspace.repository import WorkspaceRepository
from intervia.infrastructure.sandbox_exec.yjs_crdt_hub import yjs_crdt_hub

router = APIRouter(tags=["Stage B: Live Workspace"])

def get_workspace_service(db_session: AsyncSession = Depends(get_ops_db)) -> WorkspaceService:
    repo = WorkspaceRepository(db_session)
    return WorkspaceService(repo)

# ==========================================
# 1. STANDARD HTTP ENDPOINTS
# ==========================================

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

# ==========================================
# 2. ANTI-CHEAT TELEMETRY (Figma: Tab Switching)
# ==========================================

class SecurityEventDTO(BaseModel):
    session_id: UUID
    event_type: str  # "TAB_SWITCH", "PASTE_BLOCKED", "FULLSCREEN_EXIT"
    timestamp: datetime
    details: dict = {}

@router.post("/security-event")
async def log_security_event(
    payload: SecurityEventDTO,
    db: AsyncSession = Depends(get_ops_db)
):
    """
    Receives anti-cheat telemetry from the frontend and saves it.
    """
    new_log = SecurityLog(
        session_id=payload.session_id,
        event_type=payload.event_type,
        details=payload.details
    )
    db.add(new_log)
    await db.commit()
    
    return {"status": "logged", "event": payload.event_type}

# ==========================================
# 3. REAL-TIME WEBSOCKETS
# ==========================================

# --- A. Yjs Collaborative Code Editor ---
@router.websocket("/ws/yjs/{session_id}")
async def yjs_websocket_endpoint(websocket: WebSocket, session_id: str):
    """Real-time collaborative editing endpoint (Yjs)."""
    await yjs_crdt_hub.handle_websocket(session_id, websocket)

# --- B. WebRTC Video/Audio Signaling ---
class WebRTCManager:
    def __init__(self):
        self.rooms: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, ws: WebSocket, room_id: str):
        await ws.accept()
        if room_id not in self.rooms: 
            self.rooms[room_id] = []
        self.rooms[room_id].append(ws)
        
    def disconnect(self, ws: WebSocket, room_id: str):
        if room_id in self.rooms and ws in self.rooms[room_id]:
            self.rooms[room_id].remove(ws)
            if not self.rooms[room_id]:
                del self.rooms[room_id]

    async def broadcast(self, message: str, room_id: str):
        for connection in self.rooms.get(room_id, []):
            await connection.send_text(message)

webrtc_manager = WebRTCManager()

@router.websocket("/ws/webrtc/{session_id}")
async def webrtc_signaling(websocket: WebSocket, session_id: str):
    """
    Handles WebRTC Offer/Answer/ICE candidates for the live video feed.
    """
    await webrtc_manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_text()
            await webrtc_manager.broadcast(data, session_id)
    except WebSocketDisconnect:
        webrtc_manager.disconnect(websocket, session_id)

# --- C. Private vs Shared AI Window ---
class SharedAIManager:
    def __init__(self):
        # Maps session_id -> {"is_shared": bool, "INTERVIEWER": WebSocket, "CANDIDATE": WebSocket}
        self.sessions: Dict[str, dict] = {}
    
    async def connect(self, ws: WebSocket, session_id: str, role: str):
        await ws.accept()
        if session_id not in self.sessions:
            self.sessions[session_id] = {"is_shared": False, "INTERVIEWER": None, "CANDIDATE": None}
        self.sessions[session_id][role] = ws
        
    def disconnect(self, session_id: str, role: str):
        if session_id in self.sessions:
            self.sessions[session_id][role] = None

    def toggle_sharing(self, session_id: str, is_shared: bool):
        if session_id in self.sessions:
            self.sessions[session_id]["is_shared"] = is_shared

    async def relay_message(self, session_id: str, sender_role: str, message: str):
        if session_id not in self.sessions:
            return

        session = self.sessions[session_id]
        interviewer_ws = session["INTERVIEWER"]
        candidate_ws = session["CANDIDATE"]

        # If the interviewer sends a message
        if sender_role == "INTERVIEWER":
            # Always echo to interviewer
            if interviewer_ws:
                await interviewer_ws.send_text(message)
            # Only send to candidate if sharing is ON
            if session["is_shared"] and candidate_ws:
                await candidate_ws.send_text(message)

        # If the candidate sends a message (only possible if shared)
        elif sender_role == "CANDIDATE":
            if session["is_shared"]:
                if interviewer_ws:
                    await interviewer_ws.send_text(message)
                if candidate_ws:
                    await candidate_ws.send_text(message)

ai_manager = SharedAIManager()

class AIToggleDTO(BaseModel):
    session_id: str
    is_shared: bool

@router.post("/ai-toggle")
async def toggle_ai_sharing(payload: AIToggleDTO):
    """Toggles whether the AI window is visible to the candidate."""
    ai_manager.toggle_sharing(payload.session_id, payload.is_shared)
    return {"status": "success", "is_shared": payload.is_shared}

@router.websocket("/ws/ai/{session_id}/{role}")
async def websocket_shared_ai(websocket: WebSocket, session_id: str, role: str):
    """
    Role-based WebSocket for the AI Window.
    Role must be 'INTERVIEWER' or 'CANDIDATE'.
    """
    if role not in ["INTERVIEWER", "CANDIDATE"]:
        await websocket.close(code=1008)
        return

    await ai_manager.connect(websocket, session_id, role)
    try:
        while True:
            data = await websocket.receive_text()
            await ai_manager.relay_message(session_id, role, data)
    except WebSocketDisconnect:
        ai_manager.disconnect(session_id, role)

@router.post("/end-interview")
async def end_interview(
    session_id: UUID, 
    candidate_id: str, 
    background_tasks: BackgroundTasks
):
    """
    Called when the interviewer clicks 'End interview'.
    It immediately returns success to the UI, while the heavy AI report generation 
    happens in the background so the interviewer doesn't have to wait.
    """
    # This tells FastAPI to run your worker in the background
    background_tasks.add_task(compile_interview_reports, session_id, candidate_id)
    
    return {
        "status": "success", 
        "message": "Interview ended. Report generation started in the background."
    }
class TranscriptDTO(BaseModel):
    session_id: UUID
    speaker: str # "STUDENT" or "INTERVIEWER"
    text_content: str

@router.post("/transcript")
async def receive_transcript(
    payload: TranscriptDTO,
    db: AsyncSession = Depends(get_ops_db)
):
    """Receives local STT text from the frontend, applies PII shield, and saves."""
    from intervia.infrastructure.privacy.presidio_engine import pii_shield
    
    # 1. Scrub any PII that slipped through the browser
    safe_text = pii_shield.scrub_text(payload.text_content)
    
    # 2. Save to DB
    await db.execute(insert(Transcript).values(
        session_id=payload.session_id,
        speaker=payload.speaker,
        text_content=safe_text
    ))
    await db.commit()
    return {"status": "saved"}