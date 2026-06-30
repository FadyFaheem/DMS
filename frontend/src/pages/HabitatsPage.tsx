import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useGame } from '../context/PlayerContext';
import { buildHabitat, upgradeHabitat } from '../api/habitats';
import { effectImpactLabel, effectLabel } from '../utils/effects';

const TERRAINS = ['forest', 'grassland', 'wetland', 'volcanic', 'aquatic'];

export default function HabitatsPage() {
  const { player, refresh } = useGame();
  const [terrain, setTerrain] = useState('grassland');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [upBusy, setUpBusy] = useState<number | null>(null);

  if (!player) return null;

  const canUpgrade = player.research.unlocked.includes('habitat_expansion');
  const effects = player.active_effects ?? [];

  const build = async () => {
    setBusy(true);
    setError(null);
    try {
      await buildHabitat(terrain, name || undefined);
      setName('');
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const upgrade = async (id: number) => {
    setUpBusy(id);
    setError(null);
    try {
      await upgradeHabitat(id);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUpBusy(null);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Habitats
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Build a habitat
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Select size="small" value={terrain} onChange={(e) => setTerrain(e.target.value)}>
              {TERRAINS.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
            <TextField
              size="small"
              label="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button variant="contained" disabled={busy} onClick={build}>
              Build
            </Button>
          </Stack>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {player.habitats.map((habitat) => {
          const residents = player.dinosaurs.filter((d) => d.habitat_id === habitat.id && d.alive);
          const conditions = effects.filter((e) => e.habitat_id === habitat.id);
          const crowded = habitat.living_count > habitat.capacity * 0.8;
          return (
            <Grid key={habitat.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">{habitat.name}</Typography>
                    <Stack direction="row" spacing={0.5}>
                      <Chip size="small" color="primary" label={`Lvl ${habitat.level}`} />
                      <Chip size="small" label={habitat.terrain} />
                    </Stack>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {habitat.living_count} / {habitat.capacity} dinosaurs
                  </Typography>
                  <LinearProgress
                    sx={{ mt: 1 }}
                    variant="determinate"
                    value={Math.min(100, (habitat.living_count / habitat.capacity) * 100)}
                    color={habitat.living_count > habitat.capacity ? 'error' : 'primary'}
                  />
                  {(conditions.length > 0 || crowded) && (
                    <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                      {crowded && <Chip size="small" color="warning" label="Crowded" />}
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
                  <Box sx={{ mt: 1 }}>
                    {residents.map((d) => (
                      <Chip key={d.id} size="small" label={d.name} sx={{ mr: 0.5, mb: 0.5 }} />
                    ))}
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ mt: 1 }}
                    disabled={!canUpgrade || upBusy === habitat.id}
                    onClick={() => upgrade(habitat.id)}
                  >
                    {canUpgrade ? 'Upgrade' : 'Needs Habitat Expansion'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
