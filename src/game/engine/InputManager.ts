export type InputAction = "moveForward" | "moveBackward" | "moveLeft" | "moveRight" | "interact";

export class InputManager {
  private pressed = new Set<string>();
  private virtualMovement = { x: 0, y: 0 };
  private virtualCameraTurn = { x: 0, y: 0 };
  private onInteract: () => void;

  constructor(onInteract: () => void) {
    this.onInteract = onInteract;
  }

  attach() {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  dispose() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
  }

  isPressed(action: InputAction) {
    const keys = ACTION_KEYS[action];
    return keys.some((key) => this.pressed.has(key));
  }

  setVirtualMovement(x: number, y: number) {
    this.virtualMovement = this.clampVector(x, y);
  }

  getVirtualMovement() {
    return this.virtualMovement;
  }

  setVirtualCameraTurn(x: number, y: number) {
    this.virtualCameraTurn = this.clampVector(x, y);
  }

  getVirtualCameraTurn() {
    return this.virtualCameraTurn;
  }

  triggerInteract() {
    this.onInteract();
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    this.pressed.add(event.code);
    if (event.code === "KeyE") {
      this.triggerInteract();
    }
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    this.pressed.delete(event.code);
  };

  private clampAxis(value: number) {
    return Math.max(-1, Math.min(1, value));
  }

  private clampVector(x: number, y: number) {
    const clamped = {
      x: this.clampAxis(x),
      y: this.clampAxis(y)
    };
    const length = Math.hypot(clamped.x, clamped.y);
    if (length <= 1) return clamped;
    return {
      x: clamped.x / length,
      y: clamped.y / length
    };
  }
}

const ACTION_KEYS: Record<InputAction, string[]> = {
  moveForward: ["KeyW", "ArrowUp"],
  moveBackward: ["KeyS", "ArrowDown"],
  moveLeft: ["KeyA", "ArrowLeft"],
  moveRight: ["KeyD", "ArrowRight"],
  interact: ["KeyE"]
};
