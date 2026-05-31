#!/bin/sh
# Generate runtime config from environment variables
cat <<EOF > /usr/share/nginx/html/config.js
window.__APP_CONFIG__ = {
  API_URL: "${VITE_API_URL:-}"
};
EOF

exec "$@"
