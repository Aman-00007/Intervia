from pathlib import Path
import jinja2
from pydantic import BaseModel

from intervia.domains.stage_a_onboarding.parser_service import ResumeParserService
from intervia.infrastructure.nebius.model_router import model_router, NemotronTier

current_dir = Path(__file__).parent
template_dir = current_dir.parent.parent / "infrastructure" / "nebius" / "prompts"
jinja_env = jinja2.Environment(loader=jinja2.FileSystemLoader(template_dir))

class GeneratedQuestionsResponse(BaseModel):
    questions: list[str]

class OnboardingService:
    @staticmethod
    async def process_and_prepare(pdf_bytes: bytes, github_username: str | None) -> dict:
        """Core business logic: Scrubs resume, fetches code, and generates questions."""
        
        # 1. Scrub PII from PDF
        scrubbed_resume = ResumeParserService.extract_and_scrub_pdf(pdf_bytes)
        
        # 2. Fetch live GitHub activity
        github_commits = await ResumeParserService.fetch_github_commits(github_username)
        
        # 3. Render AI Prompt template
        template = jinja_env.get_template("stage_a_questions.j2")
        prompt = template.render(
            scrubbed_resume_text=scrubbed_resume,
            github_commits=github_commits
        )
        
        # 4. Call Nebius Nemotron model
        result, telemetry = await model_router.generate_structured(
            tier=NemotronTier.SUPER,
            system_prompt="You are an expert technical interviewer. Return ONLY a valid JSON object.",
            user_prompt=prompt,
            response_schema=GeneratedQuestionsResponse,
            temperature=0.2
        )
        
        return {
            "scrubbed_text": scrubbed_resume,
            "generated_questions": result.questions
        }