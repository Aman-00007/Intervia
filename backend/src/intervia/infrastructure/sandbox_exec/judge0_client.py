import asyncio
import base64
from typing import Any
import httpx

from intervia.core.config import settings
from intervia.core.exceptions import DomainValidationException, RFC7807Exception
from intervia.core.logging import logger

# Expanded Judge0 CE Language Map supporting multiple versions and modern aliases
LANGUAGE_MAP: dict[str, int] = {
    # --- C ---
    "c": 50,          # C (GCC 9.2.0)
    "c_11": 75,       # C (GCC 11.2.0)

    # --- C++ ---
    "cpp": 54,        # C++ (GCC 9.2.0)
    "c++": 54,
    "cpp17": 54,      # C++17 Standard
    "cpp20": 76,      # C++20 Standard (GCC 11.2.0)
    "cpp23": 105,     # Modern C++23 / GCC 14.1.0

    # --- Python ---
    "python": 71,     # Python (3.8.1)
    "python3": 71,
    "python3.8": 71,
    "python3.11": 100, # Python 3.11 runtime
    "python3.12": 102, # Python 3.12 runtime

    # --- Java ---
    "java": 62,       # Java (OpenJDK 13.0.1)
    "java13": 62,
    "java17": 89,     # Java (JDK 17.0.6)
    "java21": 91,     # Java (JDK 21)

    # --- JavaScript / TypeScript ---
    "javascript": 63, # JavaScript (Node.js 12.14.0)
    "js": 63,
    "node": 63,
    "node18": 93,     # Node.js 18
    "node20": 94,     # Node.js 20
    "typescript": 74, # TypeScript (3.7.4)
    "ts": 74,
}


class Judge0SandboxClient:
    """
    Production async client for isolated code execution via Judge0.
    Uses Base64 encoding to prevent payload corruption or injection,
    and executes test cases concurrently with strict CPU/Memory bounds.
    """

    def __init__(self) -> None:
        self.base_url = settings.JUDGE0_API_URL.rstrip("/")
        self.api_key = settings.JUDGE0_API_KEY
        self.cpu_time_limit = 2.0      # Max 2 seconds CPU time per run
        self.wall_time_limit = 5.0     # Max 5 seconds wall clock time
        self.memory_limit_kb = 128000  # 128 MB RAM limit

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["X-Auth-Token"] = self.api_key
            headers["X-RapidAPI-Key"] = self.api_key
        return headers

    @staticmethod
    def _b64_encode(text: str) -> str:
        return base64.b64encode(text.encode("utf-8")).decode("utf-8")

    @staticmethod
    def _b64_decode(encoded: str | None) -> str:
        if not encoded:
            return ""
        try:
            return base64.b64decode(encoded).decode("utf-8", errors="replace")
        except Exception:
            return ""

    async def execute_single(
        self,
        language: str,
        source_code: str,
        stdin: str = "",
        expected_output: str | None = None,
    ) -> dict[str, Any]:
        """Executes source code against a single stdin payload in the sandbox."""
        lang_key = language.lower().strip()
        if lang_key not in LANGUAGE_MAP:
            raise DomainValidationException(
                detail=f"Unsupported language '{language}'. Allowed: {list(LANGUAGE_MAP.keys())}"
            )

        payload: dict[str, Any] = {
            "language_id": LANGUAGE_MAP[lang_key],
            "source_code": self._b64_encode(source_code),
            "stdin": self._b64_encode(stdin),
            "cpu_time_limit": self.cpu_time_limit,
            "wall_time_limit": self.wall_time_limit,
            "memory_limit": self.memory_limit_kb,
            "enable_network": False,  # Security: strictly block outbound network calls from sandbox
        }

        if expected_output is not None:
            payload["expected_output"] = self._b64_encode(expected_output)

        url = f"{self.base_url}/submissions?base64_encoded=true&wait=true"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=payload, headers=self._headers())
                response.raise_for_status()
                data = response.json()
        except httpx.TimeoutException as exc:
            logger.error("judge0_timeout", language=lang_key, error=str(exc))
            raise RFC7807Exception(
                status_code=504,
                title="Sandbox Execution Timeout",
                detail="The code execution sandbox timed out while processing your submission.",
            ) from exc
        except httpx.HTTPError as exc:
            logger.error("judge0_http_error", language=lang_key, error=str(exc))
            raise RFC7807Exception(
                status_code=502,
                title="Sandbox Gateway Error",
                detail="Failed to communicate with the isolated code execution engine.",
            ) from exc

        status_info = data.get("status", {})
        status_id = status_info.get("id", 0)
        
        stdout = self._b64_decode(data.get("stdout"))
        stderr = self._b64_decode(data.get("stderr"))
        compile_output = self._b64_decode(data.get("compile_output"))

        return {
            "token": data.get("token"),
            "status_id": status_id,
            "status_description": status_info.get("description", "Unknown"),
            "passed": status_id == 3,  # Status ID 3 in Judge0 == "Accepted"
            "stdout": stdout.strip(),
            "stderr": stderr.strip(),
            "compile_output": compile_output.strip(),
            "execution_time_sec": float(data.get("time") or 0.0),
            "memory_kb": int(data.get("memory") or 0),
        }

    async def execute_test_suite(
        self,
        language: str,
        source_code: str,
        test_cases: list[dict[str, str]],
    ) -> dict[str, Any]:
        """
        Runs candidate code concurrently against multiple test cases.
        Each item in `test_cases` expects {"stdin": "...", "expected_output": "..."}.
        """
        if not test_cases:
            single_res = await self.execute_single(language, source_code)
            return {
                "overall_passed": single_res["passed"],
                "passed_count": 1 if single_res["passed"] else 0,
                "total_count": 1,
                "results": [single_res],
            }

        tasks = [
            self.execute_single(
                language=language,
                source_code=source_code,
                stdin=tc.get("stdin", ""),
                expected_output=tc.get("expected_output"),
            )
            for tc in test_cases
        ]

        results = await asyncio.gather(*tasks)
        passed_count = sum(1 for r in results if r["passed"])

        return {
            "overall_passed": passed_count == len(results),
            "passed_count": passed_count,
            "total_count": len(results),
            "results": results,
        }


judge0_client = Judge0SandboxClient()