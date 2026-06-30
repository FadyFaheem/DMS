import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import type { Dinosaur, Habitat } from '../api/players';
import { feedDino, moveDino, treatDino, quarantineDino } from '../api/dinosaurs';
import { statusColor } from '../utils/status';
import { formatDateTime } from '../utils/dateFormat';

const DIETS = ['plants', 'meat', 'fish', 'insects'];

interface Props {
  dino: Dinosaur | null;
  habitats: Habitat[];
  vetLabBuilt: boolean;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}

export default function DinoInspector({ dino, habitats, vetLabBuilt, onClose, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moveTo, setMoveTo] = useState<number | ''>('');

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer anchor="right" open={dino !== null} onClose={onClose}>
      <Box sx={{ width: { xs: '100vw', sm: 380 }, p: 3 }}>
        {dino && (
          <>
            <Typography variant="h5">{dino.name}</Typography>
            <Typography color="text.secondary" gutterBottom>
              {dino.species} · {dino.period}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={dino.status} color={statusColor(dino.status)} />
              <Chip size="small" label={dino.gender} />
              <Chip size="small" label={`Gen ${dino.generation}`} />
              {dino.mutations.map((m) => (
                <Chip key={m} size="small" color="secondary" label={m} />
              ))}
            </Stack>

            {((dino.diseases ?? []).length > 0 || dino.quarantined) && (
              <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
                {(dino.diseases ?? []).map((d) => (
                  <Chip key={d} size="small" color="error" label={d.replace(/_/g, ' ')} />
                ))}
                {dino.quarantined && <Chip size="small" color="warning" label="quarantined" />}
              </Stack>
            )}

            <StatRow label="Health" value={dino.health} />
            <StatRow label="Hunger" value={dino.hunger} invert />
            <StatRow label="Happiness" value={dino.happiness} />
            <StatRow label="Breeding readiness" value={dino.reproduction_readiness} />

            <Divider sx={{ my: 2 }} />
            <Typography variant="body2">
              Diet: {dino.diet_primary}
              {dino.diet_secondary ? ` / ${dino.diet_secondary}` : ''}
            </Typography>
            <Typography variant="body2">
              Prefers: {dino.preferred_terrain} · {dino.social_structure}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Lineage:{' '}
              {dino.parent_a_id && dino.parent_b_id
                ? `#${dino.parent_a_id} × #${dino.parent_b_id}`
                : 'wild-caught'}
            </Typography>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Feed
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {DIETS.map((d) => (
                <Button
                  key={d}
                  size="small"
                  variant={d === dino.diet_primary ? 'contained' : 'outlined'}
                  disabled={busy}
                  onClick={() => act(() => feedDino(dino.id, d))}
                >
                  {d}
                </Button>
              ))}
            </Stack>

            <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>
              Move to habitat
            </Typography>
            <Stack direction="row" spacing={1}>
              <Select
                size="small"
                fullWidth
                displayEmpty
                value={moveTo}
                onChange={(e) => setMoveTo(Number(e.target.value))}
              >
                <MenuItem value="" disabled>
                  Choose…
                </MenuItem>
                {habitats.map((h) => (
                  <MenuItem key={h.id} value={h.id}>
                    {h.name} ({h.living_count}/{h.capacity})
                  </MenuItem>
                ))}
              </Select>
              <Button
                disabled={busy || moveTo === ''}
                onClick={() => act(() => moveDino(dino.id, Number(moveTo)))}
              >
                Move
              </Button>
            </Stack>

            <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>
              Health
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="contained"
                color="error"
                disabled={busy || !vetLabBuilt || (dino.diseases ?? []).length === 0}
                onClick={() => act(() => treatDino(dino.id))}
              >
                {vetLabBuilt ? 'Treat' : 'Needs Vet Lab'}
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={busy}
                onClick={() => act(() => quarantineDino(dino.id))}
              >
                {dino.quarantined ? 'Release' : 'Quarantine'}
              </Button>
            </Stack>

            {(dino.health_history ?? []).length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>
                  History
                </Typography>
                <Stack spacing={0.5}>
                  {(dino.health_history ?? []).map((entry, index) => (
                    <Typography key={index} variant="caption" color="text.secondary">
                      {entry.action}
                      {entry.diseases?.length ? `: ${entry.diseases.join(', ')}` : ''} —{' '}
                      {formatDateTime(entry.at)}
                    </Typography>
                  ))}
                </Stack>
              </>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
            <Button fullWidth sx={{ mt: 3 }} onClick={onClose}>
              Close
            </Button>
          </>
        )}
      </Box>
    </Drawer>
  );
}

function StatRow({ label, value, invert }: { label: string; value: number; invert?: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  const color = invert
    ? pct <= 40
      ? 'success'
      : pct <= 70
        ? 'warning'
        : 'error'
    : pct >= 60
      ? 'success'
      : pct >= 30
        ? 'warning'
        : 'error';
  return (
    <Box sx={{ mb: 1 }}>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="caption">{label}</Typography>
        <Typography variant="caption">{Math.round(value)}</Typography>
      </Stack>
      <LinearProgress variant="determinate" value={pct} color={color} />
    </Box>
  );
}
