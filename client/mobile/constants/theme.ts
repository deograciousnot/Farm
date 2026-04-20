import { Platform } from 'react-native';

const tintColorLight = '#38C172';
const tintColorDark = '#4DDB86';

export const Colors = {
  light: {
    text: '#1A1F1C',
    background: '#FFF9F1',
    backgroundSecondary: '#EEF8F0',
    backgroundTertiary: '#F7EEDB',
    surface: '#FFFDF8',
    surfaceRaised: '#FFFFFF',
    tint: '#38C172',
    accent: '#F26B5B',
    accentSecondary: '#F5B700',
    success: '#1F8F57',
    warning: '#D98B00',
    info: '#E05C49',
    muted: '#66736B',
    border: 'rgba(26, 31, 28, 0.08)',
    overlay: 'rgba(26, 31, 28, 0.08)',
    tabIconDefault: '#A29A8F',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#F5F8F3',
    background: '#121513',
    backgroundSecondary: '#1A201C',
    backgroundTertiary: '#222922',
    surface: '#171B18',
    surfaceRaised: '#1E2520',
    tint: tintColorDark,
    accent: '#FF7A66',
    accentSecondary: '#FFC94A',
    success: '#4DDB86',
    warning: '#FFD166',
    info: '#FF8E78',
    muted: '#98A59B',
    border: 'rgba(255, 255, 255, 0.06)',
    overlay: 'rgba(255, 255, 255, 0.08)',
    tabIconDefault: '#7F8D84',
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
