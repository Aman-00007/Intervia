from fastapi import APIRouter, HTTPException
from intervia.domains.stage_b_workspace.schemas import CodeRunRequest, CodeRunResponse
from intervia.infrastructure.sandbox_exec.judge0_client import code_runner

# This creates an isolated router module (just like const router = express.Router() in Node.js)
router = APIRouter(prefix="/api/workspace", tags=["Stage B - Live Workspace"])


@router.post("/run-code", response_model=CodeRunResponse)
async def run_student_code(req: CodeRunRequest):
    """
    Receives candidate code from the React Monaco Editor, validates it using Pydantic,
    executes it in the isolated cloud sandbox, and returns the output.
    """
    try:
        # Pass the validated data straight to the sandbox runner you built in Step 2!
        result = await code_runner.execute_code(
            language=req.language,
            source_code=req.source_code,
            stdin=req.stdin
        )
        return result
    except Exception as e:
        # If the cloud sandbox fails or times out, return a clean 500 error
        raise HTTPException(status_code=500, detail=f"Sandbox execution failed: {str(e)}")