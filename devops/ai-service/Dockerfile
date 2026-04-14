# ══════════════════════════════════════════════════════════════════════════════
#  AI DevOps Service — Multi-Stage Dockerfile
#  Target: distroless Python 3.12 slim (~80MB final image)
#
#  Build:  docker build -t aboelaiz/ai-devops-service:latest .
#  Run:    docker run -p 8000:8000 --env-file .env aboelaiz/ai-devops-service:latest
# ══════════════════════════════════════════════════════════════════════════════

# ── Stage 1: dependency builder ───────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Install pip dependencies into a prefix we can COPY cleanly
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Stage 2: production image ─────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

# Non-root user (mirrors the app-deployment.yaml UID 1001)
RUN groupadd -g 1001 appgroup && \
    useradd  -u 1001 -g appgroup -s /sbin/nologin -M appuser

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY main.py .
COPY app/ ./app/

# Health-check so Docker / k8s knows the container is alive
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=3)"

USER appuser
EXPOSE 8000

# 2 workers: handles concurrent Jenkins requests without excessive memory
CMD ["python", "-m", "uvicorn", "main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "2", \
     "--log-level", "info", \
     "--no-access-log"]
