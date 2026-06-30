// Brand palette shared across the WebGL UI (bridged into uikit's theme; see
// webgl/uikitTheme.ts). The app no longer uses MUI, so this is plain data.
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
