# The Witness Codex Guide

## Repository Scope

The Witness is a 3D browser RPG prototype built with React, TypeScript, Vite, Babylon.js, Zustand, and JSON-authored chapter content. The current vertical slice is Chapter 1 in Bethlehem.

Use repo-local Codex assets first:

- Agents live in `.agents/agents/*.toml`.
- Skills live in `.agents/skills/<skill-name>/SKILL.md`.
- Design direction lives in `DESIGN.md`.

## Working Rules

- Read `STORYLINE.md` before creating, expanding, or materially changing any chapter.
- Prefer the existing architecture over new frameworks or broad rewrites.
- Keep gameplay runtime code in `src/game`, React shell/state in `src/app`, UI overlays in `src/ui`, content loading/validation in `src/content`, and authored data in `public/content`.
- Treat `public/content/**/*.json` as authored game content. Validate references whenever IDs change.
- Preserve the sacred narrative guardrails: Jesus is represented through sacred narrative scenes, not as a normal quest NPC, playable character, or commandable character.
- Do not use overhead arrows or chevrons for normal objectives.
- Items should be real world objects with a ground ring, not floating marker-only pickups.
- NPCs and items should remain present in the world; only their interaction rings toggle with the active objective.
- Interactions are usable only when their marker is visible and active.
- Any building the player can enter must register an interior zone and automatically fade/open its roof while the player is inside, then restore the roof when the player exits.
- Large overhead or foreground scene pieces that can block sacred moments or active objectives must register an occlusion zone and fade/open while the player is inside that area.
- Until terrain-height support exists, every walkable road, floor, platform, and courtyard must keep its walkable surface on the player ground plane; raised visuals should be trim or non-walkable decoration so player feet do not clip.
- Keep browser-game UI dense, legible, and non-overlapping on desktop and mobile. Do not hide core game state behind decorative surfaces.
- Do not revert user changes. Work with the current tree and keep edits scoped to the request.

## Commands

- Install dependencies: `npm install`
- Start development server: `npm run dev`
- Validate authored content: `npm run validate:content`
- Production verification: `npm run build`
- Preview production bundle: `npm run preview`

Run `npm run build` before sign-off when TypeScript, runtime code, UI, or content schema behavior changes. Run `npm run validate:content` for JSON-only content edits.

## Architecture Map

- `src/app/App.tsx` wires chapter loading, game engine lifecycle, session snapshots, music, and UI overlays.
- `src/app/store.ts` holds transient client state through Zustand.
- `src/game/session/GameSession.ts` owns quest, dialogue, inventory, save, reward, and chapter-completion orchestration.
- `src/game/engine` owns Babylon engine setup, scene management, input, and assets.
- `src/game/scene` owns chapter-specific 3D scene implementation and interactions.
- `src/game/quest`, `src/game/dialogue`, `src/game/inventory`, `src/game/npc`, and `src/game/save` hold gameplay domain managers and types.
- `src/content/loaders` loads chapter JSON from `public/content`.
- `src/content/validation` validates cross-file authored content contracts.
- `src/ui` contains React overlays for HUD, dialogue, quests, controls, menus, and reflection.

## Repo-Local Agents

- `witness-boundary-explorer`: read-only classifier for ownership, files to inspect, and risk boundaries.
- `witness-gameplay-worker`: implements bounded runtime, UI, and 3D gameplay changes.
- `witness-content-worker`: implements bounded chapter JSON, schema, validation, and narrative content changes.
- `witness-regression-reviewer`: read-only reviewer for likely regressions before sign-off.

Use subagents only when the user explicitly asks for agent delegation or parallel agent work.
