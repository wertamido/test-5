/**
 * Theme Configuration
 * Supports light, dark, and system modes
 */

import { type ColorSchemeName } from 'react-native';

// ─── Colors ────────────────────────────────────────────────────────────────────

export const lightColors = {
  // Primary brand colors
  primary: '#1B4F72',
  primaryDark: '#154360',
  primaryLight: '#2980B9',
  secondary: '#F39C12',
  secondaryDark: '#D68910',
  accent: '#27AE60',

  // Status colors
  success: '#27AE60',
  warning: '#F39C12',
  error: '#E74C3C',
  info: '#3498DB',

  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F8F9FA',
  gray100: '#F1F3F5',
  gray200: '#E9ECEF',
  gray300: '#DEE2E6',
  gray400: '#CED4DA',
  gray500: '#ADB5BD',
  gray600: '#6C757D',
  gray700: '#495057',
  gray800: '#343A40',
  gray900: '#212529',

  // Semantic
  background: '#F8F9FA',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#212529',
  textSecondary: '#6C757D',
  textMuted: '#ADB5BD',
  border: '#DEE2E6',
  divider: '#E9ECEF',
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Map colors
  mapRoute: '#1B4F72',
  mapPickup: '#27AE60',
  mapDelivery: '#E74C3C',

  // Trip status
  statusPending: '#F39C12',
  statusActive: '#3498DB',
  statusCompleted: '#27AE60',
  statusCancelled: '#E74C3C',

  // Transparency
  transparent: 'transparent',
  scrim: 'rgba(0, 0, 0, 0.3)',
};

export const darkColors = {
  // Primary
  primary: '#2980B9',
  primaryDark: '#1B4F72',
  primaryLight: '#5DADE2',
  secondary: '#F39C12',
  secondaryDark: '#D68910',
  accent: '#27AE60',

  // Status
  success: '#27AE60',
  warning: '#F39C12',
  error: '#E74C3C',
  info: '#3498DB',

  // Neutral
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#0D1117',
  gray100: '#161B22',
  gray200: '#21262D',
  gray300: '#30363D',
  gray400: '#484F58',
  gray500: '#6E7681',
  gray600: '#8B949E',
  gray700: '#B1BAC4',
  gray800: '#C9D1D9',
  gray900: '#E6EDF3',

  // Semantic
  background: '#0D1117',
  surface: '#161B22',
  card: '#21262D',
  text: '#E6EDF3',
  textSecondary: '#8B949E',
  textMuted: '#6E7681',
  border: '#30363D',
  divider: '#21262D',
  overlay: 'rgba(0, 0, 0, 0.7)',

  // Map
  mapRoute: '#2980B9',
  mapPickup: '#27AE60',
  mapDelivery: '#E74C3C',

  // Trip status
  statusPending: '#F39C12',
  statusActive: '#3498DB',
  statusCompleted: '#27AE60',
  statusCancelled: '#E74C3C',

  // Transparency
  transparent: 'transparent',
  scrim: 'rgba(0, 0, 0, 0.6)',
};

// ─── Typography ────────────────────────────────────────────────────────────────

export const typography = {
  // Font families
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    light: 'System',
  },

  // Font sizes
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
    display: 32,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Font weights
  fontWeight: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

// ─── Spacing ───────────────────────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// ─── Border Radius ─────────────────────────────────────────────────────────────

export const borderRadius = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  round: 999,
  circle: 9999,
};

// ─── Shadows ───────────────────────────────────────────────────────────────────

export const shadows = {
  light: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
  },
  dark: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 5,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.6,
      shadowRadius: 16,
      elevation: 8,
    },
  },
};

// ─── Z-Index ───────────────────────────────────────────────────────────────────

export const zIndex = {
  base: 0,
  dropdown: 100,
  overlay: 200,
  modal: 300,
  popover: 400,
  toast: 500,
  tooltip: 600,
};

// ─── Theme Type ────────────────────────────────────────────────────────────────

export type Theme = {
  colors: typeof lightColors;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows.light;
  isDark: boolean;
};

// ─── Get Theme ────────────────────────────────────────────────────────────────

export const getTheme = (scheme: ColorSchemeName): Theme => {
  const isDark = scheme === 'dark';
  return {
    colors: isDark ? darkColors : lightColors,
    typography,
    spacing,
    borderRadius,
    shadows: isDark ? shadows.dark : shadows.light,
    isDark,
  };
};

export default getTheme;
