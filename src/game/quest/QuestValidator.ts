import type { Quest } from "./QuestTypes";

export function validateQuest(quest: Quest): string[] {
  const errors: string[] = [];

  if (!quest.id) errors.push("Quest is missing id.");
  if (!quest.chapterId) errors.push(`${quest.id}: missing chapterId.`);
  if (!quest.title) errors.push(`${quest.id}: missing title.`);
  if (quest.steps.length === 0) errors.push(`${quest.id}: must have at least one step.`);

  const stepIds = new Set<string>();
  for (const step of quest.steps) {
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
  }

  return errors;
}
