import type { TextStyle } from 'react-native';

/**
 * FarmConnect design tokens.
 *
 * Every colour, size, radius and text style in the app should come from here so screens
 * stay consistent. Change the brand by editing this file, not individual screens.
 */

const light = {
  background: '#F6F4EE',
  surface: '#FFFFFF',
  surfaceMuted: '#EEEBE3',
  text: '#18211D',
  textMuted: '#5C6862',
  textSubtle: '#8A948E',
  border: '#E3DFD5',

  primary: '#1E6B47',
  primarySoft: '#E2EFE7',
  onPrimary: '#FFFFFF',

  accent: '#B7791F',
  accentSoft: '#F7ECD7',

  success: '#1E7A4C',
  successSoft: '#E1F1E8',
  warning: '#A15C07',
  warningSoft: '#FCEFD9',
  danger: '#B42318',
  dangerSoft: '#FBE7E5',

  like: '#D9473B',
  scrim: 'rgba(10, 14, 12, 0.45)',
  mediaOverlay: 'rgba(0, 0, 0, 0.45)',
  onMedia: '#FFFFFF',
  skeleton: '#E7E3DA',
};

const dark: typeof light = {
  background: '#0E1311',
  surface: '#161C19',
  surfaceMuted: '#1F2723',
  text: '#E9EFEA',
  textMuted: '#A1ADA6',
  textSubtle: '#6F7B74',
  border: '#2A332E',

  primary: '#5CC08D',
  primarySoft: '#1C3328',
  onPrimary: '#06140D',

  accent: '#E0A43E',
  accentSoft: '#3A2D16',

  success: '#5CC08D',
  successSoft: '#1C3328',
  warning: '#F0B455',
  warningSoft: '#3A2C14',
  danger: '#F97066',
  dangerSoft: '#3B1D1A',

  like: '#FF6B5E',
  scrim: 'rgba(0, 0, 0, 0.6)',
  mediaOverlay: 'rgba(0, 0, 0, 0.5)',
  onMedia: '#FFFFFF',
  skeleton: '#222A26',
};

export const Colors = { light, dark };

export type Palette = typeof light;
export type ColorToken = keyof Palette;

export const Spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/** Horizontal padding for every screen. */
export const ScreenPadding = Spacing.md;

export const FontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const Type = {
  display: { fontFamily: FontFamily.extrabold, fontSize: 30, lineHeight: 36, letterSpacing: -0.4 },
  title: { fontFamily: FontFamily.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.2 },
  headline: { fontFamily: FontFamily.bold, fontSize: 19, lineHeight: 25 },
  subhead: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 23 },
  bodyStrong: { fontFamily: FontFamily.semibold, fontSize: 15, lineHeight: 22 },
  callout: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: FontFamily.semibold, fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: FontFamily.medium, fontSize: 12, lineHeight: 16 },
  overline: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof Type;
