# Deployment Notes

The GitHub Actions workflow provisions Nginx directly on the VPS and generates the active site config at deploy time.

- Domain: `witness.dailyturning.com`
- Site root: `/var/www/witness`
- SSL: Let's Encrypt via `certbot --nginx`

The files in `deploy/scripts/` are the source of truth for server provisioning and release deployment.
