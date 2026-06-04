#!/bin/sh
# Generate runtime config from environment variables
# Use single quotes to avoid issues with special characters in URLs
API_URL="${VITE_API_URL:-}"

cat > /usr/share/nginx/html/config.js <<ENDOFCONFIG
window.__APP_CONFIG__ = {
  API_URL: '${API_URL}'
};
ENDOFCONFIG

exec "$@"
