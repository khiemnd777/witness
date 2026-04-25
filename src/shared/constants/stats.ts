export const SPIRITUAL_STATS = [
  "faith",
  "love",
  "humility",
  "wisdom",
  "courage"
] as const;

export type SpiritualStat = (typeof SPIRITUAL_STATS)[number];

export type SpiritualStats = Record<SpiritualStat, number>;

export const createDefaultStats = (): SpiritualStats => ({
  faith: 0,
  love: 0,
  humility: 0,
  wisdom: 0,
  courage: 0
});
