import type { SpiritualStats } from "../../shared/constants/stats";

export type SaveData = {
  currentChapterId: string;
  currentQuestId?: string;
  currentQuestCompletedStepIds: string[];
  completedQuestIds: string[];
  unlockedChapterIds: string[];
  stats: SpiritualStats;
  inventoryItemIds: string[];
  collectedScrollIds: string[];
  appliedChoiceIds: string[];
};
