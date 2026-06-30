import { apiJson } from './client';
import type { ResearchState } from './players';

export function listResearch(): Promise<ResearchState> {
  return apiJson<ResearchState>('/api/researches');
}

export function unlockResearch(techKey: string): Promise<ResearchState> {
  return apiJson<ResearchState>('/api/researches', {
    method: 'POST',
    body: JSON.stringify({ tech_key: techKey }),
  });
}
