# ==============================================================================
# Dockerfile for FastMCP GitHub Server (Cloud Run Optimized)
# Multi-stage build with non-root security and fast uv dependency resolution
# ==============================================================================

# --- Stage 1: Build virtual environment ---
FROM python:3.12-slim AS builder

# Install uv binary
COPY --from=ghcr.io/astral-sh/uv:0.8.13 /uv /uvx /bin/

WORKDIR /app

# Copy dependency specifications from mcp-server-github
COPY mcp-server-github/pyproject.toml mcp-server-github/uv.lock ./

# Copy source code before uv sync so uv_build backend finds src module
COPY mcp-server-github/src ./src

# Install dependencies into virtualenv
RUN uv sync --frozen --no-dev

# --- Stage 2: Minimal Production Runtime ---
FROM python:3.12-slim AS runner

# Create non-root user for security
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Copy built virtual environment and package
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/src /app/src
COPY mcp-server-github/pyproject.toml ./

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PORT=8085

USER appuser

EXPOSE 8085

# Exec form with shell expansion for Cloud Run dynamic PORT injection
CMD ["sh", "-c", "exec mcp-server-github --transport streamable-http --host 0.0.0.0 --port ${PORT:-8085}"]
