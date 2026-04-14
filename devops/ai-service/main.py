"""
╔══════════════════════════════════════════════════════════════════════════════╗
║  AI DevOps Service — Stage 5                                                ║
║  FastAPI backend that powers all AI-driven pipeline decisions.              ║
║                                                                             ║
║  Endpoints consumed by the CI/CD pipelines:                                 ║
║    POST /analyze/build           ← Jenkinsfile.ci  stage 2.7               ║
║    POST /analyze/deployment      ← Jenkinsfile.cd  stage 3b                ║
║    POST /analyze/post-approval   ← Jenkinsfile.cd  stage 3d                ║
║    POST /generate/commit-message ← Jenkinsfile.cd  stage 3e                ║
║    POST /verify/post-deployment  ← Jenkinsfile.cd  stage 3g                ║
║    GET  /health                  ← Kubernetes liveness/readiness probes    ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import logging
import os
import time
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.security import api_key_middleware
from app.routers import analyze, generate, verify

# ── Structured logging ────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
)
logger = logging.getLogger("ai-devops-service")


# ── Lifespan (startup / shutdown hooks) ──────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 AI DevOps Service starting up | provider=%s", settings.LLM_PROVIDER)
    yield
    logger.info("🛑 AI DevOps Service shutting down")


# ── App factory ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI DevOps Service",
    description="LLM-powered analysis engine for CI/CD pipeline decisions",
    version="1.0.0",
    docs_url="/docs" if settings.ENABLE_DOCS else None,
    redoc_url="/redoc" if settings.ENABLE_DOCS else None,
    lifespan=lifespan,
)

# ── CORS (restrict in production) ────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-API-Key"],
)


# ── Global request timer + API key gate ─────────────────────────────────────
@app.middleware("http")
async def request_middleware(request: Request, call_next):
    start = time.monotonic()
    # Health endpoint is exempt from auth
    if request.url.path not in ("/health", "/metrics"):
        auth_error = await api_key_middleware(request)
        if auth_error:
            return auth_error
    response = await call_next(request)
    elapsed_ms = (time.monotonic() - start) * 1000
    logger.info(
        "method=%s path=%s status=%d elapsed_ms=%.1f",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response


# ── Global exception handler ─────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal server error", "detail": str(exc)},
    )


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(analyze.router, prefix="/analyze", tags=["Analysis"])
app.include_router(generate.router, prefix="/generate", tags=["Generation"])
app.include_router(verify.router,   prefix="/verify",   tags=["Verification"])


# ── Health probe ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health():
    return {
        "status": "healthy",
        "provider": settings.LLM_PROVIDER,
        "model": settings.LLM_MODEL,
        "version": "1.0.0",
    }


# ── Entrypoint ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        workers=int(os.getenv("WORKERS", "2")),
        log_level=settings.LOG_LEVEL.lower(),
    )
