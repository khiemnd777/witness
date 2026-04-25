export type InputAction = "moveForward" | "moveBackward" | "moveLeft" | "moveRight" | "interact";

export class InputManager {
  private pressed = new Set<string>();
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

  private handleKeyDown = (event: KeyboardEvent) => {
    this.pressed.add(event.code);
    if (event.code === "KeyE") {
      this.onInteract();
    }
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    this.pressed.delete(event.code);
  };
}

const ACTION_KEYS: Record<InputAction, string[]> = {
  moveForward: ["KeyW", "ArrowUp"],
  moveBackward: ["KeyS", "ArrowDown"],
  moveLeft: ["KeyA", "ArrowLeft"],
  moveRight: ["KeyD", "ArrowRight"],
  interact: ["KeyE"]
};
