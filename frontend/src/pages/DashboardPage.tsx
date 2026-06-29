import { useEffect } from 'react';
import { Box, Paper, Typography, Stack, Chip } from '@mui/material';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  useEffect(() => { document.title = 'Dashboard'; }, []);
  const { user, isAdmin } = useAuth();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome{user ? `, ${user.username}` : ''}
      </Typography>
      <Paper sx={{ p: 3, maxWidth: 720 }}>
        <Typography variant="h6" gutterBottom>
          Account
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip label={`Role: ${user?.role ?? 'unknown'}`} size="small" />
          {isAdmin && <Chip label="Admin" color="secondary" size="small" />}
          <Chip label={user?.is_active ? 'Active' : 'Inactive'} size="small" />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          This is a placeholder dashboard. Replace it with your application's
          home view in <code>frontend/src/pages/DashboardPage.tsx</code>.
        </Typography>
      </Paper>
    </Box>
  );
}
