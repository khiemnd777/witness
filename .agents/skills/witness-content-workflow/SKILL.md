---
name: witness-content-workflow
description: Use when creating, editing, validating, or reviewing The Witness chapter JSON, quest flow, NPCs, dialogues, items, scene targets, Bible references, content schemas, loaders, or authored-content validation.
---

# Witness Content Workflow

## Content Map

Before creating, expanding, or materially changing a chapter, read `STORYLINE.md` and align the work with the planned act, premise, player role, quest arc, sacred moment, reflection theme, and Bible anchor.

Chapter content is loaded from `public/content`:

- Chapter metadata: `chapters/<chapter_id>.json`
- Chapter index: `chapters/index.json`
- Quests: `quests/<chapter_id>.json`
- Dialogues: `dialogues/<chapter_id>.json`
- NPCs: `npcs/<chapter_id>.json`
- Items: `items/<chapter_id>.json`
- Scene targets: `scene_targets/<chapter_id>.json`
- Bible references: `bible_refs/<chapter_id>.json`

Runtime contracts live in `src/content/**` and matching domain types under `src/game/**`.

## Editing Rules

- Keep IDs stable unless the task explicitly asks for a rename.
- When adding or renaming an ID, update every cross-reference in the same chapter.
- Every quest should include `reflection.bibleRefIds` with at least one valid Bible reference.
- Quest steps must point to existing NPCs, items, or scene targets according to their type.
- Dialogue `npcId` must reference an existing NPC.
- Bible reference `contentId` must match the chapter or a quest.
- Scene target IDs must align with scene marker and objective logic.
- Item content should map to an actual world object, not a marker-only pickup.
- NPC and item content should assume the entity remains present in the world while only its interaction ring toggles.
- Objective content should not require overhead arrows or chevrons for normal guidance.
- Interaction content should assume usability only while the relevant marker is visible and active.

## Sacred Narrative Rules

- Jesus must use `role: "sacred_narrative"`.
- Sacred narrative characters must not have normal `dialogueId` values.
- Sacred narrative rules must explicitly disable playable and commandable behavior.
- Do not author normal quest-giver, trade, escort, command, or combat interactions for Jesus.

## Narrative Tone

- Keep the player framed as a witness and helper.
- Favor humble service, listening, observation, and reflection.
- Keep dialogue concise and scene-grounded.
- Avoid turning sacred moments into spectacle or achievement hunting.

## Validation

- Run `npm run validate:content` for JSON-only changes.
- Run `npm run build` when schemas, loaders, TypeScript types, validation logic, or runtime handling change.
