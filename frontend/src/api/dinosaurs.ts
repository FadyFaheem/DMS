import { apiJson } from './client';
import type { Dinosaur } from './players';

export function feedDino(id: number, diet: string): Promise<Dinosaur> {
  return apiJson<Dinosaur>(`/api/dinosaurs/${id}/feed`, {
    method: 'POST',
    body: JSON.stringify({ diet }),
  });
}

export function moveDino(id: number, habitatId: number): Promise<Dinosaur> {
  return apiJson<Dinosaur>(`/api/dinosaurs/${id}/move`, {
    method: 'POST',
    body: JSON.stringify({ habitat_id: habitatId }),
  });
}

export function treatDino(id: number): Promise<Dinosaur> {
  return apiJson<Dinosaur>(`/api/dinosaurs/${id}/treat`, { method: 'POST' });
}

export function quarantineDino(id: number): Promise<Dinosaur> {
  return apiJson<Dinosaur>(`/api/dinosaurs/${id}/quarantine`, { method: 'POST' });
}
