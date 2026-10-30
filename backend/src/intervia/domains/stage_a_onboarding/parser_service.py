import httpx
import fitz  # PyMuPDF
from intervia.infrastructure.privacy.presidio_engine import pii_shield

class ResumeParserService:
    @staticmethod
    def extract_and_scrub_pdf(pdf_bytes: bytes) -> tuple[str, dict]:
        """Extracts text from a PDF memory buffer and scrubs PII."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        raw_text = ""
        for page in doc:
            raw_text += page.get_text("text") + "\n"
        
        doc.close()
        
        # Use the new method that returns both the text and the mapping
        scrubbed_text, pii_mapping = pii_shield.scrub_text_and_return_map(raw_text)
            
        return scrubbed_text, pii_mapping 

    @staticmethod
    async def fetch_github_commits(github_username: str | None) -> str:
        """Fetches the last 5 commits from the user's public public events."""
        if not github_username:
            return "No GitHub profile provided."

        url = f"https://api.github.com/users/{github_username}/events/public"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, timeout=5.0)
                if response.status_code != 200:
                    return f"Could not fetch GitHub data (Status: {response.status_code})"
                
                events = response.json()
                commit_messages = []
                
                for event in events:
                    if event.get("type") == "PushEvent":
                        commits = event.get("payload", {}).get("commits", [])
                        for commit in commits:
                            commit_messages.append(f"- {commit.get('message')}")
                            if len(commit_messages) >= 5:
                                break
                    if len(commit_messages) >= 5:
                        break
                        
                if not commit_messages:
                    return "No recent commits found."
                    
                return "\n".join(commit_messages)
                
            except Exception as e:
                return f"Error fetching GitHub data: {str(e)}"