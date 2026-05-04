# The Witness Design Direction

## Product Intent

The Witness is a reverent 3D RPG where the player experiences biblical events as an ordinary observer and helper. The player should feel present in the world, but not placed above the sacred narrative.

## Design Principles

- The player is a witness, not the central hero.
- Sacred figures and moments are handled with restraint, clarity, and reverence.
- Quests should focus on humble service, observation, listening, and reflection.
- Progression should reward attention, care, faith, humility, love, wisdom, and courage rather than power fantasy.
- UI should support orientation and reflection without taking over the scene.

## Visual Direction

- Low-poly 3D visuals should read as warm, simple, and legible.
- Use grounded materials, clear silhouettes, and strong spatial landmarks.
- Favor natural warm light, readable shadows, and visible interaction affordances.
- Keep sacred narrative visuals symbolic and restrained rather than spectacle-driven.
- Avoid visual clutter around the player, objective markers, and dialogue moments.

## Interaction Model

- Core loop: explore, approach, interact, progress quest, reflect.
- Supported quest steps include `talk`, `collect`, `give_item`, `go_to`, `observe`, `choice`, and `reflection`.
- Interaction IDs must stay coherent with scene marker IDs and quest step targets.
- Normal objectives should not use overhead arrows or chevrons.
- Items should appear as real objects in the world with a ground ring.
- NPCs and items should remain present in the scene even when they are not the active objective; toggle only their interaction ring.
- A scene interaction should be usable only when its marker is visible and active.
- Mobile controls should remain available for coarse pointer devices and should not obscure the current objective or dialogue.

## Content Direction

- Chapter content is authored in JSON under `public/content`.
- Every quest should include a reflection with at least one Bible reference.
- Dialogue should be concise and grounded in the scene's human perspective.
- Bible references should support the reflection and be tied to the chapter or quest content ID.
- NPCs should have clear roles, interaction labels, and positions that match scene affordances.

## Sacred Narrative Guardrails

- Jesus must use `role: "sacred_narrative"`.
- Sacred narrative characters must not have normal `dialogueId` values.
- Sacred narrative rules must explicitly disable playable and commandable behavior.
- Do not create normal fetch, escort, trade, combat, or command interactions involving Jesus.
- Let the player's actions remain peripheral acts of witness, service, and reverence.

## UI Direction

- Use compact overlays, readable type, and stable dimensions.
- Keep HUD panels within safe viewport bounds on desktop and mobile.
- Preserve direct visual access to the playfield.
- Reflection screens may be calmer and more text-forward, but should remain concise.
- Avoid marketing-style landing pages inside the app; the first screen should move quickly into the playable experience.

## Validation Expectations

- JSON-only content changes should pass `npm run validate:content`.
- Runtime, UI, schema, or loader changes should pass `npm run build`.
- Visual changes should be smoke-tested in the browser when practical, especially on desktop and mobile-sized viewports.
