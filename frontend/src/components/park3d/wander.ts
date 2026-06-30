// Pure helpers for roaming dinos within their habitat tile. Kept framework-free
// so the movement logic can be unit-tested without a WebGL context.

export interface Vec2 {
  x: number;
  z: number;
}

// Pick a new random wander target within a square area centered at (cx, cz).
export function nextWanderTarget(
  cx: number,
  cz: number,
  halfExtent: number,
  rand: () => number,
): Vec2 {
  return {
    x: cx + (rand() * 2 - 1) * halfExtent,
    z: cz + (rand() * 2 - 1) * halfExtent,
  };
}

// Move `pos` toward `target` by at most `maxStep`. Returns the new position and
// whether the target was reached this step.
export function stepToward(
  pos: Vec2,
  target: Vec2,
  maxStep: number,
): { pos: Vec2; reached: boolean } {
  const dx = target.x - pos.x;
  const dz = target.z - pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= maxStep || dist === 0) {
    return { pos: { x: target.x, z: target.z }, reached: true };
  }
  const t = maxStep / dist;
  return { pos: { x: pos.x + dx * t, z: pos.z + dz * t }, reached: false };
}

// Heading in radians to face `target` from `pos` (Y-up world, matching the
// model's +Z forward orientation).
export function headingToward(pos: Vec2, target: Vec2): number {
  return Math.atan2(target.x - pos.x, target.z - pos.z);
}
