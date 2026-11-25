# ==============================================================================
# HeatLedger AI - Multi-Stage Production Container (Prompt D2)
# Multi-stage, Python 3.12-slim, non-root user, no build tools in final image,
# gunicorn with 2 uvicorn workers, /healthz and /readyz probes, read-only FS safe.
# ==============================================================================

# Stage 1: Build stage with compiler toolchain (pinned by official multi-arch manifest digest)
FROM python:3.12-slim@sha256:191083cdf6c7bda8c76158983163ead5d5cf7b77cf3033e805bb0f5296f51b4b AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir --require-hashes --user -r requirements.txt

# Stage 2: Final minimal production image (zero compilers, digest-pinned)
FROM python:3.12-slim@sha256:191083cdf6c7bda8c76158983163ead5d5cf7b77cf3033e805bb0f5296f51b4b AS runner

WORKDIR /app

# Only install curl for Docker HEALTHCHECK probe
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create unprivileged system user
RUN groupadd -g 10001 heatledger && \
    useradd -u 10001 -g heatledger -s /bin/bash -m appuser

# Copy installed Python packages from builder to appuser home
COPY --from=builder /root/.local /home/appuser/.local

# Copy backend source code
COPY --chown=appuser:heatledger backend/ /app/

# Environment variables
ENV PATH=/home/appuser/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    TMPDIR=/tmp

# Switch to non-root unprivileged user
USER appuser

EXPOSE 8000

# Docker healthcheck querying /healthz (liveness probe)
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/healthz || exit 1

# Production Gunicorn process with 2 Uvicorn workers and graceful shutdown (read-only rootfs safe)
CMD ["gunicorn", "-w", "2", "-k", "uvicorn.workers.UvicornWorker", "main:app", "--bind", "0.0.0.0:8000", "--worker-tmp-dir", "/tmp", "--timeout", "60", "--graceful-timeout", "30"]
