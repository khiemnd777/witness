---
name: witness-regression-review
description: Use when reviewing The Witness changes for gameplay regressions, broken content references, sacred narrative guardrail violations, UI overlap or mobile risks, save-state issues, validation gaps, or deployment risks before sign-off.
---

# Witness Regression Review

## Review Priority

Lead with concrete findings ordered by severity. Prefer file and line references. If there are no findings, say so and call out residual test gaps.

## Check Runtime Changes

- Does `GameSession` remain the source of truth for quest, save, inventory, and chapter completion state?
- Are quest events still routed through `GameEvents` and manager APIs?
- Do scene marker IDs match active interaction IDs and quest targets?
- Are collected items, world state IDs, and objective hints updated through existing scene APIs?
- Do normal objectives avoid overhead arrows and chevrons?
- Are items represented as real world objects with ground rings rather than marker-only pickups?
- Do NPCs and items remain present in the world while only interaction rings toggle?
- Are interactions blocked unless their marker is visible and active?
- Could save restoration break for existing players?

## Check Content Changes

- Do all quest, NPC, dialogue, item, scene target, and Bible reference IDs resolve?
- Does every quest include a reflection with valid Bible references?
- Are new step types represented in TypeScript types, validation, event dispatch, session handling, and UI?
- Does the authored narrative keep the player in the role of witness and helper?

## Check Sacred Narrative Guardrails

- Jesus remains `role: "sacred_narrative"`.
- Sacred narrative characters have no normal `dialogueId`.
- Playable and commandable behavior remains explicitly disabled.
- No normal quest-giver, trade, escort, command, combat, or reward loop is attached to Jesus.

## Check UI And Visuals

- HUD, dialogue, quest tracker, reflection, and mobile controls do not overlap incoherently.
- Text fits inside compact panels and controls.
- Important playfield information remains visible.
- Touch controls remain usable on coarse pointer devices.

## Check Validation

- JSON-only edits should have `npm run validate:content`.
- Runtime, TypeScript, UI, loader, schema, or validation edits should have `npm run build`.
- Visual/control changes should have a browser smoke test when practical.
