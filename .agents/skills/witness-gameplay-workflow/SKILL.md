---
name: witness-gameplay-workflow
description: Use when implementing or modifying The Witness gameplay runtime, React app shell, Zustand state, Babylon.js scenes, player input, quest/session behavior, HUD, dialogue, reflection, or mobile controls.
---

# Witness Gameplay Workflow

## Working Pattern

1. Read `STORYLINE.md` before creating chapter scenes or implementing chapter-specific gameplay.
2. Identify whether the change belongs to app shell, session/domain manager, scene/runtime, or UI overlay.
3. Follow existing manager boundaries instead of adding parallel state paths.
4. Keep authored JSON contracts stable unless the task explicitly changes content shape.
5. Preserve mobile and desktop interaction behavior.
6. Validate with `npm run build` for runtime, UI, TypeScript, loader, or schema changes.

## Ownership Map

- App lifecycle and wiring: `src/app/App.tsx`
- Transient UI state: `src/app/store.ts`
- Session orchestration: `src/game/session/GameSession.ts`
- Quest progression: `src/game/quest/**`, `src/game/events/GameEvents.ts`
- Dialogue, NPC, inventory, save: matching managers under `src/game/**`
- Engine/input/assets/scene loading: `src/game/engine/**`
- Chapter scene and markers: `src/game/scene/**`
- Babylon visual primitives: `src/game/visuals/LowPolyFactory.ts`
- React overlays: `src/ui/**`
- Global styling: `src/styles.css`

## Implementation Guidance

- Let `GameSession` produce the authoritative snapshot for save, quest, current step, inventory, and chapter completion.
- Route scene interactions through `SceneInteraction` and `eventFromInteractionForStep`.
- Keep marker IDs compatible with active interaction IDs generated in `App.tsx`.
- Use scene state setters such as `setActiveInteractionIds`, `setCollectedItemIds`, and `setWorldStateIds` instead of reaching into scene internals from React.
- Do not use overhead arrows or chevrons for normal objectives.
- Represent items as real objects in the world with a ground ring.
- Keep NPCs and items present in the world; toggle only their interaction rings based on active objective state.
- Make interactions usable only when the marker is visible and active.
- For any enterable building, register an interior zone and fade/open the roof while the player is inside; restore the roof when the player exits.
- Fade/open large overhead or foreground scene pieces when they can block sacred moments or active objectives from the player's current area.
- Until terrain-height support exists, keep walkable roads, floors, platforms, and courtyards on the player ground plane; use raised geometry only as non-walkable trim or decoration.
- Keep UI overlays compact, stable in size, and clear of the playfield's essential interaction area.
- Do not introduce heavy assets or external engines without an explicit need.

## Sacred Narrative Rules

- Do not make Jesus a normal interactable NPC, player-controlled entity, command target, or ordinary quest giver.
- Sacred narrative scenes should be observed with reverence and restraint.
- If gameplay logic could violate this, stop and make the guardrail explicit in validation or content structure.

## Verification

- Run `npm run build` before sign-off for code changes.
- For controls, camera, HUD placement, or scene visibility, smoke-test in browser when practical.
- For content-coupled runtime edits, also run or rely on `npm run validate:content`.
