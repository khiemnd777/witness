import type { Chapter } from "../../game/quest/QuestTypes";
import type { Quest } from "../../game/quest/QuestTypes";
import type { Dialogue } from "../../game/dialogue/DialogueTypes";
import type { NpcDefinition } from "../../game/npc/NpcTypes";
import type { BibleReference } from "../schemas/BibleReference";
import type { ItemDefinition } from "../schemas/ItemDefinition";
import type { SceneTargetDefinition } from "../schemas/SceneTargetDefinition";
import type { ChapterManifestEntry } from "../schemas/ChapterManifest";

async function loadJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export type ChapterContent = {
  chapter: Chapter;
  quests: Quest[];
  dialogues: Dialogue[];
  npcs: NpcDefinition[];
  items: ItemDefinition[];
  sceneTargets: SceneTargetDefinition[];
  bibleReferences: BibleReference[];
};

export async function loadChapterManifest(): Promise<ChapterManifestEntry[]> {
  return loadJson<ChapterManifestEntry[]>("/content/chapters/index.json");
}

export async function loadChapterContent(chapterId: string): Promise<ChapterContent> {
  const [chapter, quests, dialogues, npcs, items, sceneTargets, bibleReferences] = await Promise.all([
    loadJson<Chapter>(`/content/chapters/${chapterId}.json`),
    loadJson<Quest[]>(`/content/quests/${chapterId}.json`),
    loadJson<Dialogue[]>(`/content/dialogues/${chapterId}.json`),
    loadJson<NpcDefinition[]>(`/content/npcs/${chapterId}.json`),
    loadJson<ItemDefinition[]>(`/content/items/${chapterId}.json`),
    loadJson<SceneTargetDefinition[]>(`/content/scene_targets/${chapterId}.json`),
    loadJson<BibleReference[]>(`/content/bible_refs/${chapterId}.json`)
  ]);

  return { chapter, quests, dialogues, npcs, items, sceneTargets, bibleReferences };
}
