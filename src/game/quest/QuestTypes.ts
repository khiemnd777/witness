import type { SpiritualStats } from "../../shared/constants/stats";

export type QuestStepType =
  | "talk"
  | "go_to"
  | "collect"
  | "give_item"
  | "observe"
  | "choice"
  | "reflection";

export type QuestStep = {
  id: string;
  type: QuestStepType;
  instruction: string;
  target?: string;
  npcId?: string;
  itemId?: string;
  requiresItemId?: string;
  count?: number;
  completed?: boolean;
};

export type QuestReflection = {
  theme: string;
  message: string;
  bibleRefIds: string[];
};

export type Quest = {
  id: string;
  chapterId: string;
  title: string;
  description: string;
  location: string;
  steps: QuestStep[];
  rewards?: Partial<SpiritualStats>;
  reflection?: QuestReflection;
};

export type Chapter = {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  location: string;
  summary: string;
  theme: string;
  questIds: string[];
};
