#!/usr/bin/env bash
set -euo pipefail

DOMAIN=${1:?domain is required}
SITE_ROOT=${2:?site root is required}

CADDYFILE_PATH="/opt/perfect-pitch/current/deploy/Caddyfile"
CADDY_CONTAINER="perfect-pitch-caddy-1"
WITNESS_PORT="18080"
MANAGED_START="# witness managed start"
MANAGED_END="# witness managed end"
NGINX_DIR="${SITE_ROOT}/shared/nginx"
NGINX_CONF="${NGINX_DIR}/default.conf"

mkdir -p "${SITE_ROOT}/releases" "${SITE_ROOT}/shared" "${NGINX_DIR}"

cat > "${NGINX_CONF}" <<'EOF'
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }
}
EOF

if [ ! -f "${CADDYFILE_PATH}" ]; then
  echo "Caddyfile not found at ${CADDYFILE_PATH}" >&2
  exit 1
fi

tmp_file=$(mktemp)
trap 'rm -f "${tmp_file}"' EXIT

awk -v start="${MANAGED_START}" -v end="${MANAGED_END}" '
  $0 == start { skip=1; next }
  $0 == end { skip=0; next }
  skip != 1 { print }
' "${CADDYFILE_PATH}" > "${tmp_file}"

cat >> "${tmp_file}" <<EOF

${MANAGED_START}
${DOMAIN} {
	encode gzip zstd
	reverse_proxy 127.0.0.1:${WITNESS_PORT}

	header {
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
		X-Frame-Options SAMEORIGIN
	}
}
${MANAGED_END}
EOF

docker run --rm -v "${tmp_file}:/tmp/Caddyfile:ro" caddy:2.10-alpine caddy validate --config /tmp/Caddyfile
cp "${CADDYFILE_PATH}" "${CADDYFILE_PATH}.bak.$(date +%Y%m%d%H%M%S)"
cp "${tmp_file}" "${CADDYFILE_PATH}"
