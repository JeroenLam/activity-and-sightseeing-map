#!/bin/sh
# Generate runtime config for Vite dev server from environment variables
# Note: In dev, ./frontend is volume-mounted to /app, so this writes
# directly into the mounted public/ directory.
API_URL="${VITE_API_URL:-}"

mkdir -p /app/public
cat > /app/public/config.js <<ENDOFCONFIG
window.__APP_CONFIG__ = {
  API_URL: '${API_URL}'
};
ENDOFCONFIG

exec "$@"
