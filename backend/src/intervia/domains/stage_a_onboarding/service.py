# src/intervia/domains/stage_a_onboarding/service.py
from pathlib import Path
import jinja2
import uuid
import secrets
import base64

from intervia.domains.stage_a_onboarding.parser_service import ResumeParserService
from intervia.domains.stage_a_onboarding.repository import OnboardingRepository
from intervia.domains.stage_a_onboarding.schemas import GeneratedQuestionsResponse, GeneratedHintsResponse
from intervia.infrastructure.nebius.model_router import model_router, NemotronTier
from intervia.core.security.aes_gcm import aes_vault 

current_dir = Path(__file__).parent
template_dir = current_dir.parent.parent / "infrastructure" / "nebius" / "prompts"
jinja_env = jinja2.Environment(loader=jinja2.FileSystemLoader(template_dir))

class OnboardingService:
    @staticmethod
    async def process_and_prepare(
        repo: OnboardingRepository,
        user_id: uuid.UUID,
        session_id: uuid.UUID,
        pdf_bytes: bytes, 
        github_username: str | None
    ) -> dict:
        """Core business logic: Scrubs resume, encrypts map, fetches code, generates questions."""
        
        # 1. Scrub PII from PDF (Returns text and mapping dict)
        scrubbed_resume, pii_mapping = ResumeParserService.extract_and_scrub_pdf(pdf_bytes)
        
        # 2. Encrypt the mapping with AES-256 and store in the Vault DB
        if pii_mapping:
            encrypted_map_bytes = aes_vault.encrypt_dict(pii_mapping)
            await repo.store_pii_map(
                user_id=user_id, 
                session_id=session_id, 
                encrypted_map=encrypted_map_bytes
            )
        
        # 3. Fetch live GitHub activity
        github_commits = await ResumeParserService.fetch_github_commits(github_username)
        
        # 4. Render AI Prompt template
        template = jinja_env.get_template("stage_a_questions.j2")
        prompt = template.render(
            scrubbed_resume_text=scrubbed_resume,
            github_commits=github_commits
        )
        
        # 5. Call Nebius Nemotron model (WITH FALLBACK)
        try:
            result, telemetry = await model_router.generate_structured(
                tier=NemotronTier.SUPER,
                system_prompt="You are an expert technical interviewer. Return ONLY a valid JSON object.",
                user_prompt=prompt,
                response_schema=GeneratedQuestionsResponse,
                temperature=0.2
            )
            questions = result.questions
        except Exception as e:
            print(f"🚨 NEBRUS AI CRASHED (Questions): {str(e)}")
            # Fallback questions so the hackathon demo never freezes
            questions = [
                "Can you explain the time complexity of your merge intervals approach?",
                "How would you handle edge cases where intervals touch but don't overlap?",
                "What happens if the input list is empty?"
            ]
        
        return {
            "scrubbed_text": scrubbed_resume,
            "generated_questions": questions
        }

    @staticmethod
    async def prepare_offline_mode(
        repo: OnboardingRepository,
        session_id: uuid.UUID,
        cleaned_resume_text: str
    ) -> dict:
        """
        Generates the cryptographic seed for the HMAC chain and 
        pre-loads 2 encrypted hints for the offline black box.
        """
        # 1. Generate a secure random server seed (32 bytes hex)
        server_seed = secrets.token_hex(32)
        
        # 2. Save the seed to the database so Stage D can verify the chain later
        await repo.save_session_seed(session_id, server_seed)
        
        # 3. Generate 2 hints using Nemotron Nano (fast & cheap)
        prompt = f"Based on this resume, generate 2 short, high-level interview hints (e.g., 'Ask about time complexity').\nResume: {cleaned_resume_text}"
        
        try:
            result, _ = await model_router.generate_structured(
                tier=NemotronTier.NANO,
                system_prompt="Return ONLY a JSON object with a 'hints' list containing exactly 2 strings.",
                user_prompt=prompt,
                response_schema=GeneratedHintsResponse,
                temperature=0.5
            )
            hints = result.hints
        except Exception as e:
            print(f"🚨 NEBRUS AI CRASHED (Hints): {str(e)}")
            # Fallback hints
            hints = [
                "Consider edge cases like empty lists or single elements.",
                "Think about the time and space complexity of your solution."
            ]
        
        # 4. Encrypt the hints using your AES-256 vault
        hints_dict = {f"hint_{i}": hint for i, hint in enumerate(hints)}
        encrypted_hints_bytes = aes_vault.encrypt_dict(hints_dict)
        
        # Convert bytes to base64 string for JSON transport
        encrypted_hints_b64 = [base64.b64encode(encrypted_hints_bytes).decode('utf-8')]

        return {
            "server_seed": server_seed,
            "encrypted_hints": encrypted_hints_b64
        }