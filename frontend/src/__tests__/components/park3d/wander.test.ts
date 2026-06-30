import { describe, it, expect } from 'vitest';
import { headingToward, nextWanderTarget, stepToward } from '../../../components/park3d/wander';
import { seededRng } from '../../../utils/seededRandom';

describe('nextWanderTarget', () => {
  it('stays within the bounds and is deterministic for a given seed', () => {
    const a = nextWanderTarget(5, -3, 2, seededRng('seed'));
    const b = nextWanderTarget(5, -3, 2, seededRng('seed'));
    expect(a).toEqual(b);
    expect(Math.abs(a.x - 5)).toBeLessThanOrEqual(2);
    expect(Math.abs(a.z + 3)).toBeLessThanOrEqual(2);
  });
});

describe('stepToward', () => {
  it('advances by at most maxStep', () => {
    const s = stepToward({ x: 0, z: 0 }, { x: 10, z: 0 }, 2);
    expect(s.reached).toBe(false);
    expect(s.pos.x).toBeCloseTo(2);
    expect(s.pos.z).toBeCloseTo(0);
  });

  it('snaps to the target and reports reached when within range', () => {
    const s = stepToward({ x: 9.5, z: 0 }, { x: 10, z: 0 }, 2);
    expect(s.reached).toBe(true);
    expect(s.pos).toEqual({ x: 10, z: 0 });
  });
});

describe('headingToward', () => {
  it('is 0 facing +Z and PI/2 facing +X', () => {
    expect(headingToward({ x: 0, z: 0 }, { x: 0, z: 1 })).toBeCloseTo(0);
    expect(headingToward({ x: 0, z: 0 }, { x: 1, z: 0 })).toBeCloseTo(Math.PI / 2);
  });
});
