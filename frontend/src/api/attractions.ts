import { apiJson } from './client';
import type { AttractionsState } from './players';

export function buildAttraction(kind: string): Promise<AttractionsState> {
  return apiJson<AttractionsState>('/api/attractions', {
    method: 'POST',
    body: JSON.stringify({ kind }),
  });
}

export function upgradeAttraction(id: number): Promise<AttractionsState> {
  return apiJson<AttractionsState>(`/api/attractions/${id}/upgrade`, { method: 'POST' });
}
