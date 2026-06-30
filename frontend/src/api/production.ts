import { apiJson } from './client';
import type { FoodProductionState } from './players';

export function buildProduction(kind: string): Promise<FoodProductionState> {
  return apiJson<FoodProductionState>('/api/food_productions', {
    method: 'POST',
    body: JSON.stringify({ kind }),
  });
}

export function upgradeProduction(id: number): Promise<FoodProductionState> {
  return apiJson<FoodProductionState>(`/api/food_productions/${id}/upgrade`, { method: 'POST' });
}
