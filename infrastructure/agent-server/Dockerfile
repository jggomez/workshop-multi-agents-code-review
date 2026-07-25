# ==============================================================================
# Dockerfile for ADK Agent FastAPI Server (Cloud Run Optimized)
# Multi-stage build for Google ADK Agent Runtime & FastAPI
# ==============================================================================

# --- Stage 1: Build virtual environment ---
FROM python:3.12-slim AS builder

# Install uv binary
COPY --from=ghcr.io/astral-sh/uv:0.8.13 /uv /uvx /bin/

WORKDIR /app

# Copy dependency specifications from pr-auditor-agent
COPY pr-auditor-agent/pyproject.toml pr-auditor-agent/uv.lock ./

# Copy application source code before uv sync so hatchling backend finds app module
COPY pr-auditor-agent/app ./app
COPY pr-auditor-agent/README.md ./

# Install dependencies
RUN uv sync --frozen --no-dev

# --- Stage 2: Minimal Production Runtime ---
FROM python:3.12-slim AS runner

# Create non-root user for security
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Copy virtual environment and app files
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/app /app/app
COPY pr-auditor-agent/pyproject.toml ./

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PORT=8000

USER appuser

EXPOSE 8000

# Exec form with shell expansion for Cloud Run dynamic PORT injection
CMD ["sh", "-c", "exec uvicorn app.fast_api_app:app --host 0.0.0.0 --port ${PORT:-8000}"]
