---
name: witness-repo-architect
description: Use when a The Witness task needs repo orientation, ownership classification, or a minimal inspection plan across React app shell, Babylon gameplay runtime, JSON chapter content, validation, deployment, or design documentation before making changes.
---

# Witness Repo Architect

## Start Here

Classify the request before editing:

- Runtime/gameplay: `src/game/**`, `src/app/App.tsx`, `src/app/store.ts`
- UI overlays: `src/ui/**`, `src/styles.css`
- Authored content: `public/content/**/*.json`
- Content contracts: `src/content/**`, domain types under `src/game/**`
- Deployment: `Dockerfile`, `nginx.conf`, `deploy/**`, `.github/**`
- Codex repo-local config: `AGENTS.md`, `DESIGN.md`, `.agents/**`

If the request creates, expands, or materially changes a chapter, read `STORYLINE.md` before choosing files or proposing implementation steps.

Report the smallest file set needed for the work, the likely validation command, and any cross-boundary impact.

## Boundary Rules

- Content ID changes usually cross `public/content`, `src/content/validation`, quest/session logic, and scene markers.
- New quest step types cross `QuestTypes`, `QuestValidator`, `GameEvents`, `GameSession`, UI wording, and content validation.
- New scene interactions must keep `SceneInteraction`, marker IDs, quest targets, and objective hints aligned.
- UI state changes should flow through `GameSession` snapshots and `useGameStore` rather than duplicating domain state.
- Deployment changes should preserve the static Vite build and nginx/Caddy deployment model described in `README.md`.

## Sacred Narrative Guardrails

Preserve these invariants:

- Jesus uses `role: "sacred_narrative"`.
- Sacred narrative characters do not have normal `dialogueId` values.
- Sacred narrative characters are not playable, commandable, or normal quest NPCs.
- Player actions stay framed as witness, service, listening, observation, and reflection.

## Validation Selection

- JSON-only content edits: `npm run validate:content`
- TypeScript, UI, runtime, schema, loader, or validation edits: `npm run build`
- Visual or control changes: run the app and smoke-test desktop plus mobile-sized viewports when practical.
