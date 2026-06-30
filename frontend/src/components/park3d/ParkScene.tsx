import { useMemo, useState } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { ActiveEffect, Dinosaur, Habitat } from '../../api/players';
import HabitatDialog from '../HabitatDialog';
import HabitatTile from './HabitatTile';
import DinoModel from './DinoModel';
import HazardMarker from './HazardMarker';
import {
  GRID_COLUMNS,
  TILE_HEIGHT,
  TILE_SPACING,
  dinoPlacements,
  habitatPositions,
  terrainColor,
  type TerrainPalette,
} from './parkLayout';

interface Props {
  habitats: Habitat[];
  dinosaurs: Dinosaur[];
  activeEffects: ActiveEffect[];
  onStock: (habitatId: number, amount: number) => Promise<void>;
  onInspectDino?: (dino: Dinosaur) => void;
}

// Interactive 3D park: terrain tiles laid out on a grid, living dinos roaming
// their habitats, hazard markers over affected tiles. Drop-in replacement for
// the 2D ParkMap (identical props); colors come from the MUI theme.
export default function ParkScene({
  habitats,
  dinosaurs,
  activeEffects,
  onStock,
  onInspectDino,
}: Props) {
  const theme = useTheme();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = habitats.find((h) => h.id === selectedId) ?? null;

  const palette: TerrainPalette = useMemo(
    () => ({
      success: theme.palette.success.light,
      warning: theme.palette.warning.light,
      info: theme.palette.info.light,
      primary: theme.palette.primary.light,
      error: theme.palette.error.light,
      fallback: theme.palette.grey[400],
    }),
    [theme],
  );

  const { layouts, placements, hazardIds, dinoById } = useMemo(() => {
    const layouts = habitatPositions(habitats);
    return {
      layouts,
      placements: dinoPlacements(dinosaurs, layouts),
      hazardIds: new Set(
        activeEffects.map((e) => e.habitat_id).filter((id): id is number => id != null),
      ),
      dinoById: new Map(dinosaurs.map((d) => [d.id, d])),
    };
  }, [habitats, dinosaurs, activeEffects]);

  if (habitats.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        No habitats yet — build one to populate the map.
      </Typography>
    );
  }

  const cols = Math.min(GRID_COLUMNS, habitats.length);
  const rows = Math.ceil(habitats.length / GRID_COLUMNS);
  const extent = Math.max(cols, rows) * TILE_SPACING;
  const camDist = extent + 9;
  const groundSize = extent * 2 + 24;

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Park Map
      </Typography>
      <Box
        sx={{
          height: { xs: 340, sm: 440 },
          borderRadius: 2,
          overflow: 'hidden',
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Canvas camera={{ position: [0, extent * 0.7 + 6, camDist], fov: 50 }} dpr={[1, 2]}>
          <color attach="background" args={[theme.palette.grey[100]]} />
          <ambientLight intensity={0.75} />
          <directionalLight position={[12, 18, 8]} intensity={1.1} />

          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <planeGeometry args={[groundSize, groundSize]} />
            <meshStandardMaterial color={theme.palette.grey[200]} />
          </mesh>

          {habitats.map((habitat, i) => (
            <HabitatTile
              key={habitat.id}
              habitat={habitat}
              position={[layouts[i].x, layouts[i].z]}
              color={terrainColor(habitat.terrain, palette)}
              hazardColor={theme.palette.error.main}
              crowdedColor={theme.palette.warning.main}
              hasHazard={hazardIds.has(habitat.id)}
              onSelect={(h) => setSelectedId(h.id)}
            />
          ))}

          {placements.map((p) => {
            const dino = dinoById.get(p.id);
            if (!dino) return null;
            return (
              <DinoModel
                key={p.id}
                dino={dino}
                position={[p.x, TILE_HEIGHT, p.z]}
                rotation={p.rotation}
                onSelect={onInspectDino}
              />
            );
          })}

          {layouts
            .filter((l) => hazardIds.has(l.id))
            .map((l) => (
              <HazardMarker key={l.id} position={[l.x, l.z]} color={theme.palette.error.main} />
            ))}

          <OrbitControls
            target={[0, 0, 0]}
            enablePan={false}
            minDistance={6}
            maxDistance={camDist + 24}
            maxPolarAngle={Math.PI / 2.2}
          />
        </Canvas>
      </Box>

      {selected && (
        <HabitatDialog
          habitat={selected}
          residents={dinosaurs.filter((d) => d.habitat_id === selected.id && d.alive)}
          conditions={activeEffects.filter((e) => e.habitat_id === selected.id)}
          onStock={onStock}
          onInspectDino={onInspectDino}
          onClose={() => setSelectedId(null)}
        />
      )}
    </Box>
  );
}
