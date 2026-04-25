# Deployment Notes

The GitHub Actions workflow deploys Witness as a dedicated static container behind the shared VPS Caddy instance.

- Domain: `witness.dailyturning.com`
- Site root: `/var/www/witness`
- App runtime: `nginx:alpine` on `127.0.0.1:18080`
- Edge TLS and routing: shared `perfect-pitch-caddy-1` container

The files in `deploy/scripts/` are the source of truth for Caddy registration and release deployment.
