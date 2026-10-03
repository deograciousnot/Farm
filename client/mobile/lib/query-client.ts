import { focusManager, MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

import { ApiRequestError, isStaleSessionError } from '@/lib/api';

let staleSessionListener: (() => void) | null = null;

/** The session provider registers here so any query can sign out a deleted account. */
export function setStaleSessionListener(listener: (() => void) | null) {
  staleSessionListener = listener;
}

function handleError(error: unknown) {
  if (isStaleSessionError(error)) {
    staleSessionListener?.();
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleError }),
  mutationCache: new MutationCache({ onError: handleError }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      // Client errors (4xx) won't fix themselves; only retry flaky network or server failures.
      retry: (failureCount, error) =>
        failureCount < 2 && !(error instanceof ApiRequestError && error.status >= 400 && error.status < 500),
    },
  },
});

// React Native has no window focus event; treat returning to the app as focus.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (status) => {
    focusManager.setFocused(status === 'active');
  });
}
