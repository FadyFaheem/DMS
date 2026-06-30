import { useState } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import type { ActiveEffect, Dinosaur, Habitat } from '../api/players';
import HabitatDialog from './HabitatDialog';

// Terrain -> theme palette token (kept as theme references, never raw hex, so a
// rebrand only touches the theme).
const TERRAIN_BG: Record<string, string> = {
  forest: 'success.light',
  grassland: 'warning.light',
  wetland: 'info.light',
  volcanic: 'error.light',
  aquatic: 'primary.light',
};

interface Props {
  habitats: Habitat[];
  dinosaurs: Dinosaur[];
  activeEffects: ActiveEffect[];
  onStock: (habitatId: number, amount: number) => Promise<void>;
  onInspectDino?: (dino: Dinosaur) => void;
}

export default function ParkMap({
  habitats,
  dinosaurs,
  activeEffects,
  onStock,
  onInspectDino,
}: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = habitats.find((h) => h.id === selectedId) ?? null;

  if (habitats.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        No habitats yet — build one to populate the map.
      </Typography>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Park Map
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
        }}
      >
        {habitats.map((habitat) => {
          const conditions = activeEffects.filter((e) => e.habitat_id === habitat.id);
          const crowded = habitat.living_count > habitat.capacity * 0.8;
          return (
            <Box
              key={habitat.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedId(habitat.id)}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedId(habitat.id)}
              sx={{
                cursor: 'pointer',
                p: 1.5,
                borderRadius: 2,
                minHeight: 96,
                bgcolor: TERRAIN_BG[habitat.terrain] ?? 'grey.300',
                color: 'common.white',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                outline: conditions.length > 0 ? '2px solid' : 'none',
                outlineColor: 'error.main',
                transition: 'transform 0.1s ease',
                '&:hover': { transform: 'translateY(-2px)' },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                  {habitat.name}
                </Typography>
                {conditions.length > 0 && <Chip size="small" color="error" label="!" />}
              </Stack>
              <Box>
                <Typography variant="caption" display="block">
                  {habitat.terrain}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption">
                    {habitat.living_count}/{habitat.capacity}
                  </Typography>
                  {habitat.temperature != null && (
                    <Typography variant="caption">{habitat.temperature}°C</Typography>
                  )}
                  {crowded && <Chip size="small" color="warning" label="full" />}
                </Stack>
              </Box>
            </Box>
          );
        })}
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
