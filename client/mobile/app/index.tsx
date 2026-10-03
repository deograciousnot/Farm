import { Redirect } from 'expo-router';

import { useSession } from '@/providers/session-provider';

/** Entry route: the native splash stays up until the session is restored, then we route. */
export default function LaunchScreen() {
  const { isLoading, token, mode, hasSeenIntro } = useSession();

  if (isLoading) {
    return null;
  }

  if (token || mode === 'guest') {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href={hasSeenIntro ? '/auth?mode=login' : '/get-started'} />;
}
