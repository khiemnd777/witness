import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const contentRoot = join(process.cwd(), "public", "content");
const requiredFolders = [
  "chapters",
  "quests",
  "dialogues",
  "npcs",
  "items",
  "scene_targets",
  "bible_refs"
];

const errors = [];
const chapterFiles = readdirSync(join(contentRoot, "chapters")).filter((file) =>
  file.endsWith(".json") && file !== "index.json"
);
const manifest = readJson(join(contentRoot, "chapters", "index.json")) ?? [];
const manifestIds = new Set(manifest.map((entry) => entry.id));

for (const entry of manifest) {
  if (!entry.id || !entry.title || typeof entry.number !== "number") {
    errors.push("chapters/index.json: each chapter entry requires id, number, and title.");
  }
  if (!existsSync(join(contentRoot, "chapters", `${entry.id}.json`))) {
    errors.push(`chapters/index.json: references missing chapter file ${entry.id}.json.`);
  }
}

for (const chapterFile of chapterFiles) {
  const chapterId = chapterFile.replace(/\.json$/, "");
  if (!manifestIds.has(chapterId)) {
    errors.push(`${chapterId}: chapter file must be listed in chapters/index.json.`);
  }
  const content = {};

  for (const folder of requiredFolders) {
    const path = join(contentRoot, folder, `${chapterId}.json`);
    if (!existsSync(path)) {
      errors.push(`${chapterId}: missing ${folder}/${chapterId}.json`);
      continue;
    }
    content[folder] = readJson(path);
  }

  if (requiredFolders.some((folder) => !content[folder])) continue;

  validateChapter(chapterId, {
    chapter: content.chapters,
    quests: content.quests,
    dialogues: content.dialogues,
    npcs: content.npcs,
    items: content.items,
    sceneTargets: content.scene_targets,
    bibleReferences: content.bible_refs
  });
}

if (errors.length > 0) {
  console.error("Content validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Content validation passed for ${chapterFiles.length} chapter(s).`);

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    errors.push(`${path}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function validateChapter(chapterId, content) {
  const questIds = new Set(content.quests.map((quest) => quest.id));
  const npcIds = new Set(content.npcs.map((npc) => npc.id));
  const itemIds = new Set(content.items.map((item) => item.id));
  const sceneTargetIds = new Set(content.sceneTargets.map((target) => target.id));
  const bibleReferenceIds = new Set(content.bibleReferences.map((reference) => reference.id));
  const dialogueIds = new Set(content.dialogues.map((dialogue) => dialogue.id));

  if (content.chapter.id !== chapterId) {
    errors.push(`${chapterId}: chapter id must match filename.`);
  }

  for (const questId of content.chapter.questIds ?? []) {
    if (!questIds.has(questId)) {
      errors.push(`${chapterId}: chapter references missing quest ${questId}.`);
    }
  }

  for (const quest of content.quests) {
    validateQuest(quest, { npcIds, itemIds, sceneTargetIds, bibleReferenceIds });
  }

  for (const npc of content.npcs) {
    if (npc.dialogueId && !dialogueIds.has(npc.dialogueId)) {
      errors.push(`${npc.id}: references missing dialogue ${npc.dialogueId}.`);
    }

    const isJesus = npc.id.toLowerCase().includes("jesus") || npc.name.toLowerCase() === "jesus";
    if (isJesus && npc.role !== "sacred_narrative") {
      errors.push(`${npc.id}: Jesus must use role "sacred_narrative".`);
    }

    if (npc.role === "sacred_narrative") {
      if (npc.dialogueId) {
        errors.push(`${npc.id}: sacred narrative characters must not have normal dialogueId.`);
      }
      if (npc.sacredRules?.playable !== false || npc.sacredRules?.commandable !== false) {
        errors.push(`${npc.id}: sacred narrative rules must explicitly disable playable and commandable.`);
      }
    }
  }

  for (const dialogue of content.dialogues) {
    if (!npcIds.has(dialogue.npcId)) {
      errors.push(`${dialogue.id}: references missing npc ${dialogue.npcId}.`);
    }
    for (const line of dialogue.lines ?? []) {
      for (const choice of line.choices ?? []) {
        if (!choice.id) {
          errors.push(`${dialogue.id}/${line.id}: dialogue choices must have stable ids.`);
        }
      }
    }
  }

  for (const reference of content.bibleReferences) {
    if (!questIds.has(reference.contentId) && reference.contentId !== content.chapter.id) {
      errors.push(`${reference.id}: contentId ${reference.contentId} does not match a quest or chapter.`);
    }
  }
}

function validateQuest(quest, refs) {
  if (!quest.id) errors.push("Quest is missing id.");
  if (!quest.chapterId) errors.push(`${quest.id}: missing chapterId.`);
  if (!quest.title) errors.push(`${quest.id}: missing title.`);
  if (!Array.isArray(quest.steps) || quest.steps.length === 0) {
    errors.push(`${quest.id}: must have at least one step.`);
  }

  if (!quest.reflection) {
    errors.push(`${quest.id}: missing reflection.`);
  } else if (!Array.isArray(quest.reflection.bibleRefIds) || quest.reflection.bibleRefIds.length === 0) {
    errors.push(`${quest.id}: reflection must include at least one Bible reference.`);
  } else {
    for (const bibleRefId of quest.reflection.bibleRefIds) {
      if (!refs.bibleReferenceIds.has(bibleRefId)) {
        errors.push(`${quest.id}: references missing Bible reference ${bibleRefId}.`);
      }
    }
  }

  const stepIds = new Set();
  for (const step of quest.steps ?? []) {
    if (!step.id) errors.push(`${quest.id}: step is missing id.`);
    if (stepIds.has(step.id)) errors.push(`${quest.id}: duplicate step id ${step.id}.`);
    stepIds.add(step.id);

    if ((step.type === "talk" || step.type === "choice") && !step.npcId) {
      errors.push(`${quest.id}/${step.id}: ${step.type} requires npcId.`);
    }
    if ((step.type === "go_to" || step.type === "observe") && !step.target) {
      errors.push(`${quest.id}/${step.id}: ${step.type} requires target.`);
    }
    if ((step.type === "collect" || step.type === "give_item") && !step.itemId) {
      errors.push(`${quest.id}/${step.id}: ${step.type} requires itemId.`);
    }
    if (step.npcId && !refs.npcIds.has(step.npcId)) {
      errors.push(`${quest.id}/${step.id}: references missing npc ${step.npcId}.`);
    }
    if (step.itemId && !refs.itemIds.has(step.itemId)) {
      errors.push(`${quest.id}/${step.id}: references missing item ${step.itemId}.`);
    }
    if (step.requiresItemId && !refs.itemIds.has(step.requiresItemId)) {
      errors.push(`${quest.id}/${step.id}: references missing required item ${step.requiresItemId}.`);
    }
    if (step.target && !refs.sceneTargetIds.has(step.target)) {
      errors.push(`${quest.id}/${step.id}: references missing scene target ${step.target}.`);
    }
  }
}
