export type PlayerState = {
  position: [number, number, number];
  facingRadians: number;
};

export const createDefaultPlayerState = (): PlayerState => ({
  position: [0, 0, -7],
  facingRadians: 0
});
