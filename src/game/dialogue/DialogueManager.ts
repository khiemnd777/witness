import type { Dialogue } from "./DialogueTypes";

export class DialogueManager {
  private dialogues = new Map<string, Dialogue>();

  load(dialogues: Dialogue[]) {
    this.dialogues = new Map(dialogues.map((dialogue) => [dialogue.id, dialogue]));
  }

  get(dialogueId: string) {
    return this.dialogues.get(dialogueId) ?? null;
  }

  findByNpc(npcId: string) {
    return [...this.dialogues.values()].find((dialogue) => dialogue.npcId === npcId) ?? null;
  }
}
