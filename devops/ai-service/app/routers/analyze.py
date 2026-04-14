"""
/analyze/* — Two endpoints consumed during pipeline analysis phases.

  POST /analyze/build       ← CI stage 2.7 — summarises scan artefacts
  POST /analyze/deployment  ← CD stage 3b  — risk-scores a deployment
  POST /analyze/post-approval ← CD stage 3d — runbook or rejection fixes
"""

import json
import logging
import textwrap

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.models.schemas import (
    BuildAnalysisRequest,
    BuildAnalysisResponse,
    DeploymentAnalysisRequest,
    DeploymentAnalysisResponse,
    PostApprovalRequest,
    PostApprovalResponse,
)
from app.services.llm_client import llm_complete
from app.utils.json_parser import parse_llm_json

logger = logging.getLogger(__name__)
router = APIRouter()


# ═════════════════════════════════════════════════════════════════════════════
# POST /analyze/build
# ═════════════════════════════════════════════════════════════════════════════

_BUILD_SYSTEM_PROMPT = textwrap.dedent("""
You are an expert DevSecOps engineer reviewing CI build results.
Analyse the provided OWASP dependency scan and Trivy container image scan data,
then produce a concise JSON report following these rules:
- risk_level: one of LOW / MEDIUM / HIGH / CRITICAL
- summary: max 3 sentences describing what was built and key security findings
- recommendation: a single actionable sentence for the deployment team
- findings: list of notable vulnerability IDs or issues (may be empty)

Output ONLY valid JSON — no markdown, no explanation, no wrapping.
""").strip()


@router.post("/build", response_model=BuildAnalysisResponse)
async def analyze_build(req: BuildAnalysisRequest):
    logger.info("analyze_build | build=%s branch=%s", req.build_number, req.branch)

    user_prompt = textwrap.dedent(f"""
    Build: #{req.build_number}   Branch: {req.branch}   Commit: {req.commit}
    Image: {req.image}

    === OWASP Dependency-Check (truncated) ===
    {req.owasp_summary[:3000]}

    === Trivy Image Scan (truncated) ===
    {req.trivy_summary[:3000]}

    Produce the JSON report now.
    """).strip()

    try:
        raw = await llm_complete(_BUILD_SYSTEM_PROMPT, user_prompt)
        data = parse_llm_json(raw)
        return BuildAnalysisResponse(
            risk_level=data.get("risk_level", "UNKNOWN"),
            summary=data.get("summary", raw[:300]),
            recommendation=data.get("recommendation", "Review scan results."),
            findings=data.get("findings", []),
        )
    except Exception as exc:
        logger.error("analyze_build failed: %s", exc)
        return BuildAnalysisResponse(
            risk_level="UNKNOWN",
            summary="AI analysis unavailable — review scan artifacts manually.",
            recommendation="Proceed with caution; verify OWASP and Trivy reports.",
            findings=[],
        )


# ═════════════════════════════════════════════════════════════════════════════
# POST /analyze/deployment
# ═════════════════════════════════════════════════════════════════════════════

_DEPLOY_SYSTEM_PROMPT = textwrap.dedent("""
You are a senior SRE responsible for authorising production deployments.
Given git diff statistics, recent commit logs, and pre-deployment metrics,
assess the deployment risk and output a JSON report with these exact keys:
- risk_level: LOW / MEDIUM / HIGH / CRITICAL
- risk_score: integer 0-100 (0=no risk, 100=certain outage)
- summary: 2-3 sentences explaining the risk
- impact_analysis: expected effect on latency, error rate, and users
- rollback_strategy: precise shell commands to roll back
- deployment_window: recommended time window (or "Any time" if low risk)

Output ONLY valid JSON — no markdown, no explanation.
""").strip()


@router.post("/deployment", response_model=DeploymentAnalysisResponse)
async def analyze_deployment(req: DeploymentAnalysisRequest):
    logger.info(
        "analyze_deployment | app=%s tag=%s branch=%s",
        req.app_name, req.image_tag, req.git_branch
    )

    user_prompt = textwrap.dedent(f"""
    Application: {req.app_name}   New Image Tag: {req.image_tag}
    Branch: {req.git_branch}      Commit: {req.git_commit_short}
    Timestamp: {req.timestamp}

    === Recent Git Log ===
    {req.git_log[:2000]}

    === Git Diff Statistics ===
    {req.git_diff_stat[:1500]}

    === CI Build Summary ===
    {req.ci_build_summary[:2000]}

    === Pre-Deployment Prometheus Metrics ===
    {req.pre_metrics[:800]}

    Produce the JSON risk assessment now.
    """).strip()

    try:
        raw = await llm_complete(_DEPLOY_SYSTEM_PROMPT, user_prompt)
        data = parse_llm_json(raw)
        raw_score = int(data.get("risk_score", 50))
        risk_score = max(0, min(100, raw_score))   # clamp to [0, 100]
        return DeploymentAnalysisResponse(
            risk_level=data.get("risk_level", "UNKNOWN"),
            risk_score=risk_score,
            summary=data.get("summary", "Risk assessment unavailable."),
            impact_analysis=data.get("impact_analysis", "Unknown impact."),
            rollback_strategy=data.get(
                "rollback_strategy",
                f"helm rollback {req.app_name} -n {req.app_name}-app --wait"
            ),
            deployment_window=data.get("deployment_window", "No specific window."),
        )
    except Exception as exc:
        logger.error("analyze_deployment failed: %s", exc)
        return DeploymentAnalysisResponse(
            risk_level="UNKNOWN",
            risk_score=50,
            summary="⚠️ AI service did not respond — proceed with manual review.",
            impact_analysis="Unknown.",
            rollback_strategy=f"helm rollback {req.app_name} -n {req.app_name}-app",
            deployment_window="N/A",
        )


# ═════════════════════════════════════════════════════════════════════════════
# POST /analyze/post-approval
# ═════════════════════════════════════════════════════════════════════════════

_RUNBOOK_SYSTEM_PROMPT = textwrap.dedent("""
You are a DevOps engineer writing a deployment runbook.
Generate a concise, actionable runbook in Markdown bullet-point format.
Include: monitoring commands, key metrics to watch, rollback command, escalation path.
Output JSON with a single key "runbook" containing the Markdown string.
Output ONLY valid JSON — no markdown wrapper, no explanation.
""").strip()

_REJECTION_SYSTEM_PROMPT = textwrap.dedent("""
You are a DevSecOps engineer reviewing why a deployment was rejected.
Based on the risk level and summary, list precise corrective actions.
Output JSON with a single key "suggested_fixes" containing a numbered list string.
Output ONLY valid JSON — no markdown wrapper, no explanation.
""").strip()


@router.post("/post-approval", response_model=PostApprovalResponse)
async def analyze_post_approval(req: PostApprovalRequest):
    logger.info(
        "analyze_post_approval | type=%s app=%s tag=%s approver=%s",
        req.type, req.app_name, req.image_tag, req.approver
    )

    if req.type == "deployment_runbook":
        user_prompt = textwrap.dedent(f"""
        Application: {req.app_name}   Version: {req.image_tag}
        Risk Level: {req.risk_level}
        AI Deployment Summary: {req.ai_summary}
        Rollback Command: {req.rollback_cmd}
        Approved by: {req.approver}

        Generate the deployment runbook now.
        """).strip()
        system = _RUNBOOK_SYSTEM_PROMPT
    else:  # rejection_analysis
        user_prompt = textwrap.dedent(f"""
        Application: {req.app_name}   Version: {req.image_tag}
        Risk Level: {req.risk_level}
        AI Summary: {req.ai_summary}
        Rejection reason from approver: {req.comment}

        List the corrective actions required before re-submitting.
        """).strip()
        system = _REJECTION_SYSTEM_PROMPT

    try:
        raw = await llm_complete(system, user_prompt)
        data = parse_llm_json(raw)
        return PostApprovalResponse(
            runbook=data.get("runbook") if req.type == "deployment_runbook" else None,
            suggested_fixes=data.get("suggested_fixes") if req.type != "deployment_runbook" else None,
        )
    except Exception as exc:
        logger.error("analyze_post_approval failed: %s", exc)
        fallback = (
            "Standard deployment runbook applies — refer to ops wiki."
            if req.type == "deployment_runbook"
            else "Review scan results and failed quality gates; address all HIGH/CRITICAL findings."
        )
        return PostApprovalResponse(
            runbook=fallback if req.type == "deployment_runbook" else None,
            suggested_fixes=fallback if req.type != "deployment_runbook" else None,
        )


# The shared parse_llm_json utility (app/utils/json_parser.py) is used by all
# routers; the old local _parse_json has been removed from this module.
