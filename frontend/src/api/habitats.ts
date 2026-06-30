import { apiJson } from './client';
import type { Habitat } from './players';

export function buildHabitat(terrain: string, name?: string): Promise<Habitat> {
  return apiJson<Habitat>('/api/habitats', {
    method: 'POST',
    body: JSON.stringify({ terrain, name }),
  });
}

export function upgradeHabitat(id: number): Promise<Habitat> {
  return apiJson<Habitat>(`/api/habitats/${id}/upgrade`, { method: 'POST' });
}

// Move plant food from the global stores into a habitat's local grazing stockpile.
export function stockHabitat(id: number, amount: number): Promise<Habitat> {
  return apiJson<Habitat>(`/api/habitats/${id}/stock`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}
