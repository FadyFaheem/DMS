import { useMemo } from 'react';
import { OrbitControls } from '@react-three/drei';
import type { ActiveEffect, Dinosaur, Habitat } from '../../api/players';
import {
  GRID_COLUMNS,
  MAX_DINOS_PER_HABITAT,
  TILE_SIZE,
  TILE_SPACING,
  habitatPositions,
  terrainColor,
} from '../../components/park3d/parkLayout';
import HazardMarker from '../../components/park3d/HazardMarker';
import HabitatTileMesh from './HabitatTileMesh';
import DinoActor from './DinoActor';
import { CROWDED_COLOR, GROUND_COLOR, HAZARD_COLOR, TERRAIN_PALETTE } from '../palette';

interface Props {
  habitats: Habitat[];
  dinosaurs: Dinosaur[];
  activeEffects: ActiveEffect[];
  selectedDinoId: number | null;
  selectedHabitatId: number | null;
  onSelectDino: (dino: Dinosaur) => void;
  onSelectHabitat: (habitat: Habitat) => void;
  onDeselect: () => void;
}

// The interactive 3D park: ground, lights, terrain tiles, roaming dinos, hazard
// markers, and an orbit camera. Pure WebGL (no DOM).
export default function ParkWorld({
  habitats,
  dinosaurs,
  activeEffects,
  selectedDinoId,
  selectedHabitatId,
  onSelectDino,
  onSelectHabitat,
  onDeselect,
}: Props) {
  const { layouts, dinosByHabitat, hazardIds } = useMemo(() => {
    const layouts = habitatPositions(habitats);
    const dinosByHabitat = new Map<number, Dinosaur[]>();
    for (const dino of dinosaurs) {
      if (dino.habitat_id == null || !dino.alive) continue;
      const arr = dinosByHabitat.get(dino.habitat_id) ?? [];
      arr.push(dino);
      dinosByHabitat.set(dino.habitat_id, arr);
    }
    const hazardIds = new Set(
      activeEffects.map((e) => e.habitat_id).filter((id): id is number => id != null),
    );
    return { layouts, dinosByHabitat, hazardIds };
  }, [habitats, dinosaurs, activeEffects]);

  const cols = Math.min(GRID_COLUMNS, Math.max(1, habitats.length));
  const rows = Math.max(1, Math.ceil(habitats.length / GRID_COLUMNS));
  const extent = Math.max(cols, rows) * TILE_SPACING;
  const groundSize = extent * 2 + 30;
  const bounds = (TILE_SIZE / 2) * 0.7;

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[12, 18, 8]} intensity={1.1} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} onClick={() => onDeselect()}>
        <planeGeometry args={[groundSize, groundSize]} />
        <meshStandardMaterial color={GROUND_COLOR} />
      </mesh>

      {habitats.map((habitat, i) => (
        <HabitatTileMesh
          key={habitat.id}
          habitat={habitat}
          position={[layouts[i].x, layouts[i].z]}
          color={terrainColor(habitat.terrain, TERRAIN_PALETTE)}
          hazardColor={HAZARD_COLOR}
          crowdedColor={CROWDED_COLOR}
          hasHazard={hazardIds.has(habitat.id)}
          selected={selectedHabitatId === habitat.id}
          onSelect={onSelectHabitat}
        />
      ))}

      {habitats.flatMap((habitat, i) => {
        const center = { x: layouts[i].x, z: layouts[i].z };
        return (dinosByHabitat.get(habitat.id) ?? [])
          .slice(0, MAX_DINOS_PER_HABITAT)
          .map((dino) => (
            <DinoActor
              key={dino.id}
              dino={dino}
              tileCenter={center}
              bounds={bounds}
              onSelect={onSelectDino}
              selected={selectedDinoId === dino.id}
            />
          ));
      })}

      {layouts
        .filter((l) => hazardIds.has(l.id))
        .map((l) => (
          <HazardMarker key={l.id} position={[l.x, l.z]} color={HAZARD_COLOR} />
        ))}

      <OrbitControls
        target={[0, 0, 0]}
        enablePan={false}
        minDistance={6}
        maxDistance={extent + 30}
        maxPolarAngle={Math.PI / 2.2}
        makeDefault
      />
    </>
  );
}
