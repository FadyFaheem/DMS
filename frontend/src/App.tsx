import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress, CssBaseline, ThemeProvider, Typography } from '@mui/material';
import { PlayerProvider, useGame } from './context/PlayerContext';
import AppLayout from './components/AppLayout';
import ParkDashboardPage from './pages/ParkDashboardPage';
import HabitatsPage from './pages/HabitatsPage';
import SpeciesPage from './pages/SpeciesPage';
import ResearchPage from './pages/ResearchPage';
import ProductionPage from './pages/ProductionPage';
import ProfilePage from './pages/ProfilePage';
import { appTheme } from './theme/theme';

function GameRoutes() {
  const { loading, player, error } = useGame();

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '100dvh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!player) {
    return (
      <Box
        sx={{ display: 'grid', placeItems: 'center', height: '100dvh', p: 3, textAlign: 'center' }}
      >
        <Typography color="error">{error ?? 'Unable to load your park.'}</Typography>
      </Box>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<ParkDashboardPage />} />
        <Route path="habitats" element={<HabitatsPage />} />
        <Route path="species" element={<SpeciesPage />} />
        <Route path="research" element={<ResearchPage />} />
        <Route path="production" element={<ProductionPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <BrowserRouter>
        <PlayerProvider>
          <GameRoutes />
        </PlayerProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
