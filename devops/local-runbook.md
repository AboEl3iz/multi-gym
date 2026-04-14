# 🏃 Stage 7 — Local Runbook & Testing Guide

> **Environment:** Docker Compose (full stack) + Minikube (Helm chart)  
> **Goal:** Simulate the entire CI/CD pipeline end-to-end on your local machine  
> **Time estimate:** ~45 minutes for the full walkthrough

---

## 📋 Prerequisites

| Tool | Version | Check |
|---|---|---|
| Docker + Compose | v24+ | `docker --version` |
| Minikube | v1.32+ | `minikube version` |
| kubectl | v1.28+ | `kubectl version --client` |
| Helm | v3.14+ | `helm version` |
| uv (Python) | v0.4+ | `uv --version` |
| curl + jq | any | `curl --version && jq --version` |

---

## Part A — Docker Compose Local Stack

### A1. Start Everything

```bash
cd "/media/karim/New Volume1/nodejs/gym"

# Start the full stack (app, db, jenkins, prometheus, grafana, ai-service, etc.)
docker compose up -d

# Watch startup logs
docker compose logs -f app db ai-devops-service
```

**Expected:** All containers reach `healthy` or `running` state within ~60 seconds.

```bash
# Verify
docker compose ps
```

### A2. Verify Service Endpoints

| Service | URL | Expected |
|---|---|---|
| Gym API | http://localhost:3001/health | `{"status":"ok"}` |
| AI DevOps Service | http://localhost:8000/health | `{"status":"healthy","provider":"mock"}` |
| AI Swagger Docs | http://localhost:8000/docs | Swagger UI |
| Prometheus | http://localhost:9090 | Prometheus UI |
| Grafana | http://localhost:3000 | Login: admin/admin |
| Alertmanager | http://localhost:9093 | Alertmanager UI |
| Jenkins | http://localhost:8080 | Jenkins UI |
| Jaeger | http://localhost:16686 | Tracing UI |
| MailHog | http://localhost:8025 | Email catcher |

```bash
# Quick health check of all services
for url in \
  "http://localhost:3001/health" \
  "http://localhost:8000/health" \
  "http://localhost:9090/-/healthy" \
  "http://localhost:9093/-/healthy"; do
  echo -n "GET $url → "
  curl -sf "$url" | head -c 60
  echo
done
```

---

### A3. Test the AI DevOps Service (Stage 5) Manually

**Test 1: CI Build Analysis**
```bash
curl -sf -X POST http://localhost:8000/analyze/build \
  -H "Content-Type: application/json" \
  -d '{
    "build_number": "42",
    "branch": "main",
    "commit": "abc1234",
    "image": "aboelaiz/gym:42",
    "owasp_summary": "{\"summary\": \"No critical findings\"}",
    "trivy_summary": "{\"Results\": []}"
  }' | jq .
```

**Expected response:**
```json
{
  "risk_level": "LOW",
  "summary": "Build #MOCK completed successfully...",
  "recommendation": "Safe to proceed with deployment.",
  "findings": []
}
```

**Test 2: Deployment Risk Assessment**
```bash
curl -sf -X POST http://localhost:8000/analyze/deployment \
  -H "Content-Type: application/json" \
  -d '{
    "app_name": "gym",
    "image_tag": "42",
    "git_branch": "main",
    "git_commit_short": "abc1234",
    "git_log": "abc1234 feat: add membership endpoint",
    "git_diff_stat": "src/routes/membership.ts | 45 +++++"
  }' | jq .
```

**Test 3: Commit Message Generation**
```bash
curl -sf -X POST http://localhost:8000/generate/commit-message \
  -H "Content-Type: application/json" \
  -d '{
    "app_name": "gym",
    "old_tag": "41",
    "new_tag": "42",
    "branch": "main",
    "commit": "abc1234",
    "risk_level": "MEDIUM"
  }' | jq .
```

**Test 4: Post-Deployment Verification**
```bash
curl -sf -X POST http://localhost:8000/verify/post-deployment \
  -H "Content-Type: application/json" \
  -d '{
    "app_name": "gym",
    "image_tag": "42",
    "watch_seconds": 10,
    "pre_metrics": "{\"status\":\"success\"}",
    "post_metrics": "{\"status\":\"success\"}"
  }' | jq .
```

---

### A4. Verify Prometheus Scraping

```bash
# Check all targets are UP
curl -sf 'http://localhost:9090/api/v1/targets' | \
  jq '.data.activeTargets[] | {job: .labels.job, health: .health, lastError: .lastError}'
```

Check that `gym-app`, `postgres`, `cadvisor`, and `ai-devops-service` all show `"health": "up"`.

```bash
# Verify an actual app metric exists
curl -sf 'http://localhost:9090/api/v1/query?query=up' | jq '.data.result[] | .metric.job'
```

---

### A5. Grafana Dashboard

1. Open http://localhost:3000 → login: `admin` / `admin`
2. Navigate to **Dashboards → Gym App — DevSecOps Dashboard**
3. Confirm these panels populate:
   - Request Rate (req/s)
   - HTTP 5xx Error Rate gauge
   - Response Latency P50/P95/P99
   - Pod Restart Count
   - PostgreSQL Active Connections

Generate some traffic to populate the graphs:
```bash
# Fire 100 API requests
for i in $(seq 1 100); do
  curl -sf http://localhost:3001/health > /dev/null
done
```

---

### A6. Test Alert Firing

```bash
# Temporarily stop the app to trigger InstanceDown alert
docker compose stop app

# Wait 90 seconds, then check Prometheus alerts
sleep 90
curl -sf 'http://localhost:9090/api/v1/alerts' | \
  jq '.data.alerts[] | {name: .labels.alertname, state: .state}'

# Verify Alertmanager received it
curl -sf 'http://localhost:9093/api/v1/alerts' | jq '.[].labels.alertname'

# Restart the app
docker compose start app
```

---

## Part B — Minikube Helm Chart Testing (Stage 4 Verification)

### B1. Start Minikube

```bash
minikube start --cpus=4 --memory=6144 --driver=docker

# Verify cluster is running
kubectl cluster-info
kubectl get nodes
```

### B2. Validate Helm Templates (no cluster needed)

```bash
cd "/media/karim/New Volume1/nodejs/gym"

helm template gym ./helm/gym \
  -f helm/gym/values-local.yaml \
  --set secrets.postgresPassword=testpass123 \
  --set secrets.jwtSecret=testsecret123 \
  --set secrets.emailPassword=testemail123 \
  | tee /tmp/gym-rendered.yaml | grep "^kind:" | sort | uniq -c
```

**Expected output (resource types):**
```
  1 ConfigMap
  1 Deployment          ← app
  1 Deployment          ← db
  1 HorizontalPodAutoscaler (disabled in local, may not appear)
  1 PodDisruptionBudget
  1 Secret
  1 Service             ← app
  1 Service             ← db
  1 ServiceAccount
```

```bash
# Deep-validate with helm lint
helm lint ./helm/gym \
  -f helm/gym/values-local.yaml \
  --set secrets.postgresPassword=test \
  --set secrets.jwtSecret=test \
  --set secrets.emailPassword=test
```

**Expected:** `0 chart(s) failed`

### B3. Deploy to Minikube

```bash
# Create namespace
kubectl create namespace gym-app --dry-run=client -o yaml | kubectl apply -f -

# Install the Helm chart with local values
helm upgrade --install gym ./helm/gym \
  -f helm/gym/values-local.yaml \
  --set secrets.postgresPassword=testpass123 \
  --set secrets.jwtSecret=testsecret123 \
  --set secrets.emailPassword=testemail123 \
  --namespace gym-app \
  --wait \
  --timeout 3m

echo "✅ Helm install complete"
```

### B4. Verify Pods

```bash
# Watch pods come up
kubectl get pods -n gym-app -w

# Expected: both pods Running and Ready
# NAME                         READY   STATUS    RESTARTS
# gym-db-xxxx                  1/1     Running   0
# gym-app-xxxx                 1/1     Running   0
```

```bash
# Check init-container completed
kubectl describe pod -l app.kubernetes.io/component=app -n gym-app | \
  grep -A5 "Init Containers:"

# Check probes
kubectl describe pod -l app.kubernetes.io/component=app -n gym-app | \
  grep -A3 "Liveness\|Readiness\|Startup"
```

### B5. Access the App

```bash
# Option 1: minikube service (opens browser)
minikube service gym-app-service -n gym-app --url

# Option 2: port-forward
kubectl port-forward svc/gym-app-service 3001:3001 -n gym-app &

# Test the API
curl http://localhost:3001/health
```

### B6. Verify Security Contexts

```bash
# Confirm non-root user
kubectl exec -n gym-app \
  $(kubectl get pod -l app.kubernetes.io/component=app -n gym-app -o name | head -1) \
  -- id

# Expected: uid=1001(appuser) gid=1001(appgroup)

# Confirm read-only root FS (local overrides this to false — just verify the setting)
kubectl get pod \
  $(kubectl get pod -l app.kubernetes.io/component=app -n gym-app -o jsonpath='{.items[0].metadata.name}') \
  -n gym-app -o jsonpath='{.spec.containers[0].securityContext}' | jq .
```

### B7. Test Helm Upgrade (simulate CD pipeline)

```bash
# Simulate the CD pipeline patching the image tag
helm upgrade gym ./helm/gym \
  -f helm/gym/values-local.yaml \
  --set app.image.tag=99 \
  --set secrets.postgresPassword=testpass123 \
  --set secrets.jwtSecret=testsecret123 \
  --set secrets.emailPassword=testemail123 \
  --namespace gym-app \
  --wait

# Watch rolling update (zero downtime)
kubectl rollout status deployment/gym-app -n gym-app

# Rollback (simulate ArgoCD rollback)
helm rollback gym -n gym-app --wait
```

### B8. PodDisruptionBudget Test

```bash
# Check PDB exists
kubectl get pdb -n gym-app

# Try draining the node (should be blocked if pdb.minAvailable = 1)
# (safe test — describe only)
kubectl describe pdb -n gym-app
```

### B9. Clean Up Minikube

```bash
helm uninstall gym -n gym-app
kubectl delete namespace gym-app
# minikube stop  # optional
```

---

## Part C — AI Service with Real LLM (Optional)

To switch from `mock` → real OpenAI:

```bash
cd "/media/karim/New Volume1/nodejs/gym/devops/ai-service"

# Copy and edit the env file
cp .env.example .env
# Edit .env: set LLM_PROVIDER=openai and OPENAI_API_KEY=sk-...

# Run locally with uv
uv run uvicorn main:app --reload --port 8000

# Test with a real LLM response
curl -sf -X POST http://localhost:8000/analyze/deployment \
  -H "Content-Type: application/json" \
  -d '{
    "app_name": "gym",
    "image_tag": "42",
    "git_branch": "main",
    "git_commit_short": "abc1234",
    "git_log": "abc1234 feat: add membership tier system\nabc1233 fix: correct JWT expiry calculation",
    "git_diff_stat": "src/routes/membership.ts  | 120 +++++\nsrc/models/User.ts       |  15 ++-\npackage.json             |   2 +-"
  }' | jq .
```

---

## Part D — Simulate Complete Pipeline Locally

### D1. Simulate CI (without Jenkins)

```bash
cd "/media/karim/New Volume1/nodejs/gym"

# Step 2.4: Build the Docker image
docker build -t aboelaiz/gym:local-test .

# Step 2.5: Trivy scan (install if needed: https://aquasecurity.github.io/trivy)
trivy image --severity HIGH,CRITICAL aboelaiz/gym:local-test || true

# Step 2.7: AI Build Summary
curl -sf -X POST http://localhost:8000/analyze/build \
  -H "Content-Type: application/json" \
  -d '{
    "build_number": "local-1",
    "branch": "main",
    "commit": "'$(git rev-parse --short HEAD)'",
    "image": "aboelaiz/gym:local-test",
    "owasp_summary": "{}",
    "trivy_summary": "{}"
  }' | jq '{risk: .risk_level, summary: .summary}'
```

### D2. Simulate CD (without Jenkins/ArgoCD)

```bash
# Step 3b: AI Deployment Analysis
curl -sf -X POST http://localhost:8000/analyze/deployment \
  -H "Content-Type: application/json" \
  -d '{
    "app_name": "gym",
    "image_tag": "local-1",
    "git_branch": "main",
    "git_commit_short": "'$(git rev-parse --short HEAD)'",
    "git_log": "'$(git log --oneline -5 | tr '\n' '|')'",
    "git_diff_stat": "'$(git diff HEAD~1 HEAD --stat 2>/dev/null | head -5 | tr '\n' '|')'"
  }' | jq '{risk: .risk_level, score: .risk_score, window: .deployment_window}'

# Step 3e: Generate GitOps commit message
curl -sf -X POST http://localhost:8000/generate/commit-message \
  -H "Content-Type: application/json" \
  -d '{
    "app_name": "gym",
    "old_tag": "prev",
    "new_tag": "local-1",
    "branch": "main",
    "commit": "'$(git rev-parse --short HEAD)'",
    "risk_level": "LOW"
  }' | jq -r .message

# Step 3g: Post-deployment verification
curl -sf -X POST http://localhost:8000/verify/post-deployment \
  -H "Content-Type: application/json" \
  -d '{
    "app_name": "gym",
    "image_tag": "local-1",
    "watch_seconds": 10,
    "pre_metrics": "{}",
    "post_metrics": "{}"
  }' | jq '{anomaly: .anomaly_detected, status: .health_status}'
```

---

## 🚨 Troubleshooting

| Symptom | Diagnosis | Fix |
|---|---|---|
| App pod in `CrashLoopBackOff` | Missing env vars or DB not ready | `kubectl logs <pod> -n gym-app --previous` |
| Init container stuck | DB Service DNS not resolving | `kubectl exec <init-pod> -- nslookup gym-db-service` |
| `helm lint` YAML error | Template rendering issue | `helm template ... 2>&1 \| head -30` |
| Prometheus target `DOWN` | App not exposing `/metrics` | Check `npm` deps include `prom-client` |
| Grafana dashboard empty | No Prometheus data | Make sure `scrape_interval` is correct |
| AI service returns 401 | API_KEY mismatch | Set `API_KEY=` (empty) to disable auth locally |
| cAdvisor won't start | Privilege issue on some distros | Add `devices: [/dev/kmsg]` to compose service |

---

## ✅ Completion Checklist

- [ ] `docker compose up -d` → all services healthy
- [ ] All 4 AI endpoints return valid JSON
- [ ] Prometheus scrapes gym-app, postgres, cadvisor
- [ ] Grafana dashboard renders with live data
- [ ] `helm lint` passes with 0 failures
- [ ] `helm install` → both pods Running in Minikube
- [ ] `helm upgrade` rolling update completes without downtime
- [ ] `helm rollback` works correctly
- [ ] Alert fires when app is stopped, Alertmanager receives it
