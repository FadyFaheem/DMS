import { apiJson } from './client';
import type { StructuresState } from './players';

export function buildStructure(kind: string): Promise<StructuresState> {
  return apiJson<StructuresState>('/api/structures', {
    method: 'POST',
    body: JSON.stringify({ kind }),
  });
}
