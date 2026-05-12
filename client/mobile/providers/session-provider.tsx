import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import { router } from 'expo-router';

import { api } from '@/lib/api';
import type { ApiUser, RegisterInput } from '@/lib/types';

type SessionMode = 'signed-out' | 'guest' | 'authenticated';

const STORAGE_KEYS = {
  token: 'farmconnect.session.token',
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
  signInDemo: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
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
  signInDemo: async () => {},
  login: async () => {},
  register: async () => {},
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
      try {
        const [storedToken, storedUser, storedMode, storedIntro] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.token),
          AsyncStorage.getItem(STORAGE_KEYS.user),
          AsyncStorage.getItem(STORAGE_KEYS.mode),
          AsyncStorage.getItem(STORAGE_KEYS.hasSeenIntro),
        ]);

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
        console.warn('Failed to restore FarmConnect session.', error);
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.token,
          STORAGE_KEYS.user,
          STORAGE_KEYS.mode,
        ]);
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

  function markIntroSeen() {
    setHasSeenIntro(true);
    void AsyncStorage.setItem(STORAGE_KEYS.hasSeenIntro, 'true');
  }

  function continueAsGuest() {
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
    setHasSeenIntro(true);
    setMode('authenticated');
    setToken(nextToken);
    setUser(nextUser);
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.token, nextToken],
      [STORAGE_KEYS.user, JSON.stringify(nextUser)],
      [STORAGE_KEYS.mode, 'authenticated'],
      [STORAGE_KEYS.hasSeenIntro, 'true'],
    ]);
  }

  async function signInDemo() {
    const response = await api.loginDemoBuyer();
    await persistSession(response.token, response.user);
  }

  async function login(email: string, password: string) {
    const response = await api.login(email, password);
    await persistSession(response.token, response.user);
  }

  async function register(input: RegisterInput) {
    const response = await api.register(input);
    await persistSession(response.token, response.user);
  }

  async function updateUser(nextUser: ApiUser) {
    setUser(nextUser);
    await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(nextUser));
  }

  async function logout() {
    setMode('signed-out');
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove([STORAGE_KEYS.token, STORAGE_KEYS.user, STORAGE_KEYS.mode]);
    router.replace('/auth?mode=login');
  }

  async function logoutToGuest() {
    setMode('guest');
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove([STORAGE_KEYS.token, STORAGE_KEYS.user]);
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.mode, 'guest'],
      [STORAGE_KEYS.hasSeenIntro, 'true'],
    ]);
    router.replace('/(tabs)');
  }

  async function clearDeletedAccount() {
    setMode('signed-out');
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove([STORAGE_KEYS.token, STORAGE_KEYS.user, STORAGE_KEYS.mode]);
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
        signInDemo,
        login,
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
