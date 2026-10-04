import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const subscribe = () => () => {};

/**
 * To support static rendering, report "light" during server rendering and hydration,
 * then the real scheme once running in the browser.
 */
export function useColorScheme() {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  const colorScheme = useRNColorScheme();

  return isClient ? colorScheme : 'light';
}
