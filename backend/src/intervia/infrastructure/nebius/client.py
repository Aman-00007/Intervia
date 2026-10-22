from openai import AsyncOpenAI
from intervia.core.config import get_settings

settings = get_settings()


def get_nebius_client() -> AsyncOpenAI:
    """Returns an AsyncOpenAI client wired to Nebius Token Factory."""
    return AsyncOpenAI(
        api_key=settings.NEBIUS_API_KEY,
        base_url=settings.NEBIUS_BASE_URL,
        timeout=90.0,
        max_retries=2,
    )


nebius_client = get_nebius_client()