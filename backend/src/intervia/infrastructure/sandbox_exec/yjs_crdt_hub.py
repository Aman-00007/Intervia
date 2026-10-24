import ast
import asyncio
import difflib
import re
from typing import Any
from fastapi import WebSocket, WebSocketDisconnect
from pycrdt import Doc, Text

from intervia.core.logging import logger


class CRDTWorkspaceRoom:
    """Represents a single live interview coding room backed by a Yjs CRDT Document."""

    def __init__(self, session_id: str) -> None:
        self.session_id = session_id
        self.ydoc = Doc()
        self.ytext = self.ydoc.get("monaco_editor", type=Text)
        self.clients: set[WebSocket] = set()
        self.pre_gap_snapshot: str = ""
        self._lock = asyncio.Lock()

    def get_current_code(self) -> str:
        return str(self.ytext)

    def mark_offline_snapshot(self) -> str:
        """Captures the exact code state at the moment a candidate drops offline."""
        self.pre_gap_snapshot = self.get_current_code()
        return self.pre_gap_snapshot

    async def apply_binary_update(self, update_bytes: bytes, sender: WebSocket | None = None) -> None:
        """Applies a binary Yjs state update to the server CRDT and broadcasts to peers."""
        async with self._lock:
            self.ydoc.apply_update(update_bytes)

        dead_clients: list[WebSocket] = []
        for client in self.clients:
            if client is not sender:
                try:
                    await client.send_bytes(update_bytes)
                except Exception:
                    dead_clients.append(client)

        for dead in dead_clients:
            self.clients.discard(dead)


class YjsCRDTHub:
    """
    Manages active Yjs CRDT rooms across concurrent interviews and computes
    structural AST diffs before and after offline Wi-Fi disconnects.
    """

    def __init__(self) -> None:
        self._rooms: dict[str, CRDTWorkspaceRoom] = {}

    def get_or_create_room(self, session_id: str) -> CRDTWorkspaceRoom:
        if session_id not in self._rooms:
            self._rooms[session_id] = CRDTWorkspaceRoom(session_id)
        return self._rooms[session_id]

    async def handle_websocket(self, session_id: str, websocket: WebSocket) -> None:
        """Handles the full lifecycle of a client connecting to WS /v1/ws/yjs/{session_id}."""
        await websocket.accept()
        room = self.get_or_create_room(session_id)
        room.clients.add(websocket)

        logger.info("yjs_client_connected", session_id=session_id, active_peers=len(room.clients))

        try:
            # Push the full current CRDT state immediately upon connection/reconnection
            initial_state = room.ydoc.get_update()
            await websocket.send_bytes(initial_state)

            while True:
                update_bytes = await websocket.receive_bytes()
                await room.apply_binary_update(update_bytes, sender=websocket)
        except WebSocketDisconnect:
            room.mark_offline_snapshot()
            logger.info("yjs_client_disconnected", session_id=session_id)
        except Exception as exc:
            room.mark_offline_snapshot()
            logger.error("yjs_ws_error", session_id=session_id, error=str(exc))
        finally:
            room.clients.discard(websocket)

    @staticmethod
    def _extract_structural_metrics(code: str, language: str = "python") -> dict[str, int]:
        """
        Extracts structural complexity (functions, classes, loops, branches).
        Uses native `ast` for Python and structural token regex for C++/Java/JS.
        """
        if not code.strip():
            return {"functions": 0, "classes": 0, "loops": 0, "branches": 0, "total_nodes": 0}

        if language.lower() == "python":
            try:
                tree = ast.parse(code)
                funcs = sum(1 for n in ast.walk(tree) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)))
                classes = sum(1 for n in ast.walk(tree) if isinstance(n, ast.ClassDef))
                loops = sum(1 for n in ast.walk(tree) if isinstance(n, (ast.For, ast.While, ast.AsyncFor)))
                branches = sum(1 for n in ast.walk(tree) if isinstance(n, (ast.If, ast.Try, ast.Match)))
                total = sum(1 for _ in ast.walk(tree))
                return {
                    "functions": funcs,
                    "classes": classes,
                    "loops": loops,
                    "branches": branches,
                    "total_nodes": total,
                }
            except SyntaxError:
                pass  # Fallback to regex heuristics if candidate code has mid-typing syntax errors

        # Heuristic structural scan for C / C++ / Java / JS / TS or unparseable Python
        funcs = len(re.findall(r"\b(def|function|void|int|string|bool|public|private)\s+\w+\s*\(", code))
        classes = len(re.findall(r"\b(class|struct|interface)\s+\w+", code))
        loops = len(re.findall(r"\b(for|while)\s*\(", code))
        branches = len(re.findall(r"\b(if|else\s+if|switch|catch)\s*\(", code))
        return {
            "functions": funcs,
            "classes": classes,
            "loops": loops,
            "branches": branches,
            "total_nodes": funcs + classes + loops + branches,
        }

    def compute_pre_post_gap_diff(
        self,
        pre_code: str,
        post_code: str,
        offline_duration_sec: int,
        language: str = "python",
    ) -> dict[str, Any]:
        """
        Compares the code snapshot before a Wi-Fi drop against the merged code after reconnect.
        Detects anomalous copy-paste bursts or external code injection during the blind spot.
        """
        pre_lines = [line for line in pre_code.splitlines() if line.strip()]
        post_lines = [line for line in post_code.splitlines() if line.strip()]

        unified_diff = list(
            difflib.unified_diff(
                pre_code.splitlines(),
                post_code.splitlines(),
                fromfile="pre_offline",
                tofile="post_reconnect",
                lineterm="",
            )
        )

        added_lines = sum(1 for line in unified_diff if line.startswith("+") and not line.startswith("+++"))
        removed_lines = sum(1 for line in unified_diff if line.startswith("-") and not line.startswith("---"))

        pre_ast = self._extract_structural_metrics(pre_code, language)
        post_ast = self._extract_structural_metrics(post_code, language)

        ast_delta = {
            "new_functions": max(0, post_ast["functions"] - pre_ast["functions"]),
            "new_classes": max(0, post_ast["classes"] - pre_ast["classes"]),
            "new_loops": max(0, post_ast["loops"] - pre_ast["loops"]),
            "new_branches": max(0, post_ast["branches"] - pre_ast["branches"]),
        }

        duration_min = max(offline_duration_sec / 60.0, 0.1)
        lines_per_minute = round(added_lines / duration_min, 2)

        # Security Flag: >35 meaningful lines/min or >=2 complete functions written during a brief drop
        suspicious_burst = (added_lines >= 15 and lines_per_minute > 35.0) or (
            offline_duration_sec < 45 and ast_delta["new_functions"] >= 2
        )

        return {
            "offline_duration_sec": offline_duration_sec,
            "pre_line_count": len(pre_lines),
            "post_line_count": len(post_lines),
            "added_lines": added_lines,
            "removed_lines": removed_lines,
            "lines_per_minute_rate": lines_per_minute,
            "ast_structural_delta": ast_delta,
            "suspicious_offline_burst": suspicious_burst,
            "unified_diff_patch": "\n".join(unified_diff[:100]),
        }


yjs_crdt_hub = YjsCRDTHub()