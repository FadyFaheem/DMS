import { describe, it, expect } from 'vitest';
import {
  MAX_DINOS_PER_HABITAT,
  TILE_SIZE,
  dinoPlacements,
  habitatPositions,
  terrainColor,
  type TerrainPalette,
} from '../../../components/park3d/parkLayout';
import type { Dinosaur, Habitat } from '../../../api/players';

function makeHabitat(id: number, terrain = 'forest'): Habitat {
  return {
    id,
    name: `H${id}`,
    terrain,
    capacity: 10,
    level: 1,
    happiness_modifier: 0,
    living_count: 0,
  };
}

function makeDino(id: number, habitat_id: number | null, overrides: Partial<Dinosaur> = {}): Dinosaur {
  return {
    id,
    name: `D${id}`,
    species: 'triceratops',
    period: null,
    gender: 'female',
    color: 'green',
    size_lbs: 100,
    generation: 1,
    habitat_id,
    diet_primary: 'plants',
    diet_secondary: null,
    preferred_terrain: null,
    social_structure: 'herd',
    health: 80,
    hunger: 10,
    happiness: 80,
    reproduction_readiness: 0,
    status: 'Thriving',
    alive: true,
    mutations: [],
    parent_a_id: null,
    parent_b_id: null,
    born_at: '2026-01-01T00:00:00Z',
    diseases: [],
    quarantined: false,
    health_history: [],
    ...overrides,
  };
}

describe('habitatPositions', () => {
  it('is deterministic and preserves habitat ids', () => {
    const habitats = Array.from({ length: 7 }, (_, i) => makeHabitat(i + 1));
    expect(habitatPositions(habitats)).toEqual(habitatPositions(habitats));
    expect(habitatPositions(habitats).map((l) => l.id)).toEqual(habitats.map((h) => h.id));
  });

  it('spaces tiles so they never overlap', () => {
    const layouts = habitatPositions(Array.from({ length: 9 }, (_, i) => makeHabitat(i + 1)));
    for (let i = 0; i < layouts.length; i++) {
      for (let j = i + 1; j < layouts.length; j++) {
        const dist = Math.hypot(layouts[i].x - layouts[j].x, layouts[i].z - layouts[j].z);
        expect(dist).toBeGreaterThanOrEqual(TILE_SIZE);
      }
    }
  });
});

describe('dinoPlacements', () => {
  it('scatters living residents inside their tile, deterministically and capped', () => {
    const layouts = habitatPositions([makeHabitat(1)]);
    const tile = layouts[0];
    const dinos = Array.from({ length: MAX_DINOS_PER_HABITAT + 5 }, (_, i) => makeDino(i + 1, 1));

    const placements = dinoPlacements(dinos, layouts);
    expect(placements).toEqual(dinoPlacements(dinos, layouts));
    expect(placements).toHaveLength(MAX_DINOS_PER_HABITAT);
    for (const p of placements) {
      expect(Math.abs(p.x - tile.x)).toBeLessThanOrEqual(TILE_SIZE / 2);
      expect(Math.abs(p.z - tile.z)).toBeLessThanOrEqual(TILE_SIZE / 2);
    }
  });

  it('ignores dead dinos, the unhoused, and unknown habitats', () => {
    const layouts = habitatPositions([makeHabitat(1)]);
    const dinos = [
      makeDino(1, 1, { alive: false }),
      makeDino(2, null),
      makeDino(3, 99),
      makeDino(4, 1),
    ];
    expect(dinoPlacements(dinos, layouts).map((p) => p.id)).toEqual([4]);
  });
});

describe('terrainColor', () => {
  const palette: TerrainPalette = {
    success: '#0a0',
    warning: '#fa0',
    info: '#08f',
    primary: '#00f',
    error: '#f00',
    fallback: '#999',
  };

  it('maps known terrains to palette colors', () => {
    expect(terrainColor('forest', palette)).toBe('#0a0');
    expect(terrainColor('grassland', palette)).toBe('#fa0');
    expect(terrainColor('wetland', palette)).toBe('#08f');
    expect(terrainColor('aquatic', palette)).toBe('#00f');
    expect(terrainColor('volcanic', palette)).toBe('#f00');
  });

  it('falls back for unknown terrain', () => {
    expect(terrainColor('mystery', palette)).toBe('#999');
  });
});
