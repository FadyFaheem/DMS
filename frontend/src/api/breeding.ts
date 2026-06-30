import { apiJson } from './client';
import type { Dinosaur } from './players';

export interface Breeding {
  id: number;
  status: string;
  parent_a_id: number;
  parent_b_id: number;
  offspring_id: number | null;
  requested_trait: string | null;
  hatches_at: string;
  ready: boolean;
  created_at: string;
}

export function listBreedings(): Promise<Breeding[]> {
  return apiJson<Breeding[]>('/api/breedings');
}

export function startBreeding(
  parentAId: number,
  parentBId: number,
  requestedTrait?: string,
): Promise<Breeding> {
  return apiJson<Breeding>('/api/breedings', {
    method: 'POST',
    body: JSON.stringify({
      parent_a_id: parentAId,
      parent_b_id: parentBId,
      requested_trait: requestedTrait,
    }),
  });
}

export function claimBreeding(id: number): Promise<Dinosaur> {
  return apiJson<Dinosaur>(`/api/breedings/${id}/claim`, { method: 'POST' });
}
