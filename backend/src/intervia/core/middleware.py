import time
import uuid
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import logging

# Fallback logger if structlog is not fully initialized
logger = logging.getLogger("intervia")

class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Injects a unique X-Correlation-ID into every request for distributed tracing,
    and measures request processing time.
    """
    async def dispatch(self, request: Request, call_next):
        correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
        request.state.correlation_id = correlation_id
        
        start_time = time.time()
        
        try:
            response = await call_next(request)
        except Exception as e:
            logger.error(f"Unhandled error in request: {e}", extra={"correlation_id": correlation_id})
            raise
            
        process_time = time.time() - start_time
        
        response.headers["X-Correlation-ID"] = correlation_id
        response.headers["X-Process-Time"] = f"{process_time:.4f}"
        
        logger.info(
            "request_processed",
            extra={
                "path": request.url.path,
                "method": request.method,
                "status_code": response.status_code,
                "correlation_id": correlation_id,
                "process_time_ms": round(process_time * 1000, 2)
            }
        )
        
        return response