import { apiJson } from './client';

export interface Habitat {
  id: number;
  name: string;
  terrain: string;
  capacity: number;
  happiness_modifier: number;
  living_count: number;
}

export interface Dinosaur {
  id: number;
  name: string;
  species: string;
  period: string | null;
  gender: string;
  color: string | null;
  size_lbs: number;
  generation: number;
  habitat_id: number | null;
  diet_primary: string;
  diet_secondary: string | null;
  preferred_terrain: string | null;
  social_structure: string;
  health: number;
  hunger: number;
  happiness: number;
  reproduction_readiness: number;
  status: string;
  alive: boolean;
  mutations: string[];
  parent_a_id: number | null;
  parent_b_id: number | null;
  born_at: string;
}

export interface ParkSummary {
  population: number;
  by_category: Record<string, number>;
  avg_health: number;
  critical: number;
}

export interface Player {
  id: number;
  player_code: string;
  display_name: string;
  currency: number;
  food: { plants: number; meat: number; fish: number };
  habitats: Habitat[];
  dinosaurs: Dinosaur[];
  summary: ParkSummary;
}

export function createPlayer(): Promise<Player> {
  return apiJson<Player>('/api/players', { method: 'POST' });
}

export function getMe(): Promise<Player> {
  return apiJson<Player>('/api/players/me');
}
