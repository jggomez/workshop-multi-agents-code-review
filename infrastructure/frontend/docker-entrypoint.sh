#!/bin/sh
set -e

# Replace AGENT_SERVER_URL in runtime config.js if supplied
if [ -n "$AGENT_SERVER_URL" ]; then
    echo "[Frontend Entrypoint] Updating window.ENV_AGENT_SERVER_URL = '$AGENT_SERVER_URL'"
    cat <<EOF > /usr/share/nginx/html/config.js
/**
 * Dynamic Runtime Configuration (Generated at Container Launch)
 */
window.ENV_AGENT_SERVER_URL = '$AGENT_SERVER_URL';
EOF
fi

# Execute Nginx original entrypoint
exec "$@"
