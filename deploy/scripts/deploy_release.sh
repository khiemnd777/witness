#!/usr/bin/env bash
set -euo pipefail

SITE_ROOT=${1:?site root is required}
RELEASE_NAME=${2:?release name is required}
SOURCE_DIR=${3:?source directory is required}

RELEASES_DIR="${SITE_ROOT}/releases"
RELEASE_DIR="${RELEASES_DIR}/${RELEASE_NAME}"
CURRENT_LINK="${SITE_ROOT}/current"

mkdir -p "$RELEASE_DIR"
rsync -a --delete "${SOURCE_DIR}/" "${RELEASE_DIR}/"
ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"

chown -R www-data:www-data "$SITE_ROOT"

if [ -d "$RELEASES_DIR" ]; then
  ls -1dt "${RELEASES_DIR}"/* 2>/dev/null | tail -n +6 | xargs -r rm -rf
fi

nginx -t
systemctl reload nginx
