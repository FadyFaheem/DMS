import { useEffect, useState, type FormEvent } from 'react';
import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { changePassword } from '../api/auth';

export default function ChangePasswordPage() {
  useEffect(() => { document.title = 'Change Password'; }, []);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPw !== confirmPw) {
      setError('New passwords do not match');
      return;
    }
    if (newPw.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPw, newPw);
      setSuccess('Password changed successfully');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Change Password</Typography>
      <Paper sx={{ p: 3, maxWidth: 480 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Current Password"
            type="password"
            autoComplete="current-password"
            required
            fullWidth
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
          />
          <TextField
            label="New Password"
            type="password"
            autoComplete="new-password"
            required
            fullWidth
            inputProps={{ minLength: 8 }}
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
          />
          <TextField
            label="Confirm New Password"
            type="password"
            autoComplete="new-password"
            required
            fullWidth
            inputProps={{ minLength: 8 }}
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
          />
          <Button type="submit" variant="contained" size="large" disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
