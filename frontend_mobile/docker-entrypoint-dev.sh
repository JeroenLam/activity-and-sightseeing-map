#!/bin/sh
API_URL="${VITE_API_URL:-}"
CORS="${CORS_ORIGINS:-}"

mkdir -p /app/public
cat > /app/public/config.js <<ENDOFCONFIG
window.__APP_CONFIG__ = {
  API_URL: '${API_URL}',
  CORS_ORIGINS: '${CORS}'
};
ENDOFCONFIG

exec "$@"
