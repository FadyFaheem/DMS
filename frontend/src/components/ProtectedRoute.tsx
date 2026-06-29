import { Navigate, Outlet } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../context/AuthContext';

interface Props {
  children?: React.ReactNode;
  requireAdmin?: boolean;
  requirePerm?: string | string[];
}

export default function ProtectedRoute({ children, requireAdmin, requirePerm }: Props) {
  const { isAuthenticated, isAdmin, loading, hasPerm } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;

  if (requirePerm) {
    const keys = Array.isArray(requirePerm) ? requirePerm : [requirePerm];
    if (!hasPerm(...keys)) return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
