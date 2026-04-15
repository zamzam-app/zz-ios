/**
 * Theme — single source of truth for all visual tokens.
 * Change brand colors, spacing, or typography here and it propagates everywhere.
 */

export const colors = {
  // Brand — Bakery Caramel
  primary: '#92400E',
  primaryLight: '#B45309',
  primaryDark: '#78350F',
  primaryTint: '#FDF4E7',        // warm amber surface
  primaryTintStrong: '#FAEBD0',  // deeper tint for pressed/active states

  // Backgrounds
  background: '#FAF7F2',         // warm cream
  surface: '#FFFFFF',
  surfaceElevated: '#F5EFE6',    // warm off-white

  // Text
  text: '#1C1917',               // warm near-black
  textSecondary: '#78716C',      // warm gray
  textDisabled: '#D6D3D1',
  textInverse: '#FFFFFF',

  // Borders
  border: '#E7E0D5',             // warm border
  borderFocused: '#92400E',

  // Semantic
  error: '#DC2626',
  errorLight: '#FEE2E2',
  success: '#15803D',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  info: '#0369A1',
  infoLight: '#E0F2FE',

  // Task status
  statusOpen: '#78716C',
  statusAssigned: '#0369A1',
  statusInProgress: '#D97706',
  statusReadyForReview: '#7C3AED',
  statusCompleted: '#15803D',

  // Priority
  priorityLow: '#15803D',
  priorityMedium: '#D97706',
  priorityHigh: '#DC2626',
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
  sm: 8,
  md: 14,
  lg: 24,
  xl: 32,
  full: 9999,
};

export const typography = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 28,
  xxl: 36,

  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const shadow = {
  sm: {
    shadowColor: '#92400E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#92400E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
  },
};

const theme = { colors, spacing, radius, typography, shadow };
export default theme;
