import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useGame } from '../context/PlayerContext';
import type { SpeciesCatalogEntry } from '../api/players';
import { acquireSpecies } from '../api/species';

const ALL = 'All';

export default function SpeciesPage() {
  const { player, refresh } = useGame();
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>(ALL);

  if (!player) return null;
  const species = player.species ?? { periods: [], catalog: [] };
  const unlockedTech = new Set(player.research?.unlocked ?? []);

  const acquire = async (key: string) => {
    setBusyKey(key);
    setError(null);
    try {
      await acquireSpecies(key);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyKey(null);
    }
  };

  const visible = species.catalog.filter((s) => period === ALL || s.period === period);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Species
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Acquire dinosaurs across the Triassic, Jurassic, and Cretaceous. Some species need research
        or a larger park before you can bring them in.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <ToggleButtonGroup
        size="small"
        exclusive
        value={period}
        onChange={(_event, value) => value && setPeriod(value)}
        sx={{ mb: 2, flexWrap: 'wrap' }}
      >
        <ToggleButton value={ALL}>All</ToggleButton>
        {species.periods.map((p) => (
          <ToggleButton key={p} value={p}>
            {p}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Grid container spacing={2}>
        {visible.map((entry) => (
          <Grid key={entry.key} size={{ xs: 12, sm: 6, md: 4 }}>
            <SpeciesCard
              entry={entry}
              techUnlocked={!entry.required_tech || unlockedTech.has(entry.required_tech)}
              population={player.summary.population}
              currency={player.currency}
              busy={busyKey === entry.key}
              onAcquire={() => acquire(entry.key)}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

function SpeciesCard({
  entry,
  techUnlocked,
  population,
  currency,
  busy,
  onAcquire,
}: {
  entry: SpeciesCatalogEntry;
  techUnlocked: boolean;
  population: number;
  currency: number;
  busy: boolean;
  onAcquire: () => void;
}) {
  const needsPopulation = entry.requires_population > population;
  const affordable = currency >= entry.acquire_cost;
  const canAcquire = techUnlocked && !needsPopulation && affordable;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{entry.name}</Typography>
          {entry.unlocked ? (
            <Chip size="small" color="success" icon={<CheckCircleIcon />} label="Unlocked" />
          ) : (
            <Chip size="small" icon={<LockIcon />} label={entry.acquire_cost.toLocaleString()} />
          )}
        </Stack>
        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
          <Chip size="small" label={entry.period} />
          <Chip size="small" label={entry.diet_primary} />
          <Chip size="small" label={entry.preferred_terrain} />
          <Chip size="small" variant="outlined" label={entry.rarity} />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {entry.owned_count > 0 ? `You own ${entry.owned_count}` : 'None in your park'}
        </Typography>
        {!techUnlocked && entry.required_tech && (
          <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 1 }}>
            Requires: {entry.required_tech}
          </Typography>
        )}
        {needsPopulation && (
          <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 0.5 }}>
            Requires {entry.requires_population} living dinosaurs
          </Typography>
        )}
        <Button
          sx={{ mt: 1.5 }}
          variant="contained"
          size="small"
          disabled={!canAcquire || busy}
          onClick={onAcquire}
        >
          {affordable ? `Acquire (${entry.acquire_cost.toLocaleString()})` : 'Too expensive'}
        </Button>
      </CardContent>
    </Card>
  );
}
