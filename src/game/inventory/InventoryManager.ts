import type { InventoryItem, InventoryState } from "./InventoryTypes";

export class InventoryManager {
  private items = new Map<string, InventoryItem>();

  restore(itemIds: string[], catalog: InventoryItem[]) {
    const catalogById = new Map(catalog.map((item) => [item.id, item]));
    this.items = new Map(
      itemIds.map((itemId) => [
        itemId,
        catalogById.get(itemId) ?? {
          id: itemId,
          name: itemId,
          description: "Collected item"
        }
      ])
    );
  }

  collect(item: InventoryItem) {
    this.items.set(item.id, item);
  }

  remove(itemId: string) {
    return this.items.delete(itemId);
  }

  has(itemId: string) {
    return this.items.has(itemId);
  }

  getState(): InventoryState {
    return { items: [...this.items.values()] };
  }

  getItemIds() {
    return [...this.items.keys()];
  }
}
