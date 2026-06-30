import { useCallback, useEffect, useState } from 'react';
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
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import type { Dinosaur } from '../api/players';
import { claimBreeding, listBreedings, previewBreeding, startBreeding } from '../api/breeding';
import type { Breeding, BreedingPreview } from '../api/breeding';

// Mutations a genetic engineering lab can request (mirrors Genetics::MUTATIONS).
const TRAITS = ['shiny', 'giant', 'dwarf'];

interface Props {
  open: boolean;
  dinos: Dinosaur[];
  traitSelectionUnlocked?: boolean;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}

export default function BreedingModal({
  open,
  dinos,
  traitSelectionUnlocked = false,
  onClose,
  onChanged,
}: Props) {
  const [parentA, setParentA] = useState<number | ''>('');
  const [parentB, setParentB] = useState<number | ''>('');
  const [trait, setTrait] = useState<string>('');
  const [breedings, setBreedings] = useState<Breeding[]>([]);
  const [preview, setPreview] = useState<BreedingPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setBreedings(await listBreedings());
    } catch {
      // Non-fatal: the hatchery list just stays empty.
    }
  }, []);

  useEffect(() => {
    // Refresh the hatchery whenever the modal opens (async; no sync cascade).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    if (parentA === '' || parentB === '' || parentA === parentB) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreview(null);
      return;
    }
    let active = true;
    previewBreeding(Number(parentA), Number(parentB))
      .then((result) => active && setPreview(result))
      .catch(() => active && setPreview(null));
    return () => {
      active = false;
    };
  }, [parentA, parentB]);

  const alive = dinos.filter((d) => d.alive);

  const start = async () => {
    if (parentA === '' || parentB === '') return;
    setBusy(true);
    setError(null);
    try {
      await startBreeding(Number(parentA), Number(parentB), trait || undefined);
      setParentA('');
      setParentB('');
      setTrait('');
      await load();
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const claim = async (id: number) => {
    setBusy(true);
    setError(null);
    try {
      await claimBreeding(id);
      await load();
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Breeding</DialogTitle>
      <DialogContent>
        <Typography variant="subtitle2" gutterBottom>
          Start a new breeding
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1 }}>
          <Select
            size="small"
            fullWidth
            displayEmpty
            value={parentA}
            onChange={(e) => setParentA(Number(e.target.value))}
          >
            <MenuItem value="" disabled>
              Parent A
            </MenuItem>
            {alive.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.name} ({d.gender})
              </MenuItem>
            ))}
          </Select>
          <Select
            size="small"
            fullWidth
            displayEmpty
            value={parentB}
            onChange={(e) => setParentB(Number(e.target.value))}
          >
            <MenuItem value="" disabled>
              Parent B
            </MenuItem>
            {alive.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.name} ({d.gender})
              </MenuItem>
            ))}
          </Select>
          <Button
            variant="contained"
            disabled={busy || parentA === '' || parentB === '' || parentA === parentB}
            onClick={start}
          >
            Breed
          </Button>
        </Stack>
        {traitSelectionUnlocked && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Engineered trait
            </Typography>
            <Select
              size="small"
              displayEmpty
              value={trait}
              onChange={(e) => setTrait(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">Natural (random)</MenuItem>
              {TRAITS.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </Stack>
        )}
        {preview && <BreedingPredictionPanel preview={preview} />}

        {error && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}

        <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>
          Hatchery
        </Typography>
        {breedings.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No active breedings.
          </Typography>
        ) : (
          <List dense>
            {breedings.map((br) => (
              <ListItem
                key={br.id}
                secondaryAction={
                  br.status === 'incubating' ? (
                    <Button size="small" disabled={busy || !br.ready} onClick={() => claim(br.id)}>
                      {br.ready ? 'Claim' : 'Incubating'}
                    </Button>
                  ) : (
                    <Chip size="small" label={br.status} />
                  )
                }
              >
                <ListItemText
                  primary={`#${br.parent_a_id} × #${br.parent_b_id}`}
                  secondary={
                    br.status === 'incubating'
                      ? `Hatches ${new Date(br.hatches_at).toLocaleString()}`
                      : `Offspring #${br.offspring_id}`
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function BreedingPredictionPanel({ preview }: { preview: BreedingPreview }) {
  return (
    <Box
      sx={{ mb: 1, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}
      data-testid="breeding-prediction"
    >
      <Typography variant="subtitle2" gutterBottom>
        Predicted offspring
      </Typography>
      {!preview.compatible ? (
        <Alert severity="warning">{preview.reason ?? 'These dinosaurs cannot breed.'}</Alert>
      ) : (
        <Stack spacing={0.75}>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center">
            <Typography variant="caption" color="text.secondary">
              Species:
            </Typography>
            {preview.species_options.map((option) => (
              <Chip
                key={option.key}
                size="small"
                label={`${option.name ?? option.key} ${Math.round(option.chance * 100)}%`}
              />
            ))}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Mutation chance: {Math.round(preview.mutation_chance * 100)}% ·{' '}
            {preview.possible_traits.join(', ')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Genetics (IV): {preview.genetics_quality.min}–{preview.genetics_quality.max} (expected{' '}
            {preview.genetics_quality.expected})
          </Typography>
          <Divider />
          <Typography variant="caption" color="text.secondary">
            Cost: {preview.cost.toLocaleString()} · Generation {preview.expected_generation}
          </Typography>
        </Stack>
      )}
    </Box>
  );
}
