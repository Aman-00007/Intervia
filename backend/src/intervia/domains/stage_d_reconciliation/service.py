import hmac
import hashlib
from typing import List, Dict, Any

class ReconciliationService:
    def __init__(self, secret_key: str):
        # In a real setup, this secret comes from your config.py
        self.secret_key = secret_key.encode('utf-8')

    def verify_hmac_chain(self, events: List[Dict[str, Any]]) -> bool:
        """
        Validates an offline event chain in sub-50ms. 
        Each event's hash must equal: HMAC256(secret_key, seq + timestamp_ms + event_type + previous_hash)
        """
        if not events:
            return True

        # "INIT" is the agreed-upon seed between React and FastAPI when a session starts
        prev_hash = "INIT" 

        # Ensure we process events in strict chronological order
        for event in sorted(events, key=lambda x: x['seq']):
            # Reconstruct the string exactly as the frontend signed it
            payload = f"{event['seq']}:{event['timestamp_ms']}:{event['event_type']}:{prev_hash}"
            
            # Calculate the expected HMAC SHA-256 hash
            expected_hash = hmac.new(
                self.secret_key,
                payload.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            # Use compare_digest to prevent timing attacks
            if not hmac.compare_digest(expected_hash, event['hmac_hash']):
                return False # Chain is broken! Tampering detected.
                
            prev_hash = event['hmac_hash']
        
        return True