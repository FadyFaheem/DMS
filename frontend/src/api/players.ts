import { apiJson } from './client';

export interface Habitat {
  id: number;
  name: string;
  terrain: string;
  capacity: number;
  level: number;
  happiness_modifier: number;
  living_count: number;
}

export interface HealthHistoryEntry {
  at: string;
  action: string;
  diseases?: string[];
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
  diseases: string[];
  quarantined: boolean;
  health_history: HealthHistoryEntry[];
}

export interface ParkSummary {
  population: number;
  by_category: Record<string, number>;
  avg_health: number;
  critical: number;
  sick: number;
}

export interface ResearchTech {
  key: string;
  name: string;
  description: string;
  cost: number;
  prerequisites: string[];
  requires_population: number;
  unlocks: string[];
  unlocked: boolean;
}

export interface ResearchState {
  unlocked: string[];
  catalog: ResearchTech[];
}

export interface FoodBuilding {
  id: number;
  kind: string;
  name: string | null;
  level: number;
  food_column: string | null;
  output_per_day: number;
  prey: boolean;
  prey_population: number;
  prey_capacity: number;
  last_collected_at: string | null;
}

export interface FoodBuildingCatalogEntry {
  kind: string;
  name: string;
  food_column: string;
  base_output_per_day: number;
  build_cost: number;
  required_tech: string;
  unlocked: boolean;
}

export interface FoodProductionState {
  buildings: FoodBuilding[];
  catalog: FoodBuildingCatalogEntry[];
}

export interface BuiltStructure {
  id: number;
  kind: string;
  name: string | null;
  level: number;
}

export interface StructureCatalogEntry {
  kind: string;
  name: string;
  cost: number;
  required_tech: string;
  unlocked: boolean;
  built: boolean;
}

export interface StructuresState {
  built: BuiltStructure[];
  catalog: StructureCatalogEntry[];
}

export interface ParkEvent {
  id: number;
  kind: string;
  message: string;
  created_at: string;
}

export type EffectScope = 'habitat' | 'food_production';

export interface ActiveEffect {
  id: number;
  kind: string;
  name: string | null;
  scope: EffectScope | null;
  multiplier: number;
  habitat_id: number | null;
  food_production_id: number | null;
  expires_at: string | null;
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
  research: ResearchState;
  food_productions: FoodProductionState;
  structures: StructuresState;
  active_effects: ActiveEffect[];
  events: ParkEvent[];
}

export function createPlayer(): Promise<Player> {
  return apiJson<Player>('/api/players', { method: 'POST' });
}

export function getMe(): Promise<Player> {
  return apiJson<Player>('/api/players/me');
}
