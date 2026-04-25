import type { Vector3 } from "@babylonjs/core";

export type CollisionBox = {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type MovementBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export function createCollisionBox(
  id: string,
  center: Vector3,
  halfWidth: number,
  halfDepth: number,
  padding = 0.35
): CollisionBox {
  return {
    id,
    minX: center.x - halfWidth - padding,
    maxX: center.x + halfWidth + padding,
    minZ: center.z - halfDepth - padding,
    maxZ: center.z + halfDepth + padding
  };
}
