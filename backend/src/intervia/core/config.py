from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # 1. Nebius Token Factory
    NEBIUS_API_KEY: str
    NEBIUS_BASE_URL: str = "https://api.tokenfactory.nebius.com/v1/"
    NEMOTRON_NANO_MODEL: str = "nvidia/Nemotron-3-Nano-30B-A3B"
    NEMOTRON_SUPER_MODEL: str = "nvidia/Nemotron-3-Super-120B-A12B"
    NEMOTRON_ULTRA_MODEL: str = "nvidia/Nemotron-3-Ultra-550B-A55B"

    # 2. Shared Supabase PostgreSQL URLs
    VAULT_DATABASE_URL: str
    OPS_DATABASE_URL: str

    # 3. Cryptographic Keys
    AES_MASTER_KEY_HEX: str
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # 4 Redis, Judge0/Piston & S3 Storage
    REDIS_URL: str = "redis://localhost:6379/0"
    JUDGE0_API_URL: str = "https://emkc.org/api/v2/piston"
    JUDGE0_API_KEY: str = "" 
    S3_ENDPOINT_URL: str = ""
    S3_ACCESS_KEY_ID: str = ""
    S3_SECRET_ACCESS_KEY: str = ""
    S3_BUCKET_NAME: str = "offline-blackbox-media"
    S3_REGION: str = "ap-south-1"
    HMAC_OFFLINE_SECRET: str = "intervia_offline_secret_key_123"

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()