import { createTheme } from '@mui/material/styles';

// Adjust these to your project's brand. Keep the structural overrides at the
// bottom -- they handle mobile fullscreen dialogs and compact table cells.
export const BRAND_COLORS = {
  primary: '#1976d2',
  primaryDark: '#115293',
  primaryLight: '#4791db',
  secondary: '#dc004e',
  secondaryDark: '#9a0036',
  secondaryLight: '#e33371',
  white: '#FFFFFF',
  lightGray: '#F5F5F5',
  mediumGray: '#9E9E9E',
  darkGray: '#212121',
} as const;

export const chartSeriesColors = [
  BRAND_COLORS.primary,
  BRAND_COLORS.secondary,
  BRAND_COLORS.darkGray,
  BRAND_COLORS.mediumGray,
] as const;

const BASE_THEME = createTheme();

export const appTheme = createTheme({
  palette: {
    primary: {
      main: BRAND_COLORS.primary,
      dark: BRAND_COLORS.primaryDark,
      light: BRAND_COLORS.primaryLight,
      contrastText: BRAND_COLORS.white,
    },
    secondary: {
      main: BRAND_COLORS.secondary,
      dark: BRAND_COLORS.secondaryDark,
      light: BRAND_COLORS.secondaryLight,
      contrastText: BRAND_COLORS.white,
    },
    text: {
      primary: BRAND_COLORS.darkGray,
      secondary: BRAND_COLORS.mediumGray,
    },
    background: {
      default: BRAND_COLORS.white,
      paper: BRAND_COLORS.white,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          color: BRAND_COLORS.darkGray,
          backgroundColor: BRAND_COLORS.white,
        },
      },
    },
    // Full-screen dialogs on mobile -- matches mobile-first UX patterns.
    MuiDialog: {
      styleOverrides: {
        root: {
          [BASE_THEME.breakpoints.down('sm')]: {
            '& .MuiDialog-paper': {
              margin: 0,
              width: '100%',
              maxWidth: '100%',
              maxHeight: '100%',
              height: '100%',
              borderRadius: 0,
            },
          },
        },
      },
    },
    // Compact table cells on mobile so data fits without horizontal scroll.
    MuiTableCell: {
      styleOverrides: {
        root: {
          [BASE_THEME.breakpoints.down('sm')]: {
            padding: '6px 8px',
            fontSize: '0.8125rem',
          },
        },
      },
    },
  },
});
