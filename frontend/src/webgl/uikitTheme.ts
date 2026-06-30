import { setTheme } from '@react-three/uikit-default';
import { BRAND_COLORS } from '../theme/theme';

// Neutral tokens not present in the brand palette (borders/dividers, semantic
// error). Kept here so the WebGL theme has a single source of color.
const BORDER = '#E0E0E0';
const ERROR = '#D32F2F';

// Bridge the MUI brand palette into uikit's (shadcn-style) theme so the WebGL UI
// shares the app's colors instead of hardcoding them per-component.
export function applyUikitTheme(): void {
  setTheme({
    radius: 8,
    background: BRAND_COLORS.white,
    foreground: BRAND_COLORS.darkGray,
    card: BRAND_COLORS.white,
    cardForeground: BRAND_COLORS.darkGray,
    popover: BRAND_COLORS.white,
    popoverForeground: BRAND_COLORS.darkGray,
    primary: BRAND_COLORS.primary,
    primaryForeground: BRAND_COLORS.white,
    secondary: BRAND_COLORS.lightGray,
    secondaryForeground: BRAND_COLORS.darkGray,
    muted: BRAND_COLORS.lightGray,
    mutedForeground: BRAND_COLORS.mediumGray,
    accent: BRAND_COLORS.lightGray,
    accentForeground: BRAND_COLORS.darkGray,
    destructive: ERROR,
    destructiveForeground: BRAND_COLORS.white,
    border: BORDER,
    input: BORDER,
    ring: BRAND_COLORS.primary,
  });
}

applyUikitTheme();
