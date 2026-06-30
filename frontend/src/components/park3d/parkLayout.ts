// Pure, framework-free layout math for the 3D park scene. Kept separate from the
// React Three Fiber components so it can be unit-tested without WebGL.
import type { Dinosaur, Habitat } from '../../api/players';
import { seededRng } from '../../utils/seededRandom';

// World-space sizing (three.js units). Spacing > size guarantees tiles never
// overlap; the scatter margin keeps dinos visually inside their tile.
export const TILE_SIZE = 4;
export const TILE_HEIGHT = 0.5;
export const TILE_SPACING = 5.5;
export const GRID_COLUMNS = 4;
// ponytail: hard cap on dinos rendered per habitat to bound draw calls. A
// crowded park is still readable at 8; upgrade path = InstancedMesh.
export const MAX_DINOS_PER_HABITAT = 8;

const SCATTER_MARGIN = 0.7;

export interface HabitatLayout {
  id: number;
  x: number;
  z: number;
}

export interface DinoPlacement {
  id: number;
  x: number;
  z: number;
  rotation: number;
}

// Map terrain -> a key into the (theme-derived) palette. Mirrors the 2D
// ParkMap's TERRAIN_BG so the two views stay visually consistent. Colors still
// come from the MUI theme (see ParkScene), never hardcoded here.
export interface TerrainPalette {
  success: string;
  warning: string;
  info: string;
  primary: string;
  error: string;
  fallback: string;
}

const TERRAIN_PALETTE_KEY: Record<string, keyof TerrainPalette> = {
  forest: 'success',
  grassland: 'warning',
  wetland: 'info',
  aquatic: 'primary',
  volcanic: 'error',
};

export function terrainColor(terrain: string, palette: TerrainPalette): string {
  const key = TERRAIN_PALETTE_KEY[terrain] ?? 'fallback';
  return palette[key];
}

// Lay habitats out on a centered grid so the camera looks at the middle of the
// park regardless of how many habitats exist.
export function habitatPositions(habitats: Habitat[], columns = GRID_COLUMNS): HabitatLayout[] {
  const cols = Math.max(1, columns);
  const rows = Math.max(1, Math.ceil(habitats.length / cols));
  return habitats.map((habitat, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    return {
      id: habitat.id,
      x: (col - (cols - 1) / 2) * TILE_SPACING,
      z: (row - (rows - 1) / 2) * TILE_SPACING,
    };
  });
}

// Deterministically scatter each habitat's living residents within its tile.
// Same dino -> same spot every render (seeded by species|color|id).
export function dinoPlacements(
  dinos: Dinosaur[],
  layouts: HabitatLayout[],
  maxPerHabitat = MAX_DINOS_PER_HABITAT,
): DinoPlacement[] {
  const positions = new Map(layouts.map((l) => [l.id, l]));
  const byHabitat = new Map<number, Dinosaur[]>();
  for (const dino of dinos) {
    if (dino.habitat_id == null || !dino.alive) continue;
    const list = byHabitat.get(dino.habitat_id) ?? [];
    list.push(dino);
    byHabitat.set(dino.habitat_id, list);
  }

  const placements: DinoPlacement[] = [];
  const half = (TILE_SIZE / 2) * SCATTER_MARGIN;
  for (const [habitatId, residents] of byHabitat) {
    const pos = positions.get(habitatId);
    if (!pos) continue;
    for (const dino of residents.slice(0, maxPerHabitat)) {
      const rand = seededRng(`${dino.species}|${dino.color ?? 'plain'}|${dino.id}`);
      placements.push({
        id: dino.id,
        x: pos.x + (rand() * 2 - 1) * half,
        z: pos.z + (rand() * 2 - 1) * half,
        rotation: rand() * Math.PI * 2,
      });
    }
  }
  return placements;
}
