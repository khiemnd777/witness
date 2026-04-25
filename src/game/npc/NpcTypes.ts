export type NpcRole =
  | "historical"
  | "common"
  | "quest"
  | "teaching"
  | "crowd"
  | "sacred_narrative";

export type NpcDefinition = {
  id: string;
  name: string;
  role: NpcRole;
  description: string;
  dialogueId?: string;
  position: [number, number, number];
  interactionLabel?: string;
  sacredRules?: {
    normalQuestNpc: false;
    commandable: false;
    playable: false;
  };
};
