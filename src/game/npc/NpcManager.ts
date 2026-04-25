import type { NpcDefinition } from "./NpcTypes";

export class NpcManager {
  private npcs = new Map<string, NpcDefinition>();

  load(npcs: NpcDefinition[]) {
    this.npcs = new Map(npcs.map((npc) => [npc.id, npc]));
  }

  get(npcId: string) {
    return this.npcs.get(npcId) ?? null;
  }

  all() {
    return [...this.npcs.values()];
  }

  canOpenDialogue(npcId: string) {
    const npc = this.get(npcId);
    return Boolean(npc?.dialogueId && npc.role !== "sacred_narrative");
  }
}
