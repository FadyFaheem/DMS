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
  DialogTitle,
  Divider,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useGame } from '../context/PlayerContext';
import type { Dinosaur, ParkEvent } from '../api/players';
import { feedDino } from '../api/dinosaurs';
import { buyFood } from '../api/food';
import { statusColor } from '../utils/status';
import { formatDateTime } from '../utils/dateFormat';
import DinoInspector from '../components/DinoInspector';
import BreedingModal from '../components/BreedingModal';

export default function ParkDashboardPage() {
  const { player, refresh } = useGame();
  const [inspected, setInspected] = useState<Dinosaur | null>(null);
  const [breedOpen, setBreedOpen] = useState(false);
  const [foodOpen, setFoodOpen] = useState(false);

  if (!player) return null;
  const summary = player.summary;

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
        sx={{ mb: 2 }}
      >
        <Typography variant="h4">{player.display_name}&apos;s Park</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => setFoodOpen(true)}>
            Buy Food
          </Button>
          <Button variant="contained" onClick={() => setBreedOpen(true)}>
            Breed
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <SummaryCard label="Population" value={summary.population} />
        <SummaryCard label="Avg Health" value={summary.avg_health} />
        <SummaryCard label="Critical" value={summary.critical} />
        <SummaryCard
          label="Food P/M/F"
          value={`${player.food.plants}/${player.food.meat}/${player.food.fish}`}
        />
      </Grid>

      <Typography variant="h6" gutterBottom>
        Dinosaurs
      </Typography>
      {player.dinosaurs.length === 0 && (
        <Typography color="text.secondary">No dinosaurs yet.</Typography>
      )}
      <Grid container spacing={2}>
        {player.dinosaurs.map((dino) => (
          <Grid key={dino.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <DinoCard
              dino={dino}
              onFeed={async () => {
                await feedDino(dino.id, dino.diet_primary);
                await refresh();
              }}
              onInspect={() => setInspected(dino)}
            />
          </Grid>
        ))}
      </Grid>

      <RecentActivity events={player.events ?? []} />

      <DinoInspector
        dino={inspected}
        habitats={player.habitats}
        onClose={() => setInspected(null)}
        onChanged={async () => {
          await refresh();
          setInspected(null);
        }}
      />
      <BreedingModal
        open={breedOpen}
        dinos={player.dinosaurs}
        onClose={() => setBreedOpen(false)}
        onChanged={refresh}
      />
      <BuyFoodDialog open={foodOpen} onClose={() => setFoodOpen(false)} onBought={refresh} />
    </Box>
  );
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Grid size={{ xs: 6, md: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="overline" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h5">{value}</Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}

function eventColor(kind: string): 'success' | 'error' | 'info' | 'primary' | 'default' {
  switch (kind) {
    case 'birth':
      return 'success';
    case 'death':
      return 'error';
    case 'research':
      return 'info';
    case 'build':
    case 'upgrade':
      return 'primary';
    default:
      return 'default';
  }
}

function RecentActivity({ events }: { events: ParkEvent[] }) {
  if (events.length === 0) return null;
  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Recent Activity
      </Typography>
      <Card>
        <List dense disablePadding>
          {events.map((event, index) => (
            <Box key={event.id}>
              {index > 0 && <Divider component="li" />}
              <ListItem
                secondaryAction={
                  <Chip size="small" label={event.kind} color={eventColor(event.kind)} />
                }
              >
                <ListItemText
                  primary={event.message}
                  secondary={formatDateTime(event.created_at)}
                />
              </ListItem>
            </Box>
          ))}
        </List>
      </Card>
    </Box>
  );
}

function DinoCard({
  dino,
  onFeed,
  onInspect,
}: {
  dino: Dinosaur;
  onFeed: () => Promise<void>;
  onInspect: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const feed = async () => {
    setBusy(true);
    try {
      await onFeed();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1" noWrap>
            {dino.name}
          </Typography>
          <Chip size="small" label={dino.status} color={statusColor(dino.status)} />
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {dino.species}
        </Typography>
        <Box sx={{ mt: 1 }}>
          <Bar label="Health" value={dino.health} />
          <Bar label="Hunger" value={dino.hunger} invert />
        </Box>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button size="small" variant="contained" disabled={busy} onClick={feed}>
            Feed
          </Button>
          <Button size="small" onClick={onInspect}>
            Inspect
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

function Bar({ label, value, invert }: { label: string; value: number; invert?: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  const good = invert ? pct <= 40 : pct >= 60;
  const mid = invert ? pct <= 70 : pct >= 30;
  const color = good ? 'success' : mid ? 'warning' : 'error';
  return (
    <Box sx={{ mb: 0.5 }}>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="caption">{label}</Typography>
        <Typography variant="caption">{Math.round(value)}</Typography>
      </Stack>
      <LinearProgress variant="determinate" value={pct} color={color} />
    </Box>
  );
}

function BuyFoodDialog({
  open,
  onClose,
  onBought,
}: {
  open: boolean;
  onClose: () => void;
  onBought: () => Promise<void> | void;
}) {
  const [type, setType] = useState('plants');
  const [qty, setQty] = useState(20);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const buy = async () => {
    setBusy(true);
    setError(null);
    try {
      await buyFood(type, qty);
      await onBought();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Buy Food</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1, minWidth: 240 }}>
          <Select size="small" value={type} onChange={(e) => setType(e.target.value)}>
            <MenuItem value="plants">Plants</MenuItem>
            <MenuItem value="meat">Meat</MenuItem>
            <MenuItem value="fish">Fish</MenuItem>
          </Select>
          <TextField
            size="small"
            type="number"
            label="Quantity"
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={busy} onClick={buy}>
          Buy
        </Button>
      </DialogActions>
    </Dialog>
  );
}
