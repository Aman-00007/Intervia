import time
from enum import StrEnum
from typing import TypeVar
from pydantic import BaseModel
from tenacity import retry, stop_after_attempt, wait_exponential
from intervia.core.config import get_settings
from intervia.infrastructure.nebius.client import nebius_client

settings = get_settings()
T = TypeVar("T", bound=BaseModel)


class NemotronTier(StrEnum):
    NANO = "nano"    # Fast everyday chat, hints, leak checks (<2s)
    SUPER = "super"  # Question gen, AI usage eval, Reconnect time-lapse
    ULTRA = "ultra"  # Deep Student Report & Executive Summary


class NebiusModelRouter:
    """Dispatches prompts to the optimal Nemotron 3 model on Nebius Token Factory."""

    def __init__(self) -> None:
        self._tier_map = {
            NemotronTier.NANO: settings.NEMOTRON_NANO_MODEL,
            NemotronTier.SUPER: settings.NEMOTRON_SUPER_MODEL,
            NemotronTier.ULTRA: settings.NEMOTRON_ULTRA_MODEL,
        }

    def resolve_model_id(self, tier: NemotronTier) -> str:
        return self._tier_map[tier]

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=6))
    async def generate_structured(
        self,
        tier: NemotronTier,
        system_prompt: str,
        user_prompt: str,
        response_schema: type[T],
        temperature: float = 0.2,
    ) -> tuple[T, dict]:
        """Calls Nebius Token Factory and parses output directly into a Pydantic model."""
        model_id = self.resolve_model_id(tier)
        start = time.perf_counter()

        completion = await nebius_client.beta.chat.completions.parse(
            model=model_id,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format=response_schema,
            temperature=temperature,
        )

        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        parsed: T | None = completion.choices[0].message.parsed
        if parsed is None:
            raise RuntimeError(f"Nebius model {model_id} failed to return schema {response_schema.__name__}")

        telemetry = {
            "tier": tier.value,
            "model_id": model_id,
            "latency_ms": latency_ms,
            "prompt_tokens": completion.usage.prompt_tokens if completion.usage else 0,
            "completion_tokens": completion.usage.completion_tokens if completion.usage else 0,
        }
        return parsed, telemetry

    async def generate_fast_text(
        self,
        system_prompt: str,
        user_prompt: str,
        tier: NemotronTier = NemotronTier.NANO,
        temperature: float = 0.3,
    ) -> str:
        """Low-latency text completion for Shared AI Window & Offline Hints."""
        model_id = self.resolve_model_id(tier)
        resp = await nebius_client.chat.completions.create(
            model=model_id,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
        )
        return resp.choices[0].message.content or ""


model_router = NebiusModelRouter()