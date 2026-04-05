/**
 * Theme — single source of truth for all visual tokens.
 * Change brand colors, spacing, or typography here and it propagates everywhere.
 *
 * TODO (Abin): Once the Apple Developer Account is set up and the app is on TestFlight,
 * do a visual pass with the Zam Zam team and adjust any colors they want tweaked here.
 */

export const colors = {
  // Brand
  primary: '#2563eb',
  primaryLight: '#3b82f6',
  primaryDark: '#1d4ed8',

  // Backgrounds
  background: '#ffffff',
  surface: '#f8f9fa',
  surfaceElevated: '#f1f5f9',

  // Text
  text: '#111827',
  textSecondary: '#6b7280',
  textDisabled: '#d1d5db',
  textInverse: '#ffffff',

  // Borders
  border: '#e5e7eb',
  borderFocused: '#2563eb',

  // Semantic
  error: '#ef4444',
  errorLight: '#fee2e2',
  success: '#22c55e',
  successLight: '#dcfce7',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  info: '#3b82f6',
  infoLight: '#dbeafe',

  // Task status colors
  statusOpen: '#6b7280',
  statusAssigned: '#3b82f6',
  statusInProgress: '#f59e0b',
  statusReadyForReview: '#8b5cf6',
  statusCompleted: '#22c55e',

  // Priority colors
  priorityLow: '#22c55e',
  priorityMedium: '#f59e0b',
  priorityHigh: '#ef4444',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 9999,
};

export const typography = {
  // Font sizes
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,

  // Font weights (React Native uses string values)
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const shadow = {
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
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
};

const theme = { colors, spacing, radius, typography, shadow };
export default theme;
