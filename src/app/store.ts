import { create } from "zustand";
import type { ChapterContent } from "../content/loaders/contentLoader";
import type { ChapterManifestEntry } from "../content/schemas/ChapterManifest";
import type { Dialogue } from "../game/dialogue/DialogueTypes";
import type { InventoryState } from "../game/inventory/InventoryTypes";
import type { Quest, QuestStep } from "../game/quest/QuestTypes";
import type { ObjectiveHint, SceneInteraction } from "../game/scene/ChapterScene";
import type { SaveData } from "../game/save/SaveTypes";

export type GameStore = {
  content: ChapterContent | null;
  chapterManifest: ChapterManifestEntry[];
  save: SaveData | null;
  activeQuest: Quest | null;
  currentStep: QuestStep | null;
  activeDialogue: Dialogue | null;
  inventory: InventoryState;
  nearestInteraction: SceneInteraction | null;
  objectiveHint: ObjectiveHint | null;
  toasts: string[];
  chapterComplete: boolean;
  error: string | null;
  setContent: (content: ChapterContent) => void;
  setChapterManifest: (manifest: ChapterManifestEntry[]) => void;
  setSave: (save: SaveData) => void;
  setQuestState: (quest: Quest | null, step: QuestStep | null) => void;
  setActiveDialogue: (dialogue: Dialogue | null) => void;
  setInventory: (inventory: InventoryState) => void;
  setNearestInteraction: (interaction: SceneInteraction | null) => void;
  setObjectiveHint: (hint: ObjectiveHint | null) => void;
  pushToast: (message: string) => void;
  dismissToast: (message: string) => void;
  setChapterComplete: (value: boolean) => void;
  setError: (error: string | null) => void;
};

export const useGameStore = create<GameStore>((set) => ({
  content: null,
  chapterManifest: [],
  save: null,
  activeQuest: null,
  currentStep: null,
  activeDialogue: null,
  inventory: { items: [] },
  nearestInteraction: null,
  objectiveHint: null,
  toasts: [],
  chapterComplete: false,
  error: null,
  setContent: (content) => set({ content }),
  setChapterManifest: (chapterManifest) => set({ chapterManifest }),
  setSave: (save) => set({ save }),
  setQuestState: (activeQuest, currentStep) => set({ activeQuest, currentStep }),
  setActiveDialogue: (activeDialogue) => set({ activeDialogue }),
  setInventory: (inventory) => set({ inventory }),
  setNearestInteraction: (nearestInteraction) => set({ nearestInteraction }),
  setObjectiveHint: (objectiveHint) => set({ objectiveHint }),
  pushToast: (message) => set((state) => ({ toasts: [...state.toasts, message] })),
  dismissToast: (message) =>
    set((state) => {
      const index = state.toasts.indexOf(message);
      if (index < 0) return state;
      return { toasts: state.toasts.filter((_, candidateIndex) => candidateIndex !== index) };
    }),
  setChapterComplete: (chapterComplete) => set({ chapterComplete }),
  setError: (error) => set({ error })
}));
