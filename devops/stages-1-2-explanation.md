# CI/CD Pipeline — Stage 1 & 2 Implementation Guide

> **Scope:** This document covers the complete implementation details for  
> **Stage 1 (Source Control)** and **Stage 2 (Continuous Integration)**  
> of the Gym App DevSecOps pipeline. All files referenced here live under `devops/`.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Files Produced](#files-produced)
3. [Stage 1 — Source Control](#stage-1--source-control)
   - [1.1 GitHub Webhook Configuration](#11-github-webhook-configuration)
   - [1.2 Jenkins Credential Setup](#12-jenkins-credential-setup)
   - [1.3 Branch Strategy](#13-branch-strategy)
4. [Stage 2 — Continuous Integration](#stage-2--continuous-integration)
   - [2.1 Checkout & Image Tagging](#21-checkout--image-tagging)
   - [2.2 OWASP Dependency-Check](#22-owasp-dependency-check)
   - [2.3 SonarQube Analysis & Quality Gate](#23-sonarqube-analysis--quality-gate)
   - [2.4 Docker Build (Multi-Stage)](#24-docker-build-multi-stage)
   - [2.5 Trivy Image Vulnerability Scan](#25-trivy-image-vulnerability-scan)
   - [2.6 Registry Push](#26-registry-push)
   - [2.7 AI Build Summary](#27-ai-build-summary)
5. [Non-Functional Requirements Checklist](#non-functional-requirements-checklist)
6. [Jenkins Setup Prerequisites](#jenkins-setup-prerequisites)
7. [FAQ & Troubleshooting](#faq--troubleshooting)

---

## Architecture Overview

```
GitHub Push  ──→  Webhook  ──→  Jenkins CI Job (Jenkinsfile.ci)
                                       │
                    ┌──────────────────┼──────────────────────┐
                    │                  │                       │
             OWASP DC           SonarQube          (wait for QG)
             (npm vulns)     (static analysis)
                    │                  │
                    └──────────────────┘
                                 │ ALL PASS
                                 ▼
                         Docker Multi-Stage Build
                                 │
                                 ▼
                         Trivy Image Scan  ←── shift-left gate
                                 │ PASS
                                 ▼
                         Push to Docker Hub
                         (versioned tag + latest)
                                 │
                                 ▼
                         AI Build Summary
                         (OpenAI GPT-4 via ai-devops-service)
                                 │
                          ┌──────┴──────┐
                          ▼             ▼
                   Jenkins Artifact  Slack #ci-builds
                          │
                          ▼
                   Trigger CD Job  ──→  Jenkinsfile.cd
                   (with IMAGE_TAG param)
```

---

## Files Produced

| File | Purpose |
|---|---|
| `devops/Jenkinsfile.ci` | Main CI pipeline definition |
| `devops/sonar-project.properties` | SonarQube scanner configuration |
| `Dockerfile` | Hardened multi-stage production image |
| `devops/stages-1-2-explanation.md` | This document |

---

## Stage 1 — Source Control

### 1.1 GitHub Webhook Configuration

The `Jenkinsfile.ci` uses the `githubPush()` trigger which is activated by GitHub webhooks. To configure:

**In GitHub repository → Settings → Webhooks → Add webhook:**

| Field | Value |
|---|---|
| Payload URL | `http://<JENKINS_URL>/github-webhook/` |
| Content type | `application/json` |
| Events | ✅ Just the **push** event |
| Secret | Leave blank (Jenkins GitHub plugin handles HMAC) |

**Branch filtering** is implemented inside the pipeline using the `when { anyOf { branch ... } }` directive:

```groovy
when {
    anyOf {
        branch 'main'
        branch 'master'
        branch pattern: 'feature/*', comparator: 'GLOB'
    }
}
```

This means:
- `main` / `master` → full CI + triggers CD
- `feature/*` → full CI, **no CD trigger**
- Any other branch → ignored

> [!IMPORTANT]
> The Jenkins job must be a **Multibranch Pipeline** for the `branch 'main'` directive to work. A free-style job will not match branch names.

### 1.2 Jenkins Credential Setup

Zero plaintext secrets in any committed file. Create these in **Jenkins → Manage Jenkins → Credentials → System → Global:**

| Credential ID | Kind | Used in Stage |
|---|---|---|
| `dockerhub-credentials` | Username + Password | 2.4, 2.5, 2.6 |
| `sonarqube-token` | Secret text | 2.3 |
| `ai-api-key` | Secret text | 2.7 |
| `slack-bot-token` | Secret text | 2.7, post-failure |
| `slack-signing-secret` | Secret text | CD pipeline (Stage 3) |

> [!CAUTION]
> Never put passwords, tokens, or signing secrets in `Jenkinsfile.ci` or any file committed to git. Jenkins will mask credential values in logs automatically, but only if injected through `withCredentials {}`.

### 1.3 Branch Strategy

```
main ────────────────●────────────────●── (production deploys via CD)
                    /                /
feature/login ─────●──●──●          /
feature/api   ──────────────●──●───●
```

- `feature/*` branches run full CI (lint + security + tests + build) but **do not push** to the registry and **do not trigger CD**
- Only `main` / `master` merges result in a Docker image being pushed and the CD pipeline being triggered
- The image tag is `BUILD_NUMBER` by default, ensuring every successful main build produces a unique, immutable tag

---

## Stage 2 — Continuous Integration

### 2.1 Checkout & Image Tagging

```groovy
env.IMAGE_TAG = params.IMAGE_TAG_OVERRIDE?.trim()
    ? params.IMAGE_TAG_OVERRIDE.trim()
    : "${env.BUILD_NUMBER}"
```

**Why `BUILD_NUMBER`?**
- Monotonically increasing → no collisions
- Traceable back to the Jenkins build
- Immutable: once pushed, `aboelaiz/gym:42` always refers to that exact build

**Override mechanism:** If `IMAGE_TAG_OVERRIDE` is provided as a Jenkins build parameter (e.g., for a hotfix re-tag), it takes precedence. This is the only supported way to change the tag.

### 2.2 OWASP Dependency-Check

**Shift-Left placement:** Runs before the Docker build. If npm packages have known HIGH/CRITICAL CVEs (CVSS ≥ 7), the build stops here — no image is ever built from vulnerable code.

**Implementation details:**

```groovy
dependencyCheck(
    additionalArguments: '--failOnCVSS 7 --format HTML --format JSON',
    odcInstallation: 'OWASP-DC'
)
dependencyCheckPublisher(
    pattern: 'owasp-report/dependency-check-report.xml',
    failedTotalCritical: 0,
    failedTotalHigh: 0
)
```

**Jenkins plugin required:** [OWASP Dependency-Check Plugin](https://plugins.jenkins.io/dependency-check-jenkins-plugin/)  
**Tool name:** Configure a "OWASP-DC" installation in **Jenkins → Global Tool Configuration**

**Report:** `owasp-report/dependency-check-report.html` archived as a Jenkins artifact after every run (even on failure), enabling continuous audit tracking.

**NVD API Key (optional but recommended):**  
Without an NVD API key, the initial database download is rate-limited. Store the key as a Jenkins credential and inject it via `additionalArguments: '--nvdApiKey \${NVD_KEY}'`.

### 2.3 SonarQube Analysis & Quality Gate

**Two-stage design** (Analysis → Gate wait) allows the scanner to submit results asynchronously while Jenkins pauses only at the gate check:

```
Stage 2.3 → sonar-scanner submits        (fast, ~2 min)
Stage 2.3b → waitForQualityGate()        (blocks up to 10 min)
```

**`sonar-project.properties` key settings:**

```properties
sonar.sources=src
sonar.tests=src
sonar.test.inclusions=**/*.spec.ts,**/*.test.ts
sonar.typescript.lcov.reportPaths=coverage/lcov.info
sonar.exclusions=**/node_modules/**,**/dist/**
```

The file is committed to the repo — it is **non-secret** (no token, no password). The token is injected only at runtime:

```groovy
withCredentials([string(credentialsId: 'sonarqube-token', variable: 'SONAR_TOKEN')]) {
    withSonarQubeEnv('SonarQube') {
        sh "sonar-scanner -Dsonar.login=\${SONAR_TOKEN} ..."
    }
}
```

**Quality Gate failure** calls `error()` which immediately marks the build as FAILED and prevents the Docker build stage from running.

> [!NOTE]
> `withSonarQubeEnv('SonarQube')` requires a SonarQube server named "SonarQube" to be configured in **Jenkins → Manage Jenkins → Configure System → SonarQube servers**.

### 2.4 Docker Build (Multi-Stage)

The `Dockerfile` was upgraded from the original basic version to a hardened production image:

**Builder stage:**
- `node:20-alpine` base → lean attack surface
- Full `npm ci` (dev + prod) for TypeScript compilation
- `npm prune --production` to strip dev deps before handoff

**Runner stage (production):**

| Hardening | Implementation |
|---|---|
| Non-root user | `adduser gymuser UID 1001` + `USER gymuser` |
| No secrets baked in | Config via `ENV` only; actual values from K8s Secret |
| OCI labels | `BUILD_NUMBER` and `GIT_COMMIT` embedded as labels |
| HEALTHCHECK | `wget` probe on `/health` — no curl needed |
| Signal handling | `CMD ["node", "dist/index.js"]` — exec form, no shell wrapper |

**Build command with labels:**

```bash
docker build \
  --build-arg NODE_ENV=production \
  --label "git.commit=${GIT_COMMIT}" \
  --label "build.number=${IMAGE_TAG}" \
  -t aboelaiz/gym:${IMAGE_TAG} \
  .
```

### 2.5 Trivy Image Vulnerability Scan

**Critical placement:** Runs AFTER the Docker build but **BEFORE** the registry push. This ensures:
- Only clean images are ever published
- The registry is never poisoned with vulnerable layers

```bash
trivy image \
  --exit-code 1 \
  --severity HIGH,CRITICAL \
  --format json \
  --output trivy-image-report.json \
  "aboelaiz/gym:${IMAGE_TAG}"
```

`--exit-code 1` causes Trivy to exit non-zero on any finding → Jenkins marks the stage as failed.

**Trivy binary caching:**

```bash
export TRIVY_DIR="${WORKSPACE_TMP}/trivy-bin"
if [ ! -f "${TRIVY_DIR}/trivy" ]; then
    curl -sfL .../install.sh | sh -s -- -b "${TRIVY_DIR}" latest
fi
```

`WORKSPACE_TMP` is Jenkins-managed and shared across builds on the same agent → the binary is downloaded only once, not per build.

**Scan scope:** Image layers only. Filesystem scanning (npm packages) was already done by OWASP Dependency-Check in 2.2, so there is no duplication.

### 2.6 Registry Push

Only executes if all prior stages (OWASP, SonarQube, Docker Build, Trivy) passed:

```
Versioned tag: aboelaiz/gym:42     ← immutable, never overwritten
Latest tag:    aboelaiz/gym:latest ← mutable pointer, always updated
```

**Immutability guarantee:** The pipeline never uses `docker build -t image:latest` directly. It always builds with the versioned tag first, then re-tags:

```bash
docker push aboelaiz/gym:42        # versioned — immutable
docker tag  aboelaiz/gym:42 aboelaiz/gym:latest
docker push aboelaiz/gym:latest    # mutable alias only
```

**Credential hygiene:**
- `docker login` is called with `--password-stdin` (no password in shell args → not visible in `ps` or logs)
- `docker logout` called immediately after push
- Credentials never stored in env vars at the pipeline level

### 2.7 AI Build Summary

After all gates pass, the AI DevOps service produces a comprehensive summary. The design enforces **AI Transparency** and **AI Privacy** requirements:

**What is sent to the AI:**

```json
{
  "type": "build_summary",
  "build_number": "42",
  "branch": "main",
  "commit": "abc1234",
  "image": "aboelaiz/gym:42",
  "owasp_summary": "{ ...truncated to 4000 chars... }",
  "trivy_summary": "{ ...truncated to 4000 chars... }"
}
```

**What is NEVER sent:** passwords, tokens, environment variables, customer data, PII.

**AI output (stored as `ai-build-summary.json`):**

```json
{
  "summary": "Build #42 added 3 new API endpoints...",
  "risk_level": "LOW",
  "key_changes": ["auth module refactored", "deps updated"],
  "recommendation": "Safe to deploy. Monitor /api/auth response times.",
  "generated_by": "AI — requires human review before action"
}
```

**Slack message** posts to `#ci-builds` using Block Kit. Every AI-generated section includes the label:
> *🤖 AI-generated — requires human review before action*

**Graceful degradation:** If the AI service is unavailable (timeout after 120s), the pipeline **does not fail**. The artifact is skipped and a warning is logged. CI success is not AI-dependent.

---

## Non-Functional Requirements Checklist

| Requirement | Implementation |
|---|---|
| ✅ Shift-Left security | OWASP + Trivy run BEFORE registry push |
| ✅ Zero plaintext secrets | All creds via `withCredentials {}` / Jenkins store |
| ✅ Fail-fast | `set -euo pipefail` in all shell steps; `error()` on gate failures |
| ✅ Idempotency | Re-running build N produces same image N; `--no-cache` on Docker build |
| ✅ Observability | `ciLog()` emits structured JSON-like lines; `timestamps()` option wraps all logs |
| ✅ Immutable image tags | Versioned tag = BUILD_NUMBER; never overwritten |
| ✅ AI Transparency | All AI content labeled; human review warning on every Slack message |
| ✅ AI Privacy | Scan JSON truncated to 4KB; no secrets/PII in AI payload |

---

## Jenkins Setup Prerequisites

Install these Jenkins plugins before running the pipeline:

| Plugin | Purpose |
|---|---|
| `git` | Checkout SCM |
| `github` | Webhook integration |
| `pipeline-multibranch` | Branch filtering |
| `dependency-check-jenkins-plugin` | Stage 2.2 OWASP |
| `sonarqube-scanner` | Stage 2.3 SonarQube |
| `nodejs` | NodeJS tool wrapper |
| `credentials-binding` | `withCredentials {}` |
| `pipeline-build-step` | CD job trigger |
| `timestamper` | Log timestamps |
| `email-ext` | Email notifications |

**Best way to install (if you have the Jenkins CLI):**

```bash
jenkins-plugin-cli --plugins \
  git github workflow-multibranch \
  dependency-check-jenkins-plugin \
  sonarqube-scanner nodejs credentials-binding \
  pipeline-build-step timestamper email-ext
```

---

## FAQ & Troubleshooting

**Q: The OWASP scan is very slow on first run.**  
A: Expected. The NVD vulnerability database (~200 MB) is downloaded on first run. Subsequent runs use the cached DB. Provide an NVD API key to avoid rate-limiting.

**Q: SonarQube Quality Gate times out.**  
A: Check that the SonarQube server URL (`SONAR_HOST_URL`) is reachable from the Jenkins agent. The `waitForQualityGate` call is set to 10-minute timeout.

**Q: Trivy download fails in CI.**  
A: The Trivy install script is fetched from GitHub. If the agent has no internet access, pre-install Trivy in a custom Jenkins agent Docker image and set `TRIVY_DIR` to its location.

**Q: AI build summary is missing but CI passes.**  
A: Correct — the AI stage is non-blocking (graceful degradation). Check that:  
1. `ai-api-key` credential is set in Jenkins  
2. `ai-devops-service` is reachable at `AI_SERVICE_URL`  
3. Review Jenkins console for the HTTP response code logged by `ciLog`

**Q: `docker login` fails with "permission denied".**  
A: The Jenkins agent user must be in the `docker` group, or Docker must be configured with `rootless` mode. On Minikube, use the Minikube Docker daemon: `eval $(minikube docker-env)`.

**Q: How do I add a new branch to the CI trigger?**  
A: Add another `branch 'hotfix/*'` entry to the `when { anyOf { ... } }` block in `Jenkinsfile.ci`. The GitHub webhook already sends all push events; Jenkins does the filtering.
