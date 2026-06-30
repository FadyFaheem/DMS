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

export interface BreedingPreview {
  compatible: boolean;
  reason: string | null;
  cost: number;
  expected_generation: number;
  species_options: { key: string; name: string | null; chance: number }[];
  diet_options: string[];
  mutation_chance: number;
  possible_traits: string[];
  genetics_quality: { min: number; expected: number; max: number };
}

// Side-effect-free preview of a pairing's likely offspring (species/traits/IV/cost).
export function previewBreeding(parentAId: number, parentBId: number): Promise<BreedingPreview> {
  const params = new URLSearchParams({
    parent_a_id: String(parentAId),
    parent_b_id: String(parentBId),
  });
  return apiJson<BreedingPreview>(`/api/breedings/preview?${params.toString()}`);
}
