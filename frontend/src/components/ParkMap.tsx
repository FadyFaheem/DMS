import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import GrassIcon from '@mui/icons-material/Grass';
import type { ActiveEffect, Dinosaur, Habitat } from '../api/players';
import { effectImpactLabel, effectLabel } from '../utils/effects';
import DinoPortrait from './DinoPortrait';

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

function HabitatDialog({
  habitat,
  residents,
  conditions,
  onStock,
  onInspectDino,
  onClose,
}: {
  habitat: Habitat;
  residents: Dinosaur[];
  conditions: ActiveEffect[];
  onStock: (habitatId: number, amount: number) => Promise<void>;
  onInspectDino?: (dino: Dinosaur) => void;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stock = async () => {
    setBusy(true);
    setError(null);
    try {
      await onStock(habitat.id, amount);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{habitat.name}</DialogTitle>
      <DialogContent>
        <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
          <Chip size="small" label={habitat.terrain} />
          <Chip size="small" icon={<ThermostatIcon />} label={`${habitat.temperature ?? '?'}°C`} />
          <Chip size="small" icon={<WaterDropIcon />} label={`${habitat.humidity ?? '?'}%`} />
          <Chip
            size="small"
            icon={<GrassIcon />}
            label={`Stockpile ${habitat.food_stockpile ?? 0}`}
          />
        </Stack>
        {habitat.feature_label && (
          <Typography variant="body2" color="text.secondary">
            {habitat.feature_label}
          </Typography>
        )}

        {conditions.length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
            {conditions.map((effect) => (
              <Chip
                key={effect.id}
                size="small"
                color="error"
                label={`${effectLabel(effect)} ${effectImpactLabel(effect)}`}
              />
            ))}
          </Stack>
        )}

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" gutterBottom>
          Stock grazing plants
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            type="number"
            label="Plants"
            value={amount}
            onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
            sx={{ width: 120 }}
          />
          <Button variant="contained" disabled={busy} onClick={stock}>
            Stock
          </Button>
        </Stack>
        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" gutterBottom>
          Residents ({residents.length})
        </Typography>
        {residents.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No dinosaurs here yet.
          </Typography>
        ) : (
          <Stack spacing={0.5}>
            {residents.map((dino) => (
              <Stack
                key={dino.id}
                direction="row"
                spacing={1}
                alignItems="center"
                onClick={() => onInspectDino?.(dino)}
                sx={{ cursor: onInspectDino ? 'pointer' : 'default' }}
              >
                <DinoPortrait species={dino.species} color={dino.color} id={dino.id} size={28} />
                <Typography variant="body2">{dino.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {dino.species} · {Math.round(dino.health)} hp
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
