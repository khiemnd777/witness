import type { QuestStepType } from "../quest/QuestTypes";
import type { QuestStep } from "../quest/QuestTypes";
import type { SceneInteraction } from "../scene/ChapterScene";

export type GameEventType =
  | "npc.talked"
  | "item.collected"
  | "item.given"
  | "location.reached"
  | "scene.observed"
  | "choice.selected"
  | "reflection.viewed";

export type GameEvent = {
  type: GameEventType;
  npcId?: string;
  itemId?: string;
  target?: string;
};

export function eventFromInteraction(interaction: SceneInteraction): GameEvent {
  if (interaction.type === "npc") {
    return { type: "npc.talked", npcId: interaction.targetId };
  }

  if (interaction.type === "item") {
    return { type: "item.collected", itemId: interaction.targetId };
  }

  if (interaction.type === "location") {
    if (interaction.itemId) {
      return {
        type: "item.given",
        itemId: interaction.itemId,
        target: interaction.targetId
      };
    }
    return { type: "location.reached", target: interaction.targetId };
  }

  return { type: "scene.observed", target: interaction.targetId };
}

export function eventFromInteractionForStep(
  interaction: SceneInteraction,
  step: QuestStep | null
): GameEvent {
  if (!step) return eventFromInteraction(interaction);

  if (step.type === "talk" && interaction.type === "npc") {
    return { type: "npc.talked", npcId: interaction.targetId };
  }
  if (step.type === "collect" && interaction.type === "item") {
    return { type: "item.collected", itemId: interaction.targetId };
  }
  if (step.type === "give_item" && interaction.type === "location") {
    return { type: "item.given", itemId: step.itemId, target: interaction.targetId };
  }
  if (step.type === "go_to" && interaction.type === "location") {
    return { type: "location.reached", target: interaction.targetId };
  }
  if (step.type === "observe" && interaction.type === "observe") {
    return { type: "scene.observed", target: interaction.targetId };
  }

  return eventFromInteraction(interaction);
}

export function questStepTypeFromEvent(event: GameEvent): QuestStepType {
  if (event.type === "npc.talked") return "talk";
  if (event.type === "item.collected") return "collect";
  if (event.type === "item.given") return "give_item";
  if (event.type === "location.reached") return "go_to";
  if (event.type === "scene.observed") return "observe";
  if (event.type === "choice.selected") return "choice";
  return "reflection";
}
