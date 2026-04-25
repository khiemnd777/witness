import type { SpiritualStats } from "../../shared/constants/stats";

export type DialogueChoice = {
  id: string;
  text: string;
  effect?: Partial<SpiritualStats>;
  nextLineId?: string;
};

export type DialogueLine = {
  id: string;
  speaker: string;
  text?: string;
  choices?: DialogueChoice[];
};

export type Dialogue = {
  id: string;
  npcId: string;
  title: string;
  lines: DialogueLine[];
};
