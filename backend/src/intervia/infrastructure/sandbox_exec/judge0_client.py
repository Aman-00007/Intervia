from typing import Any
import httpx

# Public Piston Sandbox API (runs candidate code safely in an isolated container)
PISTON_EXECUTE_URL = "https://emkc.org/api/v2/piston/execute"

# Expanded map supporting multiple C++ versions and modern runtimes for all languages
LANGUAGE_MAP = {
    # --- Python ---
    "python": ("python", "3.11.2"),
    "python3": ("python", "3.11.2"),
    "python3.12": ("python", "3.12.0"),
    
    # --- C++ ---
    "cpp": ("c++", "12.2.0"),       # Default modern C++ (GCC 12)
    "c++": ("c++", "12.2.0"),
    "cpp17": ("c++", "10.2.0"),     # Older GCC 10 runtime
    "cpp20": ("c++", "12.2.0"),     # GCC 12 runtime
    "cpp23": ("c++", "13.2.0"),     # Latest GCC 13 runtime
    
    # --- JavaScript / Node.js ---
    "javascript": ("javascript", "20.11.0"),
    "js": ("javascript", "20.11.0"),
    "node": ("javascript", "20.11.0"),
    "javascript22": ("javascript", "22.0.0"),
    
    # --- Java ---
    "java": ("java", "17.0.1"),     # Java 17 LTS
    "java17": ("java", "17.0.1"),
    "java21": ("java", "21.0.1"),   # Java 21 LTS
}


class CodeSandboxRunner:
    """Runs candidate C++, Python, Java, or JS code safely in a cloud sandbox."""

    async def execute_code(
        self, language: str, source_code: str, stdin: str = ""
    ) -> dict[str, Any]:
        lang_key = language.lower()
        
        # Fallback to python 3.11.2 if an unknown language is passed
        runtime_lang, version = LANGUAGE_MAP.get(lang_key, ("python", "3.11.2"))

        payload = {
            "language": runtime_lang,
            "version": version,
            "files": [{"content": source_code}],
            "stdin": stdin,
            "run_timeout": 3000,  # Automatically kills infinite loops after 3 seconds
        }

        # httpx.AsyncClient() makes an asynchronous HTTP request to the Piston engine
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(PISTON_EXECUTE_URL, json=payload)
            response.raise_for_status()
            data = response.json()
            run_output = data.get("run", {})

            return {
                "language": runtime_lang,
                "version": version,
                "stdout": run_output.get("stdout", ""),
                "stderr": run_output.get("stderr", ""),
                "exit_code": run_output.get("code", -1),
                "passed": run_output.get("code", -1) == 0,
            }


code_runner = CodeSandboxRunner()