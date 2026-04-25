import type { Scene } from "@babylonjs/core";
import type { InputManager } from "../engine/InputManager";
import { BethlehemScene } from "./BethlehemScene";
import type { ChapterScene, ChapterSceneCallbacks } from "./ChapterScene";

export type ChapterSceneFactory = (
  scene: Scene,
  input: InputManager,
  callbacks: ChapterSceneCallbacks
) => ChapterScene;

const SCENE_REGISTRY = new Map<string, ChapterSceneFactory>([
  ["chapter_01", (scene, input, callbacks) => new BethlehemScene(scene, input, callbacks)]
]);

export function createChapterScene(
  chapterId: string,
  scene: Scene,
  input: InputManager,
  callbacks: ChapterSceneCallbacks
) {
  const factory = SCENE_REGISTRY.get(chapterId);
  if (!factory) {
    throw new Error(`Unsupported chapter scene: ${chapterId}`);
  }
  return factory(scene, input, callbacks);
}

export function getRegisteredSceneIds() {
  return [...SCENE_REGISTRY.keys()];
}
