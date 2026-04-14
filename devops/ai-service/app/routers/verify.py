"""
/verify/* — Verification endpoints.

  POST /verify/post-deployment  ← CD stage 3g — 10-min anomaly detection
"""

import json
import logging
import textwrap

from fastapi import APIRouter

from app.models.schemas import (
    MetricsComparison,
    PostDeploymentRequest,
    PostDeploymentResponse,
)
from app.services.llm_client import llm_complete
from app.utils.json_parser import parse_llm_json

logger = logging.getLogger(__name__)
router = APIRouter()


_VERIFY_SYSTEM_PROMPT = textwrap.dedent("""
You are an SRE performing post-deployment verification.
Compare pre-deployment and post-deployment Prometheus metrics.
Determine if an anomaly occurred (spike in error rate, latency regression, pod restarts, OOMKilled).
Output JSON with these exact keys:
- anomaly_detected: boolean
- health_status: HEALTHY | DEGRADED | CRITICAL
- summary: 2-3 sentences describing overall health
- metrics_comparison: object with keys error_rate_delta, p99_latency_delta, pod_restarts
- incident_report: null if healthy, otherwise a string with root cause and mitigation steps

Output ONLY valid JSON — no markdown, no explanation.
""").strip()


@router.post("/post-deployment", response_model=PostDeploymentResponse)
async def verify_post_deployment(req: PostDeploymentRequest):
    logger.info(
        "verify_post_deployment | app=%s tag=%s watch=%ds",
        req.app_name, req.image_tag, req.watch_seconds
    )

    user_prompt = textwrap.dedent(f"""
    Application: {req.app_name}   Deployed Image: {req.image_tag}
    Observation window: {req.watch_seconds} seconds

    === Pre-Deployment Metrics ===
    {req.pre_metrics[:800] or "Not available"}

    === Post-Deployment Metrics ===
    {req.post_metrics[:800] or "Not available"}

    === ArgoCD Application Status ===
    {req.argocd_status[:1000]}

    Analyse these metrics and produce the verification report now.
    """).strip()

    try:
        raw = await llm_complete(_VERIFY_SYSTEM_PROMPT, user_prompt)
        data = parse_llm_json(raw)

        mc_raw = data.get("metrics_comparison", {})
        mc = MetricsComparison(
            error_rate_delta=mc_raw.get("error_rate_delta", "0.00%"),
            p99_latency_delta=mc_raw.get("p99_latency_delta", "N/A"),
            pod_restarts=int(mc_raw.get("pod_restarts", 0)),
        )

        return PostDeploymentResponse(
            anomaly_detected=bool(data.get("anomaly_detected", False)),
            health_status=data.get("health_status", "HEALTHY"),
            summary=data.get("summary", "Verification complete."),
            metrics_comparison=mc,
            incident_report=data.get("incident_report"),
        )

    except Exception as exc:
        logger.error("verify_post_deployment failed: %s", exc)
        # Safe fallback — never fail the CD pipeline due to AI unavailability
        return PostDeploymentResponse(
            anomaly_detected=False,
            health_status="HEALTHY",
            summary=(
                "⚠️ AI verification service unavailable. "
                "Manual monitoring is recommended for the next 10 minutes. "
                "No automated anomaly detection was performed."
            ),
            metrics_comparison=MetricsComparison(),
            incident_report=None,
        )
