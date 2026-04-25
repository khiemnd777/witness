import type { ChapterContent } from "../loaders/contentLoader";
import { validateQuest } from "../../game/quest/QuestValidator";

export function validateChapterContent(content: ChapterContent): string[] {
  const errors = content.quests.flatMap(validateQuest);

  const questIds = new Set(content.quests.map((quest) => quest.id));
  const npcIds = new Set(content.npcs.map((npc) => npc.id));
  const itemIds = new Set(content.items.map((item) => item.id));
  const sceneTargetIds = new Set(content.sceneTargets.map((target) => target.id));
  const bibleReferenceIds = new Set(content.bibleReferences.map((reference) => reference.id));
  const dialogueIds = new Set(content.dialogues.map((dialogue) => dialogue.id));

  for (const questId of content.chapter.questIds) {
    if (!questIds.has(questId)) {
      errors.push(`${content.chapter.id}: chapter references missing quest ${questId}.`);
    }
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
  }

  for (const quest of content.quests) {
    if (!quest.reflection) {
      errors.push(`${quest.id}: missing reflection.`);
    } else if (quest.reflection.bibleRefIds.length === 0) {
      errors.push(`${quest.id}: reflection must include at least one Bible reference.`);
    } else {
      for (const bibleRefId of quest.reflection.bibleRefIds) {
        if (!bibleReferenceIds.has(bibleRefId)) {
          errors.push(`${quest.id}: references missing Bible reference ${bibleRefId}.`);
        }
      }
    }

    for (const step of quest.steps) {
      if (step.npcId && !npcIds.has(step.npcId)) {
        errors.push(`${quest.id}/${step.id}: references missing npc ${step.npcId}.`);
      }
      if (step.itemId && !itemIds.has(step.itemId)) {
        errors.push(`${quest.id}/${step.id}: references missing item ${step.itemId}.`);
      }
      if (step.requiresItemId && !itemIds.has(step.requiresItemId)) {
        errors.push(`${quest.id}/${step.id}: references missing required item ${step.requiresItemId}.`);
      }
      if (step.target && !sceneTargetIds.has(step.target)) {
        errors.push(`${quest.id}/${step.id}: references missing scene target ${step.target}.`);
      }
    }
  }

  for (const reference of content.bibleReferences) {
    if (!questIds.has(reference.contentId) && reference.contentId !== content.chapter.id) {
      errors.push(`${reference.id}: contentId ${reference.contentId} does not match a quest or chapter.`);
    }
  }

  return errors;
}
