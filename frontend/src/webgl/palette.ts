import type { TerrainPalette } from '../components/park3d/parkLayout';
import { BRAND_COLORS } from '../theme/theme';

// World/scene colors for the 3D park. Centralized here so the look can be tuned
// in one place (MUI theme context can't reach inside the R3F canvas).
export const TERRAIN_PALETTE: TerrainPalette = {
  success: '#5a9e5a', // forest
  warning: '#c9a24b', // grassland
  info: '#5a8fb0', // wetland
  primary: BRAND_COLORS.primary, // aquatic
  error: '#b5532f', // volcanic
  fallback: '#8a8a8a',
};

export const HAZARD_COLOR = '#d32f2f';
export const CROWDED_COLOR = '#ed6c02';
export const GROUND_COLOR = '#cdd3c8';
export const SCENE_BG = '#afc7d6';
