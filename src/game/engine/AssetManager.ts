import { AssetsManager, Scene } from "@babylonjs/core";

export class AssetManager {
  private manager: AssetsManager;

  constructor(scene: Scene) {
    this.manager = new AssetsManager(scene);
  }

  loadAll() {
    return this.manager.loadAsync();
  }
}
