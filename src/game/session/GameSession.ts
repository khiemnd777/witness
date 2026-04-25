import type { ChapterContent } from "../../content/loaders/contentLoader";
import { validateChapterContent } from "../../content/validation/validateChapterContent";
import type { DialogueChoice } from "../dialogue/DialogueTypes";
import { DialogueManager } from "../dialogue/DialogueManager";
import { eventFromInteractionForStep, type GameEvent } from "../events/GameEvents";
import { InventoryManager } from "../inventory/InventoryManager";
import type { InventoryState } from "../inventory/InventoryTypes";
import { NpcManager } from "../npc/NpcManager";
import { QuestManager } from "../quest/QuestManager";
import type { Quest, QuestStep } from "../quest/QuestTypes";
import type { SceneInteraction } from "../scene/ChapterScene";
import { SaveManager } from "../save/SaveManager";
import type { SaveData } from "../save/SaveTypes";
import { createDefaultStats } from "../../shared/constants/stats";

export type GameSessionSnapshot = {
  save: SaveData;
  activeQuest: Quest | null;
  currentStep: QuestStep | null;
  inventory: InventoryState;
  chapterComplete: boolean;
};

export type GameSessionInteractionResult = {
  snapshot: GameSessionSnapshot;
  dialogueId?: string;
  progressed: boolean;
  messages: string[];
};

export class GameSession {
  private questManager = new QuestManager();
  private dialogueManager = new DialogueManager();
  private npcManager = new NpcManager();
  private inventoryManager = new InventoryManager();
  private saveManager = new SaveManager();
  private save: SaveData;
  private chapterComplete = false;

  constructor(private content: ChapterContent) {
    const validationErrors = validateChapterContent(content);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join("\n"));
    }

    this.dialogueManager.load(content.dialogues);
    this.npcManager.load(content.npcs);

    const loadedSave = this.saveManager.load();
    this.save = this.normalizeSave(
      loadedSave?.currentChapterId === content.chapter.id
        ? loadedSave
        : this.saveManager.createNew(content.chapter.id)
    );
    this.inventoryManager.restore(this.save.inventoryItemIds ?? [], content.items);
    this.restoreQuest();
  }

  getSnapshot(): GameSessionSnapshot {
    return {
      save: this.save,
      activeQuest: this.questManager.getActiveQuest(),
      currentStep: this.questManager.getCurrentStep(),
      inventory: this.inventoryManager.getState(),
      chapterComplete: this.chapterComplete
    };
  }

  reset() {
    this.saveManager.clear();
    this.save = this.saveManager.createNew(this.content.chapter.id);
    this.inventoryManager.restore([], this.content.items);
    this.chapterComplete = false;

    const firstQuest = this.content.quests[0];
    this.questManager.startQuest(firstQuest);
    this.persist({
      ...this.save,
      currentQuestId: firstQuest.id
    });

    return this.getSnapshot();
  }

  handleInteraction(interaction: SceneInteraction): GameSessionInteractionResult {
    const dialogueId = this.getDialogueIdForInteraction(interaction);
    const event = eventFromInteractionForStep(interaction, this.questManager.getCurrentStep());
    const result = this.dispatch(event);

    return {
      snapshot: this.getSnapshot(),
      dialogueId,
      progressed: result.progressed,
      messages: result.messages
    };
  }

  getDialogue(dialogueId: string) {
    return this.dialogueManager.get(dialogueId);
  }

  applyDialogueChoice(choice: DialogueChoice) {
    if (!choice.effect || this.save.appliedChoiceIds.includes(choice.id)) {
      return this.getSnapshot();
    }

    const stats = { ...createDefaultStats(), ...this.save.stats };
    for (const [stat, value] of Object.entries(choice.effect)) {
      stats[stat as keyof typeof stats] += value ?? 0;
    }

    this.persist({
      ...this.save,
      stats,
      appliedChoiceIds: [...this.save.appliedChoiceIds, choice.id]
    });

    this.dispatch({ type: "choice.selected", target: choice.id });
    return this.getSnapshot();
  }

  private restoreQuest() {
    const nextQuest = this.selectQuest();
    if (!nextQuest) {
      this.chapterComplete = true;
      return;
    }

    if (this.save.currentQuestId === nextQuest.id) {
      this.questManager.restoreQuest(nextQuest, this.save.currentQuestCompletedStepIds);
    } else {
      this.questManager.startQuest(nextQuest);
      this.persist({
        ...this.save,
        currentQuestId: nextQuest.id,
        currentQuestCompletedStepIds: []
      });
    }
  }

  private selectQuest() {
    if (this.save.currentQuestId) {
      const savedQuest = this.content.quests.find((quest) => quest.id === this.save.currentQuestId);
      if (savedQuest && !this.save.completedQuestIds.includes(savedQuest.id)) return savedQuest;
    }

    return this.content.quests.find((quest) => !this.save.completedQuestIds.includes(quest.id)) ?? null;
  }

  private dispatch(event: GameEvent) {
    const messages: string[] = [];

    if (event.type === "item.collected" && event.itemId) {
      const item = this.content.items.find((candidate) => candidate.id === event.itemId);
      if (item) {
        const alreadyHadItem = this.inventoryManager.has(item.id);
        this.inventoryManager.collect(item);
        if (!alreadyHadItem) {
          messages.push(`Collected: ${item.name}`);
        }
      }
    }

    const progressed = this.questManager.completeStepForEvent(event, (itemId) =>
      this.inventoryManager.has(itemId)
    );
    if (progressed) {
      messages.push("Objective complete");
    }
    this.persistProgress();

    if (progressed && this.questManager.isQuestCompleted()) {
      this.applyRewardAndAdvanceQuest();
      messages.push("Quest complete");
    }

    return { progressed, messages };
  }

  private persistProgress() {
    const active = this.questManager.getActiveQuest();
    this.persist({
      ...this.save,
      currentQuestId: active?.id,
      currentQuestCompletedStepIds: this.questManager.getCompletedStepIds(),
      inventoryItemIds: this.inventoryManager.getItemIds()
    });
  }

  private applyRewardAndAdvanceQuest() {
    const completedQuest = this.questManager.getActiveQuest();
    if (!completedQuest) return;

    const stats = { ...this.save.stats };
    for (const [stat, value] of Object.entries(this.questManager.getReward())) {
      stats[stat as keyof typeof stats] += value ?? 0;
    }

    const completedQuestIds = Array.from(new Set([...this.save.completedQuestIds, completedQuest.id]));
    const nextQuest = this.content.quests.find((quest) => !completedQuestIds.includes(quest.id));

    if (!nextQuest) {
      this.persist({
        ...this.save,
        completedQuestIds,
        currentQuestId: undefined,
        currentQuestCompletedStepIds: [],
        stats
      });
      this.chapterComplete = true;
      return;
    }

    this.questManager.startQuest(nextQuest);
    this.persist({
      ...this.save,
      completedQuestIds,
      currentQuestId: nextQuest.id,
      currentQuestCompletedStepIds: [],
      stats
    });
  }

  getDialogueIdForInteraction(interaction: SceneInteraction) {
    if (interaction.type !== "npc") return undefined;

    const npc = this.npcManager.get(interaction.targetId);
    if (!npc || !this.npcManager.canOpenDialogue(npc.id)) return undefined;

    return npc.dialogueId ?? this.dialogueManager.findByNpc(npc.id)?.id;
  }

  private persist(nextSave: SaveData) {
    this.save = this.normalizeSave(nextSave);
    this.saveManager.save(this.save);
  }

  private normalizeSave(save: SaveData) {
    return {
      ...save,
      currentQuestCompletedStepIds: save.currentQuestCompletedStepIds ?? [],
      completedQuestIds: save.completedQuestIds ?? [],
      unlockedChapterIds: save.unlockedChapterIds ?? [this.content.chapter.id],
      inventoryItemIds: save.inventoryItemIds ?? [],
      collectedScrollIds: save.collectedScrollIds ?? [],
      appliedChoiceIds: save.appliedChoiceIds ?? []
    };
  }
}
