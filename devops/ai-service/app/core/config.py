"""
Configuration — all values read from environment variables.
Override via a .env file locally or Kubernetes Secret/ConfigMap in cluster.

LLM_PROVIDER options:
  • "openai"   — OpenAI API (GPT-4o, GPT-4-turbo, etc.)
  • "gemini"   — Google Gemini API
  • "ollama"   — Self-hosted Ollama (zero-cost, air-gapped)
  • "mock"     — Returns deterministic mock responses (CI/CD testing, no LLM needed)
"""

from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── LLM backend ──────────────────────────────────────────────────────────
    # Switch provider without changing any code — just set the env var.
    LLM_PROVIDER: str = "mock"          # openai | gemini | ollama | mock
    LLM_MODEL: str = "gpt-4o-mini"     # model name scoped to provider
    LLM_TIMEOUT_SEC: int = 90          # per-request timeout

    # ── Provider API keys (injected from Kubernetes Secret) ─────────────────
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    # ── Ollama (self-hosted) ─────────────────────────────────────────────────
    OLLAMA_BASE_URL: str = "http://ollama:11434"
    OLLAMA_MODEL: str = "llama3"

    # ── Service API key guard ────────────────────────────────────────────────
    # Jenkins pipelines send this in  X-API-Key header.
    # Set to empty string to disable auth (local dev only).
    API_KEY: str = ""

    # ── Observability ────────────────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"
    ENABLE_DOCS: bool = True            # disable in prod (set to false)

    # ── Feature flags ────────────────────────────────────────────────────────
    # Maximum tokens sent to LLM to control cost / latency
    MAX_INPUT_TOKENS: int = 6000
    # Cap LLM output length
    MAX_OUTPUT_TOKENS: int = 1024

    # ── CORS ─────────────────────────────────────────────────────────────
    # Set to a specific origin list (comma-separated) in production:
    #   CORS_ORIGINS=["https://jenkins.internal","https://argocd.internal"]
    CORS_ORIGINS: List[str] = ["*"]     # restrict in production!

    # Pydantic v2 settings config (replaces deprecated inner class Config)
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",           # silently ignore unknown env vars
    )


settings = Settings()
