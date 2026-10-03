import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  return { scheme, colors: Colors[scheme] } as const;
}
