# ==============================================================================
# Dockerfile for PR Code Auditor Web Frontend (Cloud Run Optimized)
# Lightweight Nginx Alpine static web server with dynamic PORT & runtime config
# ==============================================================================

FROM nginx:1.25-alpine

# Set default port for Cloud Run
ENV PORT=8080

# Copy static frontend files to nginx document root
COPY pr-auditor-frontend /usr/share/nginx/html/

# Copy nginx template for dynamic PORT substitution and custom entrypoint script
COPY infrastructure/frontend/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY infrastructure/frontend/docker-entrypoint.sh /docker-entrypoint.d/40-runtime-config.sh

RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh

EXPOSE 8080
