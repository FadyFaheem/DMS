import { useState } from 'react';
import { Alert, Box, Button, Paper, Snackbar, Stack, TextField, Typography } from '@mui/material';
import { useGame } from '../context/PlayerContext';

export default function ProfilePage() {
  const { player, login } = useGame();
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      await login(code.trim());
      setLoginError(null);
    } catch {
      setLoginError('That code did not match any park.');
    }
  };

  const copyCode = async () => {
    if (!player) return;
    await navigator.clipboard.writeText(player.player_code);
    setCopied(true);
  };

  return (
    <Box sx={{ maxWidth: 560 }}>
      <Typography variant="h4" gutterBottom>
        Profile
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Your park code
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Save this code to log in on another device. Anyone with it can access your park.
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h5" sx={{ fontFamily: 'monospace', letterSpacing: '.1rem' }}>
            {player?.player_code ?? '...'}
          </Typography>
          <Button size="small" variant="outlined" onClick={copyCode}>
            Copy
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Load a park
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter a code from another device to switch to that park.
        </Typography>
        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            size="small"
            label="Park code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button variant="contained" onClick={handleLogin} disabled={!code.trim()}>
            Load
          </Button>
        </Stack>
        {loginError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {loginError}
          </Alert>
        )}
      </Paper>

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="Code copied"
      />
    </Box>
  );
}
