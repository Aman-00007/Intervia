from pydantic import BaseModel, Field, UUID4
from typing import Optional
from datetime import datetime

class CodeRunDTO(BaseModel):
    session_id: UUID4
    language: str = Field(..., max_length=20)
    source_code: str = Field(..., max_length=50000)
    stdin: Optional[str] = Field(default="", max_length=10000)

class CodeRunResponseDTO(BaseModel):
    submission_id: UUID4
    passed: bool
    execution_time_sec: float
    memory_kb: int
    stdout: str
    stderr: str
    compile_output: str

class SharedAIPromptDTO(BaseModel):
    session_id: UUID4
    prompt_text: str = Field(..., min_length=1, max_length=2000)
    current_code_snapshot: str
    sandbox_error_context: Optional[str] = None

class SharedAIResponseDTO(BaseModel):
    chat_id: UUID4
    response_text: str
    timestamp: datetime

class GoodUseOfAIScoreDTO(BaseModel):
    overall_ai_usage_score: int = Field(ge=0, le=100)
    prompt_clarity_score: int = Field(ge=0, le=100)
    verification_and_debugging_score: int = Field(ge=0, le=100)
    autonomy_score: int = Field(ge=0, le=100)
    classification: str
    key_observations: list[str]
    flagged_prompts: list[str]