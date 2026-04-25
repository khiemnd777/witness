import { Engine, Scene } from "@babylonjs/core";
import type { InputManager } from "./InputManager";
import { createChapterScene } from "../scene/SceneRegistry";
import type { ChapterScene, ChapterSceneCallbacks } from "../scene/ChapterScene";

export class SceneManager {
  private currentScene: ChapterScene | null = null;

  constructor(private engine: Engine, private input: InputManager) {}

  loadChapterScene(chapterId: string, callbacks: ChapterSceneCallbacks) {
    this.currentScene?.dispose();
    const scene = new Scene(this.engine);
    this.currentScene = createChapterScene(chapterId, scene, this.input, callbacks);
    return this.currentScene;
  }

  update(deltaSeconds: number) {
    this.currentScene?.update(deltaSeconds);
    this.currentScene?.scene.render();
  }

  interact() {
    return this.currentScene?.interact() ?? null;
  }

  setActiveInteractionIds(ids: string[]) {
    this.currentScene?.setActiveInteractionIds(ids);
  }

  setCollectedItemIds(ids: string[]) {
    this.currentScene?.setCollectedItemIds(ids);
  }

  setWorldStateIds(ids: string[]) {
    this.currentScene?.setWorldStateIds(ids);
  }

  dispose() {
    this.currentScene?.dispose();
    this.currentScene = null;
  }
}
