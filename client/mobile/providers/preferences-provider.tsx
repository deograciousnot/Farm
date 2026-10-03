import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'farmconnect.settings.preferences';

type Preferences = {
  /** Skip loading feed photos until tapped, and don't autoplay video. */
  dataSaver: boolean;
  /** Official updates a guest hid from Home (signed-in members' dismissals are stored on the server). */
  dismissedBroadcasts: string[];
};

const defaultPreferences: Preferences = { dataSaver: false, dismissedBroadcasts: [] };

type PreferencesContextValue = Preferences & {
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
};

const PreferencesContext = createContext<PreferencesContextValue>({
  ...defaultPreferences,
  setPreference: () => {},
});

export function PreferencesProvider({ children }: PropsWithChildren) {
  const [preferences, setPreferences] = useState(defaultPreferences);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          setPreferences((current) => ({ ...current, ...(JSON.parse(stored) as Partial<Preferences>) }));
        }
      })
      .catch((error) => console.warn('Failed to load preferences.', error));
  }, []);

  function setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPreferences((current) => {
      const next = { ...current, [key]: value };
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  return <PreferencesContext.Provider value={{ ...preferences, setPreference }}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  return useContext(PreferencesContext);
}
