import { questStepTypeFromEvent, type GameEvent } from "../events/GameEvents";
import type { SpiritualStats } from "../../shared/constants/stats";
import type { Quest, QuestStep, QuestStepType } from "./QuestTypes";

export type QuestProgressEvent = {
  type: QuestStepType;
  npcId?: string;
  target?: string;
  itemId?: string;
};

export class QuestManager {
  private activeQuest: Quest | null = null;

  startQuest(quest: Quest) {
    this.activeQuest = {
      ...quest,
      steps: quest.steps.map((step) => ({ ...step, completed: false }))
    };
  }

  restoreQuest(quest: Quest, completedStepIds: string[]) {
    const completed = new Set(completedStepIds);
    this.activeQuest = {
      ...quest,
      steps: quest.steps.map((step) => ({ ...step, completed: completed.has(step.id) }))
    };
  }

  getActiveQuest() {
    return this.activeQuest;
  }

  getCurrentStep(): QuestStep | null {
    return this.activeQuest?.steps.find((step) => !step.completed) ?? null;
  }

  completeStep(stepId: string) {
    if (!this.activeQuest) return false;
    const step = this.activeQuest.steps.find((candidate) => candidate.id === stepId);
    if (!step || step.completed) return false;
    step.completed = true;
    return true;
  }

  completeMatchingStep(event: QuestProgressEvent) {
    const step = this.getCurrentStep();
    if (!step || step.type !== event.type) return false;

    const matchesNpc = !step.npcId || step.npcId === event.npcId;
    const matchesTarget = !step.target || step.target === event.target;
    const matchesItem = !step.itemId || step.itemId === event.itemId;

    if (!matchesNpc || !matchesTarget || !matchesItem) return false;
    return this.completeStep(step.id);
  }

  completeStepForEvent(event: GameEvent, hasItem: (itemId: string) => boolean) {
    const step = this.getCurrentStep();
    if (!step || step.type !== questStepTypeFromEvent(event)) return false;

    const matchesNpc = !step.npcId || step.npcId === event.npcId;
    const matchesTarget = !step.target || step.target === event.target;
    const matchesItem = !step.itemId || step.itemId === event.itemId;
    const hasRequiredItem = !step.requiresItemId || hasItem(step.requiresItemId);

    if (!matchesNpc || !matchesTarget || !matchesItem || !hasRequiredItem) return false;
    return this.completeStep(step.id);
  }

  isQuestCompleted() {
    return Boolean(this.activeQuest?.steps.every((step) => step.completed));
  }

  getCompletedStepIds() {
    return this.activeQuest?.steps.filter((step) => step.completed).map((step) => step.id) ?? [];
  }

  getReward(): Partial<SpiritualStats> {
    return this.activeQuest?.rewards ?? {};
  }
}
