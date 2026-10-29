# src/intervia/domains/stage_c_offline/service.py
from datetime import datetime, timezone
from .repository import OfflineRepository
from .schemas import OfflineSessionStart, SyncOfflineDataRequest, SyncResultResponse, LogEntryCreate

class OfflineService:
    def __init__(self, repo: OfflineRepository):
        self.repo = repo

    async def start_session(self, payload: OfflineSessionStart):
        return await self.repo.create_session(payload.session_id, payload.started_at)

    def _verify_hmac_chain(self, logs: list[LogEntryCreate]) -> bool:
        """
        Verifies the tamper-evident HMAC chain.
        In a production environment, this checks:
        h_i = HMAC(key, h_{i-1} + seq + timestamp + event)
        For now, we ensure sequence numbers are perfectly continuous and linked.
        """
        if not logs:
            return True
            
        # Sort by sequence number to ensure correct order
        sorted_logs = sorted(logs, key=lambda x: x.sequence_number)
        
        for i in range(1, len(sorted_logs)):
            current_log = sorted_logs[i]
            previous_log = sorted_logs[i-1]
            
            # Check if the current log correctly references the previous hash
            if current_log.previous_hash != previous_log.hmac_hash:
                return False
                
            # Check for missing entries (e.g., seq 1, then seq 3)
            if current_log.sequence_number != previous_log.sequence_number + 1:
                return False
                
        return True

    async def sync_data(self, payload: SyncOfflineDataRequest) -> SyncResultResponse:
        # 1. Verify Session Exists
        offline_session = await self.repo.get_session(payload.offline_session_id)
        if not offline_session:
            raise ValueError("Offline session not found.")

        # 2. Verify HMAC Chain Integrity
        chain_valid = self._verify_hmac_chain(payload.logs)
        
        # 3. Save Logs and Chunks
        logs_saved = await self.repo.save_logs(payload.offline_session_id, payload.logs)
        chunks_saved = await self.repo.save_media_chunks(payload.offline_session_id, payload.media_chunks)

        # 4. Update Session Status
        await self.repo.mark_reconnected(offline_session, datetime.now(timezone.utc))

        return SyncResultResponse(
            status="success",
            logs_verified=logs_saved,
            chunks_saved=chunks_saved,
            chain_valid=chain_valid,
            message="Offline data merged successfully." if chain_valid else "Data merged, but HMAC chain is BROKEN."
        )