import type { Scene, Vector3 } from "@babylonjs/core";

export type SceneInteraction = {
  id: string;
  label: string;
  type: "npc" | "item" | "location" | "observe";
  targetId: string;
  itemId?: string;
  interiorZoneId?: string;
};

export type ObjectiveHint = {
  label: string;
  distance: number;
  angleRadians: number;
};

export type ChapterSceneCallbacks = {
  onNearestInteractionChange: (interaction: SceneInteraction | null) => void;
  onObjectiveHintChange: (hint: ObjectiveHint | null) => void;
};

export interface ChapterScene {
  scene: Scene;
  update(deltaSeconds: number): void;
  interact(): SceneInteraction | null;
  setActiveInteractionIds(ids: string[]): void;
  setCollectedItemIds(ids: string[]): void;
  setWorldStateIds(ids: string[]): void;
  getPlayerPosition(): Vector3;
  dispose(): void;
}
