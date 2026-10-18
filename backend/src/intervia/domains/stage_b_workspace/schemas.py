from pydantic import BaseModel, Field

# ── REQUEST SCHEMAS (What React sends to FastAPI) ──

class CodeRunRequest(BaseModel):
    """Like a TypeScript interface for the Code Execution POST request."""
    language: str = Field(..., description="Programming language (e.g., python, cpp23, javascript)")
    source_code: str = Field(..., description="The candidate's raw code from the Monaco Editor")
    stdin: str = Field(default="", description="Optional standard input for the code")


class SharedAIPromptRequest(BaseModel):
    """Payload when a student asks the AI Copilot a question."""
    session_id: str = Field(..., description="The unique ID of the interview session")
    prompt: str = Field(..., description="The question the student typed to the AI")


# ── RESPONSE SCHEMAS (What FastAPI sends back to React) ──

class CodeRunResponse(BaseModel):
    """The JSON response structure after code finishes running in the sandbox."""
    language: str
    version: str
    stdout: str
    stderr: str
    exit_code: int
    passed: bool