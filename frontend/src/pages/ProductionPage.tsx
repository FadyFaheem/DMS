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
  Stack,
  Typography,
} from '@mui/material';
import { useGame } from '../context/PlayerContext';
import type { ActiveEffect, FoodBuilding, FoodBuildingCatalogEntry } from '../api/players';
import { buildProduction, upgradeProduction } from '../api/production';
import { buildStructure } from '../api/structures';
import { effectImpactLabel, effectLabel } from '../utils/effects';

function storeLabel(column: string | null): string {
  return column ? column.replace('food_', '') : '';
}

export default function ProductionPage() {
  const { player, refresh } = useGame();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (!player) return null;
  const { buildings, catalog } = player.food_productions;
  const advancedUnlocked = player.research.unlocked.includes('advanced_farming');
  const facilities = player.structures?.catalog ?? [];
  const effects = player.active_effects ?? [];

  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await action();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Food Production
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Typography variant="h6" gutterBottom>
        Build
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {catalog.map((entry) => (
          <Grid key={entry.kind} size={{ xs: 12, sm: 6, md: 4 }}>
            <BuildCard
              entry={entry}
              affordable={player.currency >= entry.build_cost}
              busy={busy === `build-${entry.kind}`}
              onBuild={() => run(`build-${entry.kind}`, () => buildProduction(entry.kind))}
            />
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" gutterBottom>
        Your farms
      </Typography>
      {buildings.length === 0 && (
        <Typography color="text.secondary">No farms yet. Build one above.</Typography>
      )}
      <Grid container spacing={2}>
        {buildings.map((building) => (
          <Grid key={building.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <FarmCard
              building={building}
              effects={effects.filter((e) => e.food_production_id === building.id)}
              canUpgrade={advancedUnlocked}
              busy={busy === `up-${building.id}`}
              onUpgrade={() => run(`up-${building.id}`, () => upgradeProduction(building.id))}
            />
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        Facilities
      </Typography>
      <Grid container spacing={2}>
        {facilities.map((facility) => (
          <Grid key={facility.kind} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">{facility.name}</Typography>
                  <Chip size="small" label={facility.cost.toLocaleString()} />
                </Stack>
                {!facility.unlocked && (
                  <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 1 }}>
                    Requires: {facility.required_tech}
                  </Typography>
                )}
                <Button
                  sx={{ mt: 1.5 }}
                  size="small"
                  variant="contained"
                  disabled={
                    facility.built ||
                    !facility.unlocked ||
                    player.currency < facility.cost ||
                    busy === `fac-${facility.kind}`
                  }
                  onClick={() => run(`fac-${facility.kind}`, () => buildStructure(facility.kind))}
                >
                  {facility.built ? 'Built' : 'Build'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

function BuildCard({
  entry,
  affordable,
  busy,
  onBuild,
}: {
  entry: FoodBuildingCatalogEntry;
  affordable: boolean;
  busy: boolean;
  onBuild: () => void;
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{entry.name}</Typography>
          <Chip size="small" label={entry.build_cost.toLocaleString()} />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          +{entry.base_output_per_day}/day {storeLabel(entry.food_column)}
        </Typography>
        {!entry.unlocked && (
          <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 1 }}>
            Requires: {entry.required_tech}
          </Typography>
        )}
        <Button
          sx={{ mt: 1.5 }}
          size="small"
          variant="contained"
          disabled={!entry.unlocked || !affordable || busy}
          onClick={onBuild}
        >
          Build
        </Button>
      </CardContent>
    </Card>
  );
}

function FarmCard({
  building,
  effects,
  canUpgrade,
  busy,
  onUpgrade,
}: {
  building: FoodBuilding;
  effects: ActiveEffect[];
  canUpgrade: boolean;
  busy: boolean;
  onUpgrade: () => void;
}) {
  const preyPct = building.prey_capacity
    ? Math.round((building.prey_population / building.prey_capacity) * 100)
    : 0;
  const preyColor = preyPct <= 20 ? 'error' : preyPct <= 50 ? 'warning' : 'success';
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{building.name}</Typography>
          <Chip size="small" color="primary" label={`Lvl ${building.level}`} />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          +{building.output_per_day}/day {storeLabel(building.food_column)}
        </Typography>
        {building.prey && (
          <Box sx={{ mt: 1 }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">
                Prey pool
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {building.prey_population}/{building.prey_capacity}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, preyPct)}
              color={preyColor}
            />
          </Box>
        )}
        {effects.length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
            {effects.map((effect) => (
              <Chip
                key={effect.id}
                size="small"
                color="warning"
                label={`${effectLabel(effect)} ${effectImpactLabel(effect)}`}
              />
            ))}
          </Stack>
        )}
        <Button
          sx={{ mt: 1.5 }}
          size="small"
          variant="outlined"
          disabled={!canUpgrade || busy}
          onClick={onUpgrade}
        >
          {canUpgrade ? 'Upgrade' : 'Needs Advanced Farming'}
        </Button>
      </CardContent>
    </Card>
  );
}
