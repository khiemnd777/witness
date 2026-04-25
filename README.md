# The Witness: Journey with Jesus

`The Witness` is a 3D web RPG prototype where the player experiences biblical events as an ordinary witness instead of a central hero. The current vertical slice focuses on Chapter 1 in Bethlehem and combines exploration, dialogue, quests, inventory, and reflective progression.

## Current Scope

- 3D browser-based RPG built with React, TypeScript, Vite, and Babylon.js
- Chapter 1 content set around the birth of Jesus in Bethlehem
- Dialogue interactions, quest progression, collectible items, and local save state
- Reflection and HUD flows for player guidance and chapter completion

## Tech Stack

- React 19
- TypeScript
- Vite
- Babylon.js
- Zustand

## Project Structure

```text
src/
  app/        React app shell and state wiring
  content/    Chapter manifests, schemas, and content loaders
  game/       Core gameplay systems, scenes, dialogue, quests, inventory, save
  ui/         HUD, menu, dialogue, quest, and reflection components
public/
  content/    JSON-authored chapter content, NPCs, quests, items, and dialogues
scripts/
  validate-content.mjs
```

## Development

### Requirements

- Node.js 20+ recommended
- npm 10+ recommended

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

The Vite dev server is configured to listen on `0.0.0.0`.

## Validation and Build

### Validate content

```bash
npm run validate:content
```

### Production build

```bash
npm run build
```

The build step validates authored content, runs TypeScript type checking, and generates the production bundle with Vite.

## Deployment Notes

The repository includes:

- `Dockerfile` for containerized deployment
- `nginx.conf` for serving the built application
- `.github/workflows/ci-cd.yml` for CI/CD to the production VPS
- `deploy/scripts/` for server provisioning and release deployment

### Production Target

- Domain: `https://witness.dailyturning.com`
- Server root: `/var/www/witness`
- Release strategy: timestamped releases with `current` symlink switching
- App runtime: dedicated `nginx:alpine` container on `127.0.0.1:18080`
- SSL and ingress: handled by the shared VPS Caddy instance

### Required GitHub Secrets

Add these repository secrets before running the deploy workflow:

- `VPS_HOST`
- `VPS_USER`
- `VPS_PASSWORD`
- `APP_DOMAIN`
- `SITE_ROOT`

### Deployment Behavior

On each push to `main`, GitHub Actions:

1. Installs dependencies and runs the production build
2. Uploads the generated `dist/` artifact
3. Connects to the VPS over SSH
4. Updates the shared Caddy config with a managed `witness.dailyturning.com` block
5. Publishes a new timestamped release and repoints `current`
6. Recreates the dedicated Witness static container on `127.0.0.1:18080`
7. Reloads Caddy so HTTPS and routing are applied to the new site

For the site to come up successfully, DNS for `witness.dailyturning.com` must already point to the VPS and Docker plus the shared Caddy container must be healthy on the server.

## Roadmap Direction

- Expand additional chapter content
- Deepen world interactions and storytelling systems
- Improve authored content tooling and validation

## License

This project currently does not declare an open-source license.
