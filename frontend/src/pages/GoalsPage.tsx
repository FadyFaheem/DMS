import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useGame } from '../context/PlayerContext';
import type { Goal } from '../api/players';
import { prestige } from '../api/prestige';

export default function GoalsPage() {
  const { player, refresh } = useGame();
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!player) return null;
  const goals = player.goals ?? { completed: 0, total: 0, catalog: [] };
  const prestigeState = player.prestige ?? {
    level: 0,
    multiplier: 1,
    won: false,
    can_prestige: false,
  };

  const doPrestige = async () => {
    setBusy(true);
    setError(null);
    try {
      await prestige();
      await refresh();
      setConfirmOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Goals &amp; Achievements
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Hit milestones to earn currency rewards, then build a legendary park to win and prestige.
      </Typography>

      {prestigeState.won && (
        <Alert
          icon={<EmojiEventsIcon fontSize="inherit" />}
          severity="success"
          sx={{ mb: 2 }}
          data-testid="win-banner"
        >
          You&apos;ve built a legendary park and won the game! Prestige to start New Game+ with a
          permanent income bonus.
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
        >
          <Box>
            <Typography variant="h6">Prestige level {prestigeState.level}</Typography>
            <Typography variant="body2" color="text.secondary">
              Income multiplier ×{prestigeState.multiplier.toFixed(2)} · {goals.completed}/
              {goals.total} achievements
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AutoAwesomeIcon />}
            disabled={!prestigeState.can_prestige}
            onClick={() => setConfirmOpen(true)}
          >
            {prestigeState.can_prestige ? 'Prestige (New Game+)' : 'Win to Prestige'}
          </Button>
        </Stack>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      <Grid container spacing={2}>
        {goals.catalog.map((goal) => (
          <Grid key={goal.key} size={{ xs: 12, sm: 6, md: 4 }}>
            <GoalCard goal={goal} />
          </Grid>
        ))}
      </Grid>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Start New Game+?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Prestiging resets your park — every dinosaur, habitat, structure, and research is wiped
            and a fresh starter park is seeded. In return you keep a permanent income bonus
            (prestige level {prestigeState.level + 1}). This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" color="secondary" disabled={busy} onClick={doPrestige}>
            Prestige
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const pct = Math.max(0, Math.min(100, (goal.current / goal.threshold) * 100));
  const boolean = goal.threshold === 1;

  return (
    <Card sx={{ height: '100%', borderTop: goal.win ? 3 : 0, borderColor: 'secondary.main' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="h6">{goal.name}</Typography>
          {goal.completed ? (
            <Chip size="small" color="success" icon={<CheckCircleIcon />} label="Done" />
          ) : (
            goal.win && <Chip size="small" color="secondary" label="Win" />
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
          {goal.description}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={pct}
          color={goal.completed ? 'success' : 'primary'}
        />
        <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {boolean
              ? goal.completed
                ? 'Complete'
                : 'In progress'
              : `${goal.current}/${goal.threshold}`}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Reward {goal.reward.toLocaleString()}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
