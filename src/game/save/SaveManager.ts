import { createDefaultStats } from "../../shared/constants/stats";
import type { SaveData } from "./SaveTypes";

const SAVE_KEY = "the-witness:save:v1";

export class SaveManager {
  load(): SaveData | null {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as SaveData;
    } catch {
      localStorage.removeItem(SAVE_KEY);
      return null;
    }
  }

  save(data: SaveData) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }

  clear() {
    localStorage.removeItem(SAVE_KEY);
  }

  createNew(chapterId: string): SaveData {
    return {
      currentChapterId: chapterId,
      currentQuestCompletedStepIds: [],
      completedQuestIds: [],
      unlockedChapterIds: [chapterId],
      stats: createDefaultStats(),
      inventoryItemIds: [],
      appliedChoiceIds: [],
      collectedScrollIds: []
    };
  }
}
