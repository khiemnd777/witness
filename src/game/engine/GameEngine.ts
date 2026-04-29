import { Engine } from "@babylonjs/core";
import "@babylonjs/loaders";
import { InputManager } from "./InputManager";
import { SceneManager } from "./SceneManager";
import type { ObjectiveHint, SceneInteraction } from "../scene/ChapterScene";

export type GameEngineCallbacks = {
  onInteract: (interaction: SceneInteraction | null) => void;
  onNearestInteractionChange: (interaction: SceneInteraction | null) => void;
  onObjectiveHintChange: (hint: ObjectiveHint | null) => void;
};

export class GameEngine {
  private engine: Engine;
  private input: InputManager;
  private sceneManager: SceneManager;
  private lastFrameTime = performance.now();

  constructor(
    private canvas: HTMLCanvasElement,
    private chapterId: string,
    private callbacks: GameEngineCallbacks
  ) {
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true
    });
    this.input = new InputManager(() => this.callbacks.onInteract(this.sceneManager.interact()));
    this.sceneManager = new SceneManager(this.engine, this.input);
  }

  start() {
    this.input.attach();
    this.sceneManager.loadChapterScene(this.chapterId, {
      onNearestInteractionChange: this.callbacks.onNearestInteractionChange,
      onObjectiveHintChange: this.callbacks.onObjectiveHintChange
    });

    this.engine.runRenderLoop(() => {
      const now = performance.now();
      const deltaSeconds = Math.min((now - this.lastFrameTime) / 1000, 0.05);
      this.lastFrameTime = now;
      this.sceneManager.update(deltaSeconds);
    });

    window.addEventListener("resize", this.handleResize);
  }

  dispose() {
    window.removeEventListener("resize", this.handleResize);
    this.input.dispose();
    this.sceneManager.dispose();
    this.engine.dispose();
  }

  setActiveInteractionIds(ids: string[]) {
    this.sceneManager.setActiveInteractionIds(ids);
  }

  setCollectedItemIds(ids: string[]) {
    this.sceneManager.setCollectedItemIds(ids);
  }

  setWorldStateIds(ids: string[]) {
    this.sceneManager.setWorldStateIds(ids);
  }

  setVirtualMovement(x: number, y: number) {
    this.input.setVirtualMovement(x, y);
  }

  setVirtualCameraTurn(x: number, y: number) {
    this.input.setVirtualCameraTurn(x, y);
  }

  triggerInteract() {
    this.input.triggerInteract();
  }

  private handleResize = () => {
    this.engine.resize();
  };
}
