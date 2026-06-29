import { useEffect } from 'react';
import { Box, Paper, Typography } from '@mui/material';

export default function DashboardPage() {
  useEffect(() => {
    document.title = 'Dashboard';
  }, []);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome
      </Typography>
      <Paper sx={{ p: 3, maxWidth: 720 }}>
        <Typography variant="body2" color="text.secondary">
          This is a placeholder dashboard. Replace it with your application's home view in{' '}
          <code>frontend/src/pages/DashboardPage.tsx</code>.
        </Typography>
      </Paper>
    </Box>
  );
}
