#!/usr/bin/env bash
set -euo pipefail

SITE_ROOT=${1:?site root is required}
RELEASE_NAME=${2:?release name is required}
SOURCE_DIR=${3:?source directory is required}

RELEASES_DIR="${SITE_ROOT}/releases"
RELEASE_DIR="${RELEASES_DIR}/${RELEASE_NAME}"
CURRENT_LINK="${SITE_ROOT}/current"
NGINX_CONF="${SITE_ROOT}/shared/nginx/default.conf"
CONTAINER_NAME="witness-static"
HOST_PORT="18080"
CADDY_CONTAINER="perfect-pitch-caddy-1"

mkdir -p "$RELEASE_DIR"
rsync -a --delete "${SOURCE_DIR}/" "${RELEASE_DIR}/"
ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"

docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  -p "127.0.0.1:${HOST_PORT}:80" \
  -v "${CURRENT_LINK}:/usr/share/nginx/html:ro" \
  -v "${NGINX_CONF}:/etc/nginx/conf.d/default.conf:ro" \
  nginx:alpine >/dev/null

docker exec "${CADDY_CONTAINER}" caddy reload --config /etc/caddy/Caddyfile

if [ -d "$RELEASES_DIR" ]; then
  ls -1dt "${RELEASES_DIR}"/* 2>/dev/null | tail -n +6 | xargs -r rm -rf
fi
