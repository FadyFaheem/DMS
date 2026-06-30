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
  Typography,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useGame } from '../context/PlayerContext';
import type { ResearchTech } from '../api/players';
import { unlockResearch } from '../api/research';

export default function ResearchPage() {
  const { player, refresh } = useGame();
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  if (!player) return null;
  const research = player.research;
  const unlockedKeys = new Set(research.unlocked);

  const unlock = async (key: string) => {
    setBusyKey(key);
    setError(null);
    try {
      await unlockResearch(key);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Research
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Unlock technologies to build food production and expand your park.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Grid container spacing={2}>
        {research.catalog.map((tech) => (
          <Grid key={tech.key} size={{ xs: 12, sm: 6, md: 4 }}>
            <TechCard
              tech={tech}
              unlockedKeys={unlockedKeys}
              currency={player.currency}
              population={player.summary.population}
              busy={busyKey === tech.key}
              onUnlock={() => unlock(tech.key)}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

function TechCard({
  tech,
  unlockedKeys,
  currency,
  population,
  busy,
  onUnlock,
}: {
  tech: ResearchTech;
  unlockedKeys: Set<string>;
  currency: number;
  population: number;
  busy: boolean;
  onUnlock: () => void;
}) {
  const missingPrereqs = tech.prerequisites.filter((p) => !unlockedKeys.has(p));
  const needsPopulation = tech.requires_population > population;
  const affordable = currency >= tech.cost;
  const canUnlock = !tech.unlocked && missingPrereqs.length === 0 && !needsPopulation && affordable;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{tech.name}</Typography>
          {tech.unlocked ? (
            <Chip size="small" color="success" icon={<CheckCircleIcon />} label="Unlocked" />
          ) : (
            <Chip size="small" icon={<LockIcon />} label={tech.cost.toLocaleString()} />
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {tech.description}
        </Typography>
        {missingPrereqs.length > 0 && (
          <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 1 }}>
            Requires: {missingPrereqs.join(', ')}
          </Typography>
        )}
        {needsPopulation && (
          <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 0.5 }}>
            Requires {tech.requires_population} living dinosaurs
          </Typography>
        )}
        {!tech.unlocked && (
          <Button
            sx={{ mt: 1.5 }}
            variant="contained"
            size="small"
            disabled={!canUnlock || busy}
            onClick={onUnlock}
          >
            {affordable ? 'Unlock' : 'Too expensive'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
