import { apiJson } from './client';
import type { SpeciesState } from './players';

export function listSpecies(): Promise<SpeciesState> {
  return apiJson<SpeciesState>('/api/species');
}

export function acquireSpecies(speciesKey: string): Promise<SpeciesState> {
  return apiJson<SpeciesState>('/api/species', {
    method: 'POST',
    body: JSON.stringify({ species_key: speciesKey }),
  });
}
