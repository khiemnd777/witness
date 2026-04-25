#!/usr/bin/env bash
set -euo pipefail

DOMAIN=${1:?domain is required}
SITE_ROOT=${2:?site root is required}
LETSENCRYPT_EMAIL=${3:?letsencrypt email is required}

SITE_CONFIG="/etc/nginx/sites-available/${DOMAIN}.conf"
SITE_LINK="/etc/nginx/sites-enabled/${DOMAIN}.conf"
WEBROOT="/var/www/certbot"

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y nginx certbot python3-certbot-nginx

mkdir -p "$SITE_ROOT/releases" "$WEBROOT"

cat > "$SITE_CONFIG" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    root ${SITE_ROOT}/current;
    index index.html;

    location /.well-known/acme-challenge/ {
        root ${WEBROOT};
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sfn "$SITE_CONFIG" "$SITE_LINK"

nginx -t
systemctl enable nginx
systemctl reload nginx || systemctl restart nginx

if [ ! -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
  certbot --nginx --non-interactive --agree-tos --redirect -m "$LETSENCRYPT_EMAIL" -d "$DOMAIN"
fi

systemctl reload nginx
