"""
Pydantic models for all request/response schemas.

Mirrors the exact JSON payloads built in Jenkinsfile.ci and Jenkinsfile.cd
so the API contract is explicit and validated on every call.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ═════════════════════════════════════════════════════════════════════════════
#  /analyze/build   (Jenkinsfile.ci stage 2.7)
# ═════════════════════════════════════════════════════════════════════════════

class BuildAnalysisRequest(BaseModel):
    type: str = "build_summary"
    build_number: str
    branch: str
    commit: str
    image: str
    owasp_summary: str = Field(default="", description="Truncated OWASP JSON report")
    trivy_summary: str = Field(default="", description="Truncated Trivy JSON report")


class BuildAnalysisResponse(BaseModel):
    risk_level: str                          # LOW / MEDIUM / HIGH / CRITICAL
    summary: str
    recommendation: str
    findings: List[str] = []


# ═════════════════════════════════════════════════════════════════════════════
#  /analyze/deployment   (Jenkinsfile.cd stage 3b)
# ═════════════════════════════════════════════════════════════════════════════

class DeploymentAnalysisRequest(BaseModel):
    type: str = "deployment_analysis"
    app_name: str
    image_tag: str
    git_branch: str
    git_commit_short: str
    git_log: str = ""
    git_diff_stat: str = ""
    ci_build_summary: str = ""
    pre_metrics: str = ""
    timestamp: str = ""


class DeploymentAnalysisResponse(BaseModel):
    risk_level: str                          # LOW / MEDIUM / HIGH / CRITICAL
    risk_score: int = Field(ge=0, le=100)
    summary: str
    impact_analysis: str
    rollback_strategy: str
    deployment_window: str


# ═════════════════════════════════════════════════════════════════════════════
#  /analyze/post-approval   (Jenkinsfile.cd stage 3d)
# ═════════════════════════════════════════════════════════════════════════════

from typing import Literal

class PostApprovalRequest(BaseModel):
    type: Literal["deployment_runbook", "rejection_analysis"]
    app_name: str
    image_tag: str
    risk_level: str
    ai_summary: str = ""
    approver: str = ""
    comment: str = ""
    rollback_cmd: str = ""


class PostApprovalResponse(BaseModel):
    # For deployment_runbook
    runbook: Optional[str] = None
    # For rejection_analysis
    suggested_fixes: Optional[str] = None


# ═════════════════════════════════════════════════════════════════════════════
#  /generate/commit-message   (Jenkinsfile.cd stage 3e)
# ═════════════════════════════════════════════════════════════════════════════

class CommitMessageRequest(BaseModel):
    type: str = "commit_message"
    app_name: str
    old_tag: str = "previous"
    new_tag: str
    branch: str
    commit: str
    risk_level: str = "LOW"


class CommitMessageResponse(BaseModel):
    message: str


# ═════════════════════════════════════════════════════════════════════════════
#  /verify/post-deployment   (Jenkinsfile.cd stage 3g)
# ═════════════════════════════════════════════════════════════════════════════

class PostDeploymentRequest(BaseModel):
    type: str = "post_deployment_verification"
    app_name: str
    image_tag: str
    watch_seconds: int = 600
    pre_metrics: str = ""
    post_metrics: str = ""
    argocd_status: str = "{}"


class MetricsComparison(BaseModel):
    error_rate_delta: str = "0.00%"
    p99_latency_delta: str = "N/A"
    pod_restarts: int = 0


class PostDeploymentResponse(BaseModel):
    anomaly_detected: bool
    health_status: str                       # HEALTHY / DEGRADED / CRITICAL
    summary: str
    metrics_comparison: MetricsComparison = MetricsComparison()
    incident_report: Optional[str] = None
