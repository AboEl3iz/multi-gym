# ════════════════════════════════════════════════════════════════════════════
#  GYM APP — Production Multi-Stage Dockerfile
#  Stage 2.4 — Container Image Building
#
#  Security hardening applied:
#    • Non-root user (gymuser UID 1001)
#    • Read-only root filesystem ready (no writes to /app)
#    • No dev dependencies in final image
#    • No secrets baked in — config via ARG/ENV only
#    • Minimal Alpine base — smallest attack surface
#    • Layer caching optimised (deps installed before code copy)
# ════════════════════════════════════════════════════════════════════════════

# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Build-time arguments (non-secret config only — no passwords, no tokens)
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /build

# Copy manifests first to benefit from Docker layer caching
COPY package*.json ./

# Install ALL dependencies (dev + prod) needed for compilation
RUN npm ci --ignore-scripts

# Copy source and compile TypeScript → JavaScript
COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# Prune to production-only deps after building
RUN npm prune --production

# ── Stage 2: Production Runtime ──────────────────────────────────────────────
FROM node:20-alpine AS runner

ARG NODE_ENV=production
ARG BUILD_NUMBER=local
ARG GIT_COMMIT=unknown

# OCI standard image labels
LABEL org.opencontainers.image.title="Gym Management API"
LABEL org.opencontainers.image.version="${BUILD_NUMBER}"
LABEL org.opencontainers.image.revision="${GIT_COMMIT}"
LABEL org.opencontainers.image.base.name="node:20-alpine"

ENV NODE_ENV=${NODE_ENV}
# Runtime configuration — values overridden at container startup via K8s ConfigMap/Secret
ENV PORT=3001 \
    DB_HOST=localhost \
    DB_PORT=5432 \
    DB_USER=postgres \
    DB_NAME=gym \
    DB_PASS="" \
    JWT_SECRET="" \
    EMAIL_USER="" \
    EMAIL_PASSWORD=""

WORKDIR /app

# Create a non-root user and group
RUN addgroup -g 1001 -S gymgroup && \
    adduser  -u 1001 -S gymuser -G gymgroup && \
    # Create writable directories (logs, tmp)
    mkdir -p /app/logs /tmp/gym && \
    chown -R gymuser:gymgroup /app /tmp/gym

# Copy only what is needed from the builder stage
COPY --from=builder --chown=gymuser:gymgroup /build/node_modules ./node_modules
COPY --from=builder --chown=gymuser:gymgroup /build/dist        ./dist
COPY --from=builder --chown=gymuser:gymgroup /build/package.json ./package.json

# Drop privileges — run as non-root
USER gymuser

# Health-check so Kubernetes probes can rely on it even without a sidecar
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:${PORT}/health || exit 1

EXPOSE ${PORT}

# Explicit exec-form prevents shell signal-handling issues (graceful shutdown)
CMD ["node", "dist/index.js"]
