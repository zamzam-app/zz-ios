/**
 * Theme — single source of truth for all visual tokens.
 * Change brand colors, spacing, or typography here and it propagates everywhere.
 */

export const colors = {
  // Brand — Bakery Caramel
  primary: '#92400E',
  primaryLight: '#B45309',
  primaryDark: '#78350F',
  primaryTint: '#FDF4E7', // warm amber surface
  primaryTintStrong: '#FAEBD0', // deeper tint for pressed/active states

  // Backgrounds
  background: '#FAF7F2', // warm cream
  screenBackground: '#F7F9FB', // app screen base
  surface: '#FFFFFF',
  surfaceElevated: '#F5EFE6', // warm off-white
  surfaceOverlay: '#F7F9FBD9', // elevated/translucent sheet cap

  // Text
  text: '#1C1917', // warm near-black
  textSecondary: '#78716C', // warm gray
  textDisabled: '#D6D3D1',
  textInverse: '#FFFFFF',

  // Borders
  border: '#E7E0D5', // warm border
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

  // Component-specific
  buttonPrimaryBg: '#785A00',
  buttonDarkBg: '#1A202C',
  buttonLightBg: '#FFFFFF',
  tabBarBg: '#1A202C',

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

  // Common literals (kept as tokens to satisfy lint rules)
  transparent: 'transparent',
  black: '#000',
  ink: '#191C1E',
  white: '#FFFFFF',
  whiteAlpha50: '#FFFFFF80',

  // Neutrals / surfaces used across screens
  uiGray0: '#F8FAFC',
  uiGray1: '#F2F4F6',
  uiGray2: '#F1F3F5',
  uiGray3: '#EEF1F4',
  uiGray4: '#E6E8EA',
  uiSlate200: '#E2E8F0',
  uiSlate400: '#94A3B8',
  uiSlate600: '#475569',

  // Warm borders used in sheets/cards
  warmBorder: '#D3C5AC',
  warmBorderAlpha16: '#D3C5AC26',
  warmBorderAlpha17: '#D3C5AC2A',
  warmBorderAlpha20: '#D3C5AC33',
  warmBorderAlpha18: '#D3C5AC30',
  warmBorderAlpha25: '#D3C5AC40',
  warmBorderAlpha33: '#D3C5AC55',
  warmBorderAlpha36: '#D3C5AC5C',
  warmBorderAlpha44: '#D3C5AC70',
  warmBorderAlpha50: '#D3C5AC80',
  warmBorderAlpha60: '#D3C5AC99',
  warmBorderAlpha19: 'rgba(211, 197, 172, 0.25)',

  // Scrims / overlays
  scrimDark40: 'rgba(25, 28, 30, 0.4)',
  scrimDark48: 'rgba(25, 28, 30, 0.48)',
  scrimBlack40: 'rgba(0, 0, 0, 0.4)',
  scrimBlack45: 'rgba(0,0,0,0.45)',
  scrimBlack50: 'rgba(0,0,0,0.5)',
  scrimBlack35: 'rgba(0, 0, 0, 0.35)',
  scrimBlack05: 'rgba(0, 0, 0, 0.05)',
  scrimBlack90: 'rgba(0,0,0,0.9)',
  scrimWhite70: 'rgba(255, 255, 255, 0.7)',
  overlayBlack33: '#00000055',

  // Task / Card warm palette
  warmBgLight: '#F0EDE8',
  warmBgMedium: '#E8DED4',
  warmHeaderBg: '#F4F1ED',
  warmChipBg: '#EFEBE6',
  warmBorderDefault: '#E1DCD3',
  warmBorderDefaultAlpha50: '#E1DCD380',
  textWarmDark: '#3A2E24',
  textWarmMuted: '#8B7B6B',
  textWarmBrown: '#4A3728',
  accentYellowWarm: '#E8C34A',
  accentBlueWarm: '#4A90D9',

  // Accent helpers
  accentYellow: '#EAB308',
  accentGold: '#F59E0B',
  accentRed: '#EF4444',
  accentGreen: '#16A34A',
  accentGreenBright: '#22C55E',
  accentGreenLight: '#DCFCE7',
  accentBlue: '#3B82F6',
  accentBlueBorder: '#C2E0FF',
  accentRedBorder: '#FFCCC7',
  accentRedBorderSoft: '#FBCACA',
  accentRoseBg: '#FFEBEE',
  accentRoseBgSoft: '#FFF1F1',
  accentStone50: '#F5F5F4',
  accentNeutral50: '#F9FAFB',
  accentBrownText: '#4F4633',
  accentBrownTextMuted: '#545F73',
  accentCaramelText: '#A87E3B',
  accentCoffee: '#5A4300',
  accentSteel: '#4B6584',
  accentCharcoalAlpha: '#393c3fff',
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
