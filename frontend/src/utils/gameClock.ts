// Client-side game-time helpers. The park advances one game-day per this many
// real minutes.
// ponytail: mirrors the API default (GAME_DAY_REAL_MINUTES=60); if the server
// scale is ever changed, expose it on the player payload and read it here.
export const REAL_MINUTES_PER_GAME_DAY = 60;

const MS_PER_GAME_DAY = REAL_MINUTES_PER_GAME_DAY * 60 * 1000;

// Whole game-days elapsed since the park was founded.
export function gameDaysElapsed(createdAt?: string, now: number = Date.now()): number {
  if (!createdAt) return 0;
  const ms = now - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(ms / MS_PER_GAME_DAY));
}

// Human "Day N" label (parks open on Day 1).
export function gameDayLabel(createdAt?: string, now: number = Date.now()): string {
  return `Day ${gameDaysElapsed(createdAt, now) + 1}`;
}
