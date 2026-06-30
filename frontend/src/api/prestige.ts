import { apiJson } from './client';
import type { Player } from './players';

// Reset the park for New Game+, keeping the permanent prestige bonus. Only
// succeeds once the win condition has been met.
export function prestige(): Promise<Player> {
  return apiJson<Player>('/api/prestige', { method: 'POST' });
}
