#!/bin/sh
# Generate runtime config from environment variables
# Use single quotes to avoid issues with special characters in URLs
API_URL="${VITE_API_URL:-}"
CORS="${CORS_ORIGINS:-}"

cat > /usr/share/nginx/html/config.js <<ENDOFCONFIG
window.__APP_CONFIG__ = {
  API_URL: '${API_URL}',
  CORS_ORIGINS: '${CORS}'
};
ENDOFCONFIG

# Generate nginx CORS map from CORS_ORIGINS
# This creates an nginx map to validate the Origin header
if [ -n "$CORS" ]; then
  CORS_CONF="/etc/nginx/conf.d/cors-origins.conf"
  echo 'map $http_origin $cors_origin {' > "$CORS_CONF"
  echo '  default "";' >> "$CORS_CONF"
  # Split comma-separated origins and add each
  echo "$CORS" | tr ',' '\n' | while read -r origin; do
    origin=$(echo "$origin" | xargs)  # trim whitespace
    [ -n "$origin" ] && echo "  \"$origin\" \"$origin\";" >> "$CORS_CONF"
  done
  echo '}' >> "$CORS_CONF"
fi

exec "$@"
