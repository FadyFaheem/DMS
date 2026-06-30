import { useState } from 'react';
import {
  Alert,
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

interface Props {
  habitat: Habitat;
  residents: Dinosaur[];
  conditions: ActiveEffect[];
  onStock: (habitatId: number, amount: number) => Promise<void>;
  onInspectDino?: (dino: Dinosaur) => void;
  onClose: () => void;
}

// Shared habitat detail/stock dialog used by both the 2D ParkMap and the 3D
// ParkScene so the stock + residents UX stays identical across views.
export default function HabitatDialog({
  habitat,
  residents,
  conditions,
  onStock,
  onInspectDino,
  onClose,
}: Props) {
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
