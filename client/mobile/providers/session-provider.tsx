import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import { router } from 'expo-router';

import { api, ApiRequestError } from '@/lib/api';
import { clearToken, readToken, saveToken } from '@/lib/token-storage';
import { unregisterPush } from '@/lib/push';
import { queryClient, setStaleSessionListener } from '@/lib/query-client';
import type { ApiUser, RegisterInput } from '@/lib/types';

type SessionMode = 'signed-out' | 'guest' | 'authenticated';

const STORAGE_KEYS = {
  user: 'farmconnect.session.user',
  mode: 'farmconnect.session.mode',
  hasSeenIntro: 'farmconnect.session.hasSeenIntro',
};

type SessionContextValue = {
  token: string | null;
  user: ApiUser | null;
  mode: SessionMode;
  isLoading: boolean;
  hasSeenIntro: boolean;
  markIntroSeen: () => void;
  continueAsGuest: () => void;
  login: (email: string, password: string) => Promise<void>;
  /** Store a session the server already issued (e.g. after phone code sign-in). */
  signInWithToken: (token: string, user: ApiUser) => Promise<void>;
  /** Resolves with the confirmation code only in development, when no email provider is set up. */
  register: (input: RegisterInput) => Promise<{ devCode?: string }>;
  updateUser: (nextUser: ApiUser) => Promise<void>;
  logout: () => Promise<void>;
  logoutToGuest: () => Promise<void>;
  clearDeletedAccount: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue>({
  token: null,
  user: null,
  mode: 'signed-out',
  isLoading: true,
  hasSeenIntro: false,
  markIntroSeen: () => {},
  continueAsGuest: () => {},
  login: async () => {},
  signInWithToken: async () => {},
  register: async () => ({}),
  updateUser: async () => {},
  logout: async () => {},
  logoutToGuest: async () => {},
  clearDeletedAccount: async () => {},
});

export function SessionProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [mode, setMode] = useState<SessionMode>('signed-out');
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenIntro, setHasSeenIntro] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      let cachedToken: string | null = null;
      let cachedUser: ApiUser | null = null;

      try {
        const [storedToken, storedMode, storedIntro, storedUser] = await Promise.all([
          readToken(),
          AsyncStorage.getItem(STORAGE_KEYS.mode),
          AsyncStorage.getItem(STORAGE_KEYS.hasSeenIntro),
          AsyncStorage.getItem(STORAGE_KEYS.user),
        ]);
        cachedUser = storedUser ? (JSON.parse(storedUser) as ApiUser) : null;
        cachedToken = storedToken;

        if (!isMounted) {
          return;
        }

        setHasSeenIntro(storedIntro === 'true');

        if (storedMode === 'guest') {
          setMode('guest');
          setToken(null);
          setUser(null);
          return;
        }

        if (storedToken) {
          const response = await api.getSession(storedToken);

          if (!isMounted) {
            return;
          }

          setToken(storedToken);
          setUser(response.user);
          setMode('authenticated');
        }
      } catch (error) {
        // Offline, or the free server still waking up: stay signed in with the saved profile.
        // Only sign out when the server actually rejected the session.
        const rejected = error instanceof ApiRequestError && (error.status === 401 || error.status === 403);

        if (!rejected && cachedToken && cachedUser) {
          if (isMounted) {
            setToken(cachedToken);
            setUser(cachedUser);
            setMode('authenticated');
          }
          return;
        }

        console.warn('Failed to restore FarmConnect session.', error);
        await Promise.all([clearToken(), AsyncStorage.multiRemove([STORAGE_KEYS.user, STORAGE_KEYS.mode])]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setStaleSessionListener(() => void clearDeletedAccount());
    return () => setStaleSessionListener(null);
  });

  function markIntroSeen() {
    setHasSeenIntro(true);
    void AsyncStorage.setItem(STORAGE_KEYS.hasSeenIntro, 'true');
  }

  function continueAsGuest() {
    queryClient.clear();
    setHasSeenIntro(true);
    setMode('guest');
    setToken(null);
    setUser(null);
    void AsyncStorage.multiSet([
      [STORAGE_KEYS.mode, 'guest'],
      [STORAGE_KEYS.hasSeenIntro, 'true'],
    ]);
  }

  async function persistSession(nextToken: string, nextUser: ApiUser) {
    queryClient.clear();
    setHasSeenIntro(true);
    setMode('authenticated');
    setToken(nextToken);
    setUser(nextUser);
    await saveToken(nextToken);
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.user, JSON.stringify(nextUser)],
      [STORAGE_KEYS.mode, 'authenticated'],
      [STORAGE_KEYS.hasSeenIntro, 'true'],
    ]);
  }

  async function login(email: string, password: string) {
    const response = await api.login(email, password);
    await persistSession(response.token, response.user);
  }

  async function register(input: RegisterInput) {
    const response = await api.register(input);
    await persistSession(response.token, response.user);
    return { devCode: response.devCode };
  }

  async function updateUser(nextUser: ApiUser) {
    setUser(nextUser);
    await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(nextUser));
  }

  async function logout() {
    if (token) void unregisterPush(token);
    queryClient.clear();
    setMode('signed-out');
    setToken(null);
    setUser(null);
    await Promise.all([clearToken(), AsyncStorage.multiRemove([STORAGE_KEYS.user, STORAGE_KEYS.mode])]);
    router.replace('/auth?mode=login');
  }

  async function logoutToGuest() {
    if (token) void unregisterPush(token);
    queryClient.clear();
    setMode('guest');
    setToken(null);
    setUser(null);
    await Promise.all([clearToken(), AsyncStorage.removeItem(STORAGE_KEYS.user)]);
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.mode, 'guest'],
      [STORAGE_KEYS.hasSeenIntro, 'true'],
    ]);
    router.replace('/(tabs)');
  }

  async function clearDeletedAccount() {
    queryClient.clear();
    setMode('signed-out');
    setToken(null);
    setUser(null);
    await Promise.all([clearToken(), AsyncStorage.multiRemove([STORAGE_KEYS.user, STORAGE_KEYS.mode])]);
    router.replace('/auth?mode=login');
  }

  return (
    <SessionContext.Provider
      value={{
        token,
        user,
        mode,
        isLoading,
        hasSeenIntro,
        markIntroSeen,
        continueAsGuest,
        login,
        signInWithToken: persistSession,
        register,
        updateUser,
        logout,
        logoutToGuest,
        clearDeletedAccount,
      }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
