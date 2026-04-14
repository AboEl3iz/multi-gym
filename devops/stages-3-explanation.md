# CI/CD Pipeline — Stage 3 Implementation Guide: Continuous Deployment (CD)

> **Note:** The Slack webhook receiver is implemented in **Go** (`webhook-receiver.go`).
> No Python runtime, no external dependencies — single statically-linked binary.

> **Scope:** Complete technical reference for Stage 3 of the Gym App DevSecOps pipeline.  
> All files live under `devops/` unless noted otherwise.

---

## Table of Contents

1. [Architecture & Flow](#architecture--flow)
2. [Files Produced](#files-produced)
3. [3a — Automated CD Triggering](#3a--automated-cd-triggering)
4. [3b — AI Deployment Analysis](#3b--ai-deployment-analysis)
5. [3c — Slack Approval Gate](#3c--slack-approval-gate)
   - [Webhook Receiver Design Choice](#webhook-receiver-design-choice)
   - [Approval Flow Sequence](#approval-flow-sequence)
   - [Slack App Setup](#slack-app-setup)
6. [3d — Post-Approval AI Enhancement](#3d--post-approval-ai-enhancement)
7. [3e — GitOps Manifest Update](#3e--gitops-manifest-update)
   - [Branch Strategy Rationale](#branch-strategy-rationale)
8. [3f — ArgoCD Synchronization](#3f--argocd-synchronization)
9. [3g — Post-Deployment Verification](#3g--post-deployment-verification)
10. [Non-Functional Requirements Checklist](#non-functional-requirements-checklist)
11. [Jenkins Setup for CD Job](#jenkins-setup-for-cd-job)
12. [FAQ & Troubleshooting](#faq--troubleshooting)

---

## Architecture & Flow

```
CI Job (gym-ci) — post { success }
         │
         │ build(job:'gym-cd', parameters:[IMAGE_TAG, GIT_COMMIT, ...])
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STAGE 3a · Validate Trigger                                        │
│  • Assert IMAGE_TAG + GIT_COMMIT non-empty                          │
│  • Snapshot pre-deployment Prometheus metrics baseline              │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STAGE 3b · AI Deployment Analysis                                  │
│  • git log + diff stat → AI service /analyze/deployment             │
│  • Produces: risk score (LOW/MEDIUM/HIGH), impact, rollback plan    │
│  • Archives ai-deploy-analysis.json                                 │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STAGE 3c · Slack Approval Gate  ← CRITICAL / BLOCKING             │
│  • Posts Block Kit message to #deploy-approvals                     │
│  • Jenkins `input` step PAUSES the pipeline (up to 4 hours)        │
│  • Button click → webhook-receiver validates HMAC → Jenkins input   │
│  • Timeout → auto-reject + audit log + Slack notification           │
│  • Approval decision ALWAYS written to approval-audit.json          │
└─────────────────────────────────────────────────────────────────────┘
         │
    APPROVE?                         REJECT?
         │                               │
         ▼                               ▼
┌─────────────────┐          ┌─────────────────────────┐
│  STAGE 3d       │          │  STAGE 3d               │
│  AI Runbook     │          │  AI Rejection Summary   │
│  (monitoring    │          │  (suggested fixes)      │
│  focus areas)   │          │  → pipeline ERROR()     │
└────────┬────────┘          └─────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STAGE 3e · GitOps Manifest Update                                  │
│  • yq patches helm/gym/values.yaml → app.image.tag: <IMAGE_TAG>    │
│  • AI generates commit message                                      │
│  • git commit + push to `main` branch                               │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STAGE 3f · ArgoCD Sync                                             │
│  • argocd app sync --force (immediate, not waiting for auto-sync)   │
│  • argocd app wait --health (polls until Healthy; timeout 10 min)  │
│  • CD job GREEN only when ArgoCD confirms Healthy                   │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STAGE 3g · Post-Deployment Verification (10-minute watch)          │
│  • 60s stabilisation wait                                           │
│  • Post-metrics sample vs pre-deployment baseline                  │
│  • AI /verify/post-deployment → anomaly detection                  │
│  • ANOMALY → UNSTABLE build + incident report + Slack alert         │
│  • HEALTHY  → #deployments success message                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Files Produced

| File | Purpose |
|---|---|
| `devops/Jenkinsfile.cd` | Main CD pipeline definition |
| `devops/slack/approval-message.json` | Block Kit template (reference) |
| `devops/slack/webhook-receiver.py` | Flask HMAC-validated Slack receiver |
| `devops/slack/slack-app-manifest.yaml` | Slack App OAuth & interactivity config |
| `devops/argocd/application.yaml` | ArgoCD Application manifest |
| `devops/stages-3-explanation.md` | This document |

---

## 3a — Automated CD Triggering

The CI pipeline's `post { success }` block fires a downstream build:

```groovy
build(
    job: 'gym-cd',
    wait: false,               // CI does not block waiting for CD to finish
    parameters: [
        string(name: 'IMAGE_TAG',  value: env.IMAGE_TAG),
        string(name: 'GIT_COMMIT', value: env.GIT_COMMIT),
        string(name: 'GIT_BRANCH', value: env.GIT_BRANCH),
        string(name: 'FULL_IMAGE', value: env.FULL_IMAGE_TAG)
    ]
)
```

`wait: false` means the CI job is marked green the moment the CD job is queued — it does not block on the 4-hour approval window. The CD job tracks its own status independently.

**Parameter validation** (stage 3a in `Jenkinsfile.cd`) immediately fails if either `IMAGE_TAG` or `GIT_COMMIT` is empty, preventing the pipeline from running without full context.

---

## 3b — AI Deployment Analysis

**What is collected (no PII, no secrets):**

| Data | Source | Limit |
|---|---|---|
| `git log --oneline -20` | Local git | 3 000 chars |
| `git diff HEAD~1 HEAD --stat` | Local git | 2 000 chars |
| CI build summary | `ai-build-summary.json` from CI artifact | 3 000 chars |
| Pre-deployment Prometheus metrics | Prometheus API (best-effort) | 1 000 chars |

**AI output structure (`ai-deploy-analysis.json`):**

```json
{
  "risk_level": "LOW | MEDIUM | HIGH",
  "summary": "Brief AI-generated deployment assessment...",
  "impact_analysis": "What services/users may be affected...",
  "rollback_strategy": "helm rollback gym -n gym-app",
  "deployment_window": "No constraints detected",
  "generated_by": "AI — requires human review before action"
}
```

**Graceful degradation:** If the AI service is unavailable, `AI_RISK_LEVEL` defaults to `UNKNOWN` and the approval message clearly marks the analysis as unavailable. The pipeline does not fail at this stage.

---

## 3c — Slack Approval Gate

### Webhook Receiver Design Choice

Three options were evaluated:

| Option | Approach | Verdict |
|---|---|---|
| **A — Generic Webhook Plugin** | Jenkins receives raw POST from Slack directly | ❌ No HMAC signature validation — spoofable |
| **B — Go HTTP server (chosen)** | Single binary validates Slack HMAC-SHA256, resolves Jenkins async via goroutine | ✅ Secure, zero runtime deps, ~5 MB distroless image |
| **C — AWS Lambda + API Gateway** | Serverless validation layer | ❌ Requires AWS — overkill for local setup |

**Option B (Go)** was chosen because:
1. **Standard library only** — `crypto/hmac`, `net/http`; no `go.mod` deps needed
2. Validates `X-Slack-Signature` HMAC-SHA256 + 5-minute replay guard before Jenkins is touched
3. Returns HTTP 200 to Slack within 3 seconds — Jenkins call runs in a **goroutine**
4. Compiles to a single static binary; Docker image built `FROM gcr.io/distroless/static-debian12` (~5 MB)

**Build:**
```bash
# Local
go build -ldflags="-s -w" -o webhook-receiver ./devops/slack/webhook-receiver.go

# Docker (distroless — minimal CVE surface)
docker build -f devops/slack/Dockerfile.receiver -t gym-slack-receiver .
```

### Approval Flow Sequence

```
User clicks [Approve] in Slack
    │
    ▼
Slack POST /slack/actions → webhook-receiver (Go)
    │
    ├── io.ReadAll(body, 1 MB limit)
    ├── validateSlackSignature()  ← HMAC-SHA256 + 5-min replay guard
    │       reject if invalid → HTTP 401
    │
    ├── url.ParseQuery() → json.Unmarshal(payload)
    ├── filter: only block_actions / deploy_approve / deploy_reject
    │
    ├── w.WriteHeader(200) + {"response_action":"clear"}
    │       ← returned to Slack IMMEDIATELY (< 1ms)
    │
    └── go func() {  ← goroutine — Jenkins call is async
            │
            ├── GET /job/gym-cd/<BUILD>/wfapi/pendingInputActions
            │       → finds `input` step ID
            │
            ├── POST /job/gym-cd/<BUILD>/input/<ID>/proceed  (APPROVE)
            │    or POST /job/gym-cd/<BUILD>/input/<ID>/abort (REJECT)
            │
            ├── POST Slack threaded reply  "✅ Approved by @username"
            └── log.Printf("AUDIT | decision=... approver=... ts=...")
        }()
```

**Jenkins pipeline side:**

```groovy
timeout(time: 4, unit: 'HOURS') {
    decision = input(
        id: 'deploy-approval',
        submitterParameter: 'APPROVER_ID',
        parameters: [
            choice(name: 'DEPLOY_DECISION', choices: ['APPROVE', 'REJECT']),
            string(name: 'APPROVER_COMMENT', ...)
        ]
    )
}
```

**Timeout behavior:** `FlowInterruptedException` is caught, the decision is set to `REJECTED`, an audit entry is written, and `error()` halts the pipeline. No deployment happens.

### Slack App Setup

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From an app manifest**
2. Paste the content of `devops/slack/slack-app-manifest.yaml`
3. Set **Interactivity Request URL**: `https://<WEBHOOK_RECEIVER_DOMAIN>/slack/actions`
4. Install to workspace → copy **Bot User OAuth Token** and **Signing Secret**
5. Store in Jenkins:
   - `slack-bot-token` (Secret text)
   - `slack-signing-secret` (Secret text)
6. Invite bot to channels: `/invite @gym-devops-bot` in `#ci-builds`, `#deploy-approvals`, `#deployments`

> [!IMPORTANT]
> The webhook receiver must be **publicly reachable** by Slack. For Minikube testing, use `ngrok http 5000` and update the Request URL in the Slack App settings. For production, expose via Kubernetes Ingress with TLS.

---

## 3d — Post-Approval AI Enhancement

After the approval decision is recorded, the AI service is called with `type: deployment_runbook` (APPROVE) or `type: rejection_analysis` (REJECT).

**On APPROVE — Runbook content includes:**
- Specific metrics to watch for this release (based on what changed)
- Error rate thresholds to monitor
- Rollback command ready to copy-paste
- Estimated deployment window

**On REJECT — Analysis includes:**
- Why the AI assessed high risk
- Specific suggested code fixes
- Which scan findings to address first

Both outputs are posted as **threaded replies** on the original approval Slack message, keeping the approval thread self-contained and auditable.

> [!NOTE]
> After a REJECT decision, `error()` is called immediately after stage 3d, skipping stages 3e/3f/3g. The rejection is audited in `approval-audit.json`.

---

## 3e — GitOps Manifest Update

### Branch Strategy Rationale

**Decision: Same-branch GitOps on `main`** (not a separate `gitops/` branch)

| Approach | Pros | Cons |
|---|---|---|
| **Same-branch (`main`)** | Single source of truth; no branch sync issues | Infra changes mixed with app code history |
| **Separate `gitops/` branch** | Clean separation; easier to audit infra-only changes | Requires PR process or force-push; more complex merge conflict handling |

**Rationale for `main`:** This project uses a single repository for both application code and Helm values. Since the CD pipeline is the only automated process writing to `values.yaml`, merge conflicts are rare. The git history for `values.yaml` alone provides a clean deployment audit trail via `git log -- helm/gym/values.yaml`.

**Patch implementation:**

```bash
# Preferred — yq: precise, YAML-aware, idempotent
yq e '.app.image.tag = "42"' -i helm/gym/values.yaml

# Fallback — sed: works when yq not available
sed -i 's|^\( *tag: *\).*|\142|' helm/gym/values.yaml
```

`yq` is preferred because `sed` can accidentally match comment lines or other `tag:` keys in the YAML. The pipeline checks for `yq` first and falls back to `sed` with a warning.

**Git credentials:** Token (PAT) injected via `withCredentials` and embedded in the HTTPS remote URL, then discarded. No SSH key management needed.

---

## 3f — ArgoCD Synchronization

```bash
# Force sync — don't wait for the 3-minute auto-poll cycle
argocd app sync gym-app --force --timeout 300 --insecure

# Wait until all resources are Healthy
argocd app wait gym-app --health --timeout 600 --insecure
```

**`--force`** bypasses ArgoCD's normal replacement strategy for immutable fields (e.g., Service ClusterIP). Needed when Helm generates field changes.

**`--insecure`** allows HTTP for in-cluster communication (Minikube). In production, remove this flag and use proper TLS certificates.

**ArgoCD Application key settings:**

| Setting | Value | Reason |
|---|---|---|
| `automated.prune: true` | Delete orphaned K8s resources | Prevent resource accumulation |
| `automated.selfHeal: true` | Revert out-of-band `kubectl` changes | Enforce GitOps contract |
| `ignoreDifferences` on HPA replicas | Don't revert HPA scale-out | Prevent ArgoCD fighting the HPA |
| `CreateNamespace=true` | Create `gym-app` namespace | Idempotent fresh installs |

**Failure behavior:** If ArgoCD does not reach Healthy within 10 minutes, the CD job fails, a `Slack` message is posted to `#deployments` with the rollback command, and the `approval-audit.json` still records the approval decision (so it doesn't get lost).

---

## 3g — Post-Deployment Verification

**10-minute watch window design:**

1. **60s stabilisation wait** — gives Kubernetes time to complete rolling update and pod readiness
2. **Post-metrics sample** — queries Prometheus for current error rate, latency, restart count
3. **AI comparison** — AI service receives pre-metrics vs post-metrics and identifies anomalies
4. **Decision:**
   - Anomaly → `currentBuild.result = 'UNSTABLE'` (yellow), incident report posted to `#deployments`
   - Healthy → green CD job, success summary posted to `#deployments`

**Why UNSTABLE and not FAILED on anomaly?**  
A post-deployment anomaly does not mean the deployment was wrong — it may be transient (traffic spike, cache warm-up). `UNSTABLE` captures the concern without triggering automated rollback. The incident report gives humans the context to decide.

**Metrics collected (best-effort, no crash on unavailability):**

```bash
rate(http_requests_total[5m])          # request rate
rate(http_requests_total{status=~"5.."}[5m])   # error rate
histogram_quantile(0.99, ...)          # p99 latency
kube_pod_container_status_restarts_total        # restart count
```

---

## Non-Functional Requirements Checklist

| Requirement | Implementation |
|---|---|
| ✅ Slack Gate — NO bypass | `input` step with no `ok` parameter; only APPROVE/REJECT via webhook-receiver |
| ✅ Approval Audit | `approval-audit.json` archived as fingerprinted artifact on every run |
| ✅ Fail-fast | `set -euo pipefail`; `error()` called on REJECT or ArgoCD timeout |
| ✅ Zero plaintext secrets | All creds via `withCredentials {}`; PAT embedded at push-time only |
| ✅ AI Transparency | All Slack AI blocks labeled "AI-generated — human review required" |
| ✅ AI Privacy | Scan JSON truncated; git diff is stat-only (no code content); no secrets |
| ✅ Idempotency | Re-running CD with same IMAGE_TAG produces same result; `sed`/`yq` patch is idempotent |
| ✅ Observability | `cdLog()` structured lines on every stage transition; `timestamps()` plugin |
| ✅ Slack HMAC validation | `webhook-receiver.py` validates X-Slack-Signature before any Jenkins call |

---

## Jenkins Setup for CD Job

1. **Create a new Pipeline job** named `gym-cd`
2. **Pipeline definition**: Pipeline script from SCM → `devops/Jenkinsfile.cd`
3. **Parameters**: The CI job injects these — but add them as defaults so the job is testable manually:
   - `IMAGE_TAG` (String)
   - `GIT_COMMIT` (String)
   - `GIT_BRANCH` (String, default: `main`)
   - `FULL_IMAGE` (String)
4. **Plugins required:**
   - `pipeline-input-step` (for `input` step)
   - `credentials-binding` (for `withCredentials`)
   - `timestamper`
   - `pipeline-build-step` (for trigger from CI)
5. **Credentials** (in addition to CI creds):

| ID | Kind | Stage |
|---|---|---|
| `github-credentials` | Username + Password (PAT) | 3e |
| `argocd-token` | Secret text | 3f |
| `slack-signing-secret` | Secret text | webhook-receiver (env) |

---

## FAQ & Troubleshooting

**Q: The Slack approval button does nothing.**  
A: Check that:
1. The **Interactivity Request URL** in the Slack App settings points to your `webhook-receiver.py`
2. The receiver is publicly accessible (use `ngrok` for Minikube testing)
3. `SLACK_SIGNING_SECRET` in the receiver's environment matches the one in Slack App settings
4. Check receiver logs: `kubectl logs -l app=slack-receiver -n devops`

**Q: `input` step times out before I click the button.**  
A: The timeout is 4 hours. If testing locally, reduce `APPROVAL_TIMEOUT_HRS` to `1` for faster cycles.

**Q: ArgoCD sync fails with "another operation is already in progress".**  
A: ArgoCD only allows one sync at a time. If a manual sync is running, the pipeline sync will fail. Wait for it to complete or use `argocd app terminate-op gym-app` first.

**Q: `yq` is not found on the Jenkins agent.**  
A: The pipeline falls back to `sed`. To install `yq` permanently on the agent:
```bash
curl -sL https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 \
  -o /usr/local/bin/yq && chmod +x /usr/local/bin/yq
```

**Q: The GitOps commit causes an infinite CI/CD loop.**  
A: Add `[skip ci]` to the commit message template, or configure the GitHub webhook branch filter to ignore commits by `jenkins-cd@gym.internal`. The Jenkins Multibranch pipeline can also be configured to ignore commits from specific users.

**Q: Post-deployment metrics show as unavailable.**  
A: Prometheus must be running and reachable at `http://prometheus.monitoring.svc.cluster.local:9090`. This is best-effort — the pipeline will continue even if metrics are unavailable.
