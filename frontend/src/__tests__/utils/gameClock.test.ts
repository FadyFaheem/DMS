import { describe, it, expect } from 'vitest';
import { gameDaysElapsed, gameDayLabel, REAL_MINUTES_PER_GAME_DAY } from '../../utils/gameClock';

describe('gameClock', () => {
  const now = new Date('2026-01-10T00:00:00Z').getTime();

  it('counts whole game-days since the park was founded', () => {
    const created = new Date(now - 3 * REAL_MINUTES_PER_GAME_DAY * 60 * 1000).toISOString();
    expect(gameDaysElapsed(created, now)).toBe(3);
  });

  it('never goes negative and handles a missing timestamp', () => {
    expect(gameDaysElapsed(undefined, now)).toBe(0);
    expect(gameDaysElapsed(new Date(now + 10_000).toISOString(), now)).toBe(0);
  });

  it('labels the current day starting at Day 1', () => {
    const created = new Date(now - 2 * REAL_MINUTES_PER_GAME_DAY * 60 * 1000).toISOString();
    expect(gameDayLabel(created, now)).toBe('Day 3');
  });
});
