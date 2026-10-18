import logging
import re
from typing import Any
import structlog

# Simple regex patterns to catch obvious PII in logs before they reach the console
EMAIL_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
PHONE_REGEX = re.compile(r"\+?\d{10,14}")


def pii_masking_processor(logger: logging.Logger, log_method: str, event_dict: dict[str, Any]) -> dict[str, Any]:
    """Scans all log messages and masks emails/phone numbers with [REDACTED]."""
    for key, value in event_dict.items():
        if isinstance(value, str):
            # Mask emails
            value = EMAIL_REGEX.sub("[REDACTED_EMAIL]", value)
            # Mask phone numbers
            value = PHONE_REGEX.sub("[REDACTED_PHONE]", value)
            event_dict[key] = value
    return event_dict


def setup_json_logger() -> structlog.BoundLogger:
    """Configures a production-grade JSON logger that prevents PII leaks."""
    
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,
            structlog.processors.TimeStamper(fmt="iso"),
            pii_masking_processor,  # Our custom security filter runs here!
            structlog.processors.JSONRenderer() # Outputs logs as clean JSON strings
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    return structlog.get_logger()

# Export the configured logger for the rest of the app to use
logger = setup_json_logger()