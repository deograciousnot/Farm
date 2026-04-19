import { Platform } from 'react-native';

const tintColorLight = '#2f9e5d';
const tintColorDark = '#83db8f';

export const Colors = {
  light: {
    text: '#18201c',
    background: '#f6f7f2',
    backgroundSecondary: '#e8f1ea',
    backgroundTertiary: '#f2ede3',
    surface: '#fbfcf8',
    surfaceRaised: '#ffffff',
    tint: tintColorLight,
    accent: '#ef6351',
    accentSecondary: '#f6b94c',
    success: '#2f9e5d',
    warning: '#d97706',
    info: '#d74f3f',
    muted: '#69756d',
    border: 'rgba(24, 32, 28, 0.06)',
    overlay: 'rgba(24, 32, 28, 0.08)',
    tabIconDefault: '#8d958f',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#eff7f0',
    background: '#0d1411',
    backgroundSecondary: '#13211b',
    backgroundTertiary: '#182720',
    surface: '#111916',
    surfaceRaised: '#17221d',
    tint: tintColorDark,
    accent: '#ff7b66',
    accentSecondary: '#ffbf5a',
    success: '#83db8f',
    warning: '#ffcc74',
    info: '#ff8f80',
    muted: '#96a59c',
    border: 'rgba(255, 255, 255, 0.04)',
    overlay: 'rgba(255, 255, 255, 0.08)',
    tabIconDefault: '#6f8177',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif-medium',
    mono: 'monospace',
  },
  web: {
    sans: "'Trebuchet MS', 'Segoe UI', sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'Avenir Next', 'Trebuchet MS', sans-serif",
    mono: "'Courier New', monospace",
  },
});
