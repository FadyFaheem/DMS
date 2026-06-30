import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MobileStepper,
  Typography,
} from '@mui/material';

const SEEN_KEY = 'dpm_tutorial_done';

// Guided first-session onboarding (spec §9). Walks a new keeper through the core
// loop once, then remembers it was seen so it never nags again.
const STEPS: { title: string; body: string }[] = [
  {
    title: 'Welcome to your park',
    body: 'You run a dinosaur park. Keep your dinos fed, healthy, and happy while you grow and earn currency over time.',
  },
  {
    title: 'Care for your dinosaurs',
    body: 'Each dino has health, hunger, and happiness. Feed them and open the inspector to check genetics, temperature comfort, and lineage.',
  },
  {
    title: 'Manage habitats on the map',
    body: 'The park map shows every habitat. Click a tile to see its climate and active events, stock grazing plants, and view residents.',
  },
  {
    title: 'Breed for better genetics',
    body: 'Pair two compatible dinos to breed. The preview shows likely species, mutation odds, and the offspring genetics (IV) range before you commit.',
  },
  {
    title: 'Research, expand, and earn',
    body: 'Unlock research to build farms, structures, and attractions. Attractions and your dinos generate passive income each game-day.',
  },
  {
    title: 'Chase goals and prestige',
    body: 'Complete goals for rewards and build a legendary park to win. Prestige to start New Game+ with a permanent income bonus.',
  },
];

export default function Tutorial() {
  const [open, setOpen] = useState(() => localStorage.getItem(SEEN_KEY) !== '1');
  const [step, setStep] = useState(0);

  const close = () => {
    localStorage.setItem(SEEN_KEY, '1');
    setOpen(false);
  };

  const last = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>{current.title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          {current.body}
        </Typography>
        <Box sx={{ mt: 2 }}>
          <MobileStepper
            variant="dots"
            steps={STEPS.length}
            position="static"
            activeStep={step}
            nextButton={
              last ? (
                <Button size="small" variant="contained" onClick={close}>
                  Start playing
                </Button>
              ) : (
                <Button size="small" onClick={() => setStep((s) => s + 1)}>
                  Next
                </Button>
              )
            }
            backButton={
              <Button size="small" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            }
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button size="small" onClick={close}>
          Skip
        </Button>
      </DialogActions>
    </Dialog>
  );
}
