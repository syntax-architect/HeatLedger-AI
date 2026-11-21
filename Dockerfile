FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for PyMuPDF and health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create unprivileged system user and group
RUN groupadd -r heatledger && useradd -r -g heatledger appuser

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# Ensure output directory exists and set ownership to unprivileged user
RUN mkdir -p /app/output_dossiers && chown -R appuser:heatledger /app

EXPOSE 8000

# Docker HEALTHCHECK against backend root endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Switch to unprivileged user before starting process
USER appuser

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
