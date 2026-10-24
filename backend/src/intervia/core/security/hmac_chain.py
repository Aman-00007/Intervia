import hashlib
import hmac
import secrets
from dataclasses import dataclass
from typing import Any


@dataclass
class HMACVerificationResult:
    """Stores the result of checking the student's offline log chain (like a C++ struct)."""
    is_valid: bool
    total_entries: int
    broken_at_seq: int | None = None
    missing_sequences: list[int] | None = None
    high_risk_events: list[dict[str, Any]] | None = None
    reason: str = "CHAIN_INTACT"


class HMACChainVerifier:
    @staticmethod
    def generate_server_seed() -> str:
        """Creates a random 64-character hex secret key at the start of the interview."""
        return secrets.token_hex(32)

    @staticmethod
    def compute_entry_hmac(
        seed_hex: str,
        prev_hash: str,
        seq: int,
        timestamp_ms: int,
        event_type: str,
        payload_digest: str,
    ) -> str:
        """Calculates HMAC-SHA256(seed, prev_hash | seq | timestamp | event | payload)."""
        key = bytes.fromhex(seed_hex)
        message = f"{prev_hash}|{seq}|{timestamp_ms}|{event_type}|{payload_digest}".encode("utf-8")
        return hmac.new(key, message, hashlib.sha256).hexdigest()

    @classmethod
    def verify_chain(
        cls,
        seed_hex: str,
        entries: list[dict[str, Any]],
    ) -> HMACVerificationResult:
        """Loops through all offline logs when Wi-Fi reconnects and verifies nobody cheated."""
        if not entries:
            return HMACVerificationResult(is_valid=True, total_entries=0, reason="EMPTY_CHAIN")

        prev_hash = seed_hex
        expected_seq = 1
        high_risk_events: list[dict[str, Any]] = []

        for item in entries:
            seq = int(item["seq"])
            ts = int(item["timestamp_ms"])
            event_type = str(item["event_type"])
            payload_digest = str(item.get("payload_digest", ""))
            client_hmac = str(item["hmac_hash"])

            # CHECK 1: Did the student delete a log row in Chrome DevTools? (e.g., seq jumped 1 -> 3)
            if seq != expected_seq:
                missing = list(range(expected_seq, seq))
                return HMACVerificationResult(
                    is_valid=False,
                    total_entries=len(entries),
                    broken_at_seq=seq,
                    missing_sequences=missing,
                    reason=f"DELETED_LOGS_DETECTED: Missing sequence numbers {missing}",
                )

            # CHECK 2: Re-calculate the hash on the server to see if they edited the text/timestamp
            expected_hmac = cls.compute_entry_hmac(
                seed_hex=seed_hex,
                prev_hash=prev_hash,
                seq=seq,
                timestamp_ms=ts,
                event_type=event_type,
                payload_digest=payload_digest,
            )

            if not hmac.compare_digest(expected_hmac, client_hmac):
                return HMACVerificationResult(
                    is_valid=False,
                    total_entries=len(entries),
                    broken_at_seq=seq,
                    reason=f"TAMPERED_LOG_AT_SEQ_{seq}: Hash mismatch!",
                )

            # CHECK 3: Collect suspicious events so the interviewer gets an instant popup
            if event_type in {"LARGE_PASTE", "MULTI_FACE_DETECTED", "TAB_SWITCH", "FULLSCREEN_EXIT"}:
                high_risk_events.append(item)

            prev_hash = expected_hmac
            expected_seq += 1

        return HMACVerificationResult(
            is_valid=True,
            total_entries=len(entries),
            high_risk_events=high_risk_events,
            reason="CHAIN_VERIFIED_OK",
        )