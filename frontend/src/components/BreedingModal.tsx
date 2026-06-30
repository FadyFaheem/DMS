import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import type { Dinosaur } from '../api/players';
import { claimBreeding, listBreedings, startBreeding } from '../api/breeding';
import type { Breeding } from '../api/breeding';

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
