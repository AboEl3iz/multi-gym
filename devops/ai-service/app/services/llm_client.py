"""
LLM client — provider-agnostic interface.

Usage:
    from app.services.llm_client import llm_complete
    response_text = await llm_complete(system_prompt, user_prompt)

Supported providers (controlled via LLM_PROVIDER env var):
  • openai   — OpenAI Chat Completions API
  • gemini   — Google Generative AI API
  • ollama   — Local Ollama REST API
  • mock     — Deterministic mock for pipeline testing without real LLM calls
"""

import asyncio
import json
import logging
import textwrap

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Prompt token guard (cheap truncation before sending to LLM) ──────────────
def _truncate(text: str, max_chars: int) -> str:
    """Rough guard: 1 token ≈ 4 chars. Keeps costs predictable."""
    if len(text) <= max_chars:
        return text
    half = max_chars // 2
    return text[:half] + "\n...[truncated]...\n" + text[-half:]


# ═════════════════════════════════════════════════════════════════════════════
#  PROVIDER IMPLEMENTATIONS
# ═════════════════════════════════════════════════════════════════════════════

async def _openai_complete(system: str, user: str) -> str:
    """OpenAI Chat Completions (gpt-4o-mini, gpt-4o, etc.)"""
    async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_SEC) as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.LLM_MODEL,
                "max_tokens": settings.MAX_OUTPUT_TOKENS,
                "temperature": 0.3,   # Lower = more deterministic for DevOps decisions
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user",   "content": user},
                ],
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"].strip()


async def _gemini_complete(system: str, user: str) -> str:
    """Google Gemini API (gemini-1.5-flash, gemini-1.5-pro, etc.)"""
    model = settings.LLM_MODEL  # e.g. "gemini-1.5-flash"
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={settings.GEMINI_API_KEY}"
    )
    combined_prompt = f"{system}\n\n{user}"
    async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_SEC) as client:
        response = await client.post(
            url,
            json={
                "contents": [{"parts": [{"text": combined_prompt}]}],
                "generationConfig": {
                    "maxOutputTokens": settings.MAX_OUTPUT_TOKENS,
                    "temperature": 0.3,
                },
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()


async def _ollama_complete(system: str, user: str) -> str:
    """Ollama local REST API — zero cost, runs on-cluster."""
    async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_SEC) as client:
        response = await client.post(
            f"{settings.OLLAMA_BASE_URL}/api/generate",
            json={
                "model": settings.OLLAMA_MODEL,
                "system": system,
                "prompt": user,
                "stream": False,
                "options": {"temperature": 0.3, "num_predict": settings.MAX_OUTPUT_TOKENS},
            },
        )
        response.raise_for_status()
        return response.json()["response"].strip()


async def _mock_complete(system: str, user: str) -> str:
    """
    Deterministic mock — returns well-structured JSON strings so pipelines
    can be tested end-to-end without a real LLM or API key.
    The function inspects keywords in the prompt to pick the right template.
    """
    prompt_lower = (system + user).lower()

    if "build_summary" in prompt_lower or "analyze/build" in prompt_lower:
        return json.dumps({
            "risk_level": "LOW",
            "summary": (
                "Build #MOCK completed successfully. "
                "OWASP scan found no critical dependencies. "
                "Trivy scan found no HIGH/CRITICAL CVEs in the container image. "
                "SonarQube quality gate passed with zero new issues."
            ),
            "recommendation": (
                "Safe to proceed with deployment. "
                "All security gates passed. No action required."
            ),
            "findings": [],
        })

    if "deployment_analysis" in prompt_lower or "analyze/deployment" in prompt_lower:
        return json.dumps({
            "risk_level": "MEDIUM",
            "risk_score": 35,
            "summary": (
                "Deployment involves changes to the API route handlers and DB query layer. "
                "Medium risk due to schema-adjacent changes. "
                "No breaking API changes detected in the diff. "
                "Recommended deployment window: off-peak hours."
            ),
            "impact_analysis": (
                "Expected P99 latency impact: <10ms. "
                "No DB migrations detected. "
                "Rollback estimated time: <2 minutes."
            ),
            "rollback_strategy": (
                "helm rollback gym -n gym-app --wait\n"
                "Verify: kubectl rollout status deployment/gym-app -n gym-app"
            ),
            "deployment_window": "Deploy during low-traffic window (02:00–06:00 local time).",
        })

    if "deployment_runbook" in prompt_lower:
        return json.dumps({
            "runbook": (
                "**Deployment Runbook — Gym API**\n\n"
                "1. Monitor error rate: `kubectl logs -l app=gym-app -n gym-app --tail=100`\n"
                "2. Watch restart count: `kubectl get pods -n gym-app -w`\n"
                "3. Check Prometheus dashboard: http://grafana.monitoring/d/gym\n"
                "4. Rollback if error rate >1%: `helm rollback gym -n gym-app`\n"
                "5. Notify #incidents if P99 latency exceeds 500ms for >5min.\n\n"
                "**Monitoring focus for this release:** API route handlers, DB query performance."
            )
        })

    if "rejection_analysis" in prompt_lower:
        return json.dumps({
            "suggested_fixes": (
                "1. Review the flagged OWASP dependency findings in the report artifact.\n"
                "2. Upgrade affected packages and re-run the CI pipeline.\n"
                "3. Confirm SonarQube new issues are resolved before re-submitting.\n"
                "4. Ensure unit test coverage meets the Quality Gate threshold (≥80%)."
            )
        })

    if "commit_message" in prompt_lower or "generate/commit-message" in prompt_lower:
        return json.dumps({
            "message": "chore(deploy): update gym image tag [AI-generated] [mock]"
        })

    if "post_deployment_verification" in prompt_lower:
        return json.dumps({
            "anomaly_detected": False,
            "health_status": "HEALTHY",
            "summary": (
                "Post-deployment observation window complete. "
                "No anomalies detected in error rate, latency, or pod restarts. "
                "Deployment is stable."
            ),
            "metrics_comparison": {
                "error_rate_delta": "0.00%",
                "p99_latency_delta": "+3ms",
                "pod_restarts": 0,
            },
        })

    # Generic fallback
    return json.dumps({
        "status": "ok",
        "message": "Mock response — no specific template matched.",
        "risk_level": "LOW",
    })


# ═════════════════════════════════════════════════════════════════════════════
#  PUBLIC INTERFACE
# ═════════════════════════════════════════════════════════════════════════════

async def llm_complete(system_prompt: str, user_prompt: str) -> str:
    """
    Dispatches to the appropriate LLM provider and returns the raw text response.
    Input prompts are truncated to MAX_INPUT_TOKENS * 4 chars before dispatch.
    All exceptions propagate to the router which handles graceful fallback.
    """
    system_prompt = _truncate(system_prompt, settings.MAX_INPUT_TOKENS * 3)
    user_prompt   = _truncate(user_prompt,   settings.MAX_INPUT_TOKENS * 3)

    provider = settings.LLM_PROVIDER.lower()
    logger.debug("llm_complete | provider=%s model=%s", provider, settings.LLM_MODEL)

    if provider == "openai":
        return await _openai_complete(system_prompt, user_prompt)
    elif provider == "gemini":
        return await _gemini_complete(system_prompt, user_prompt)
    elif provider == "ollama":
        return await _ollama_complete(system_prompt, user_prompt)
    elif provider == "mock":
        return await _mock_complete(system_prompt, user_prompt)
    else:
        raise ValueError(f"Unknown LLM_PROVIDER: {provider}. Valid: openai, gemini, ollama, mock")
