export type InventoryItem = {
  id: string;
  name: string;
  description: string;
};

export type InventoryState = {
  items: InventoryItem[];
};
