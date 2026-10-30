# src/intervia/domains/stage_d_reconciliation/risk_scoring.py
from typing import Dict, List

def calculate_risk_level(audit_flags: Dict[str, bool], security_events: List[str]) -> str:
    """
    Calculates Risk Level based on the exact weights from the Features Document.
    """
    score = 0
    
    # High Weight Signals (+3)
    if not audit_flags.get("level_1_validation_passed", True): score += 3 # Broken logs
    if "LARGE_PASTE" in security_events: score += 3 # Large paste
    if "MULTIPLE_FACES" in security_events or "SECOND_VOICE" in security_events: score += 3
    
    # Medium Weight Signals (+2)
    if "QUALITY_JUMP" in security_events: score += 2
    if "DISCONNECT_AFTER_QUESTION" in security_events: score += 2
    
    # Low Weight Signals (+1)
    if "FACE_ABSENT_BRIEFLY" in security_events: score += 1

    # Determine Risk Level
    if score >= 3:
        return "HIGH"
    elif score >= 2:
        return "MEDIUM"
    else:
        return "LOW"