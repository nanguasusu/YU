import { useState, useEffect, useCallback } from 'react';
import { appStateStore } from '../lib/storage';
import { APP_MODE_KEY } from '../types';
import type { AppMode } from '../types';

const isTauriAvailable = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export function useAppMode() {
  const [appMode, setAppModeState] = useState<AppMode>('widget');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted mode on mount
  useEffect(() => {
    const load = async () => {
      try {
        if (isTauriAvailable()) {
          const stored = await appStateStore.get<AppMode>(APP_MODE_KEY);
          if (stored === 'widget' || stored === 'timer') {
            setAppModeState(stored);
          }
        } else {
          const raw = localStorage.getItem(APP_MODE_KEY);
          if (raw === 'widget' || raw === 'timer') {
            setAppModeState(raw);
          }
        }
      } catch {
        // ignore load errors, keep default 'widget'
      } finally {
        setIsLoaded(true);
      }
    };
    void load();
  }, []);

  // Listen for app-mode-changed Tauri event
  useEffect(() => {
    if (!isTauriAvailable()) return;

    let unlisten: (() => void) | undefined;

    const setup = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlisten = await listen<string>('app-mode-changed', (event) => {
          const mode = event.payload;
          if (mode === 'widget' || mode === 'timer') {
            setAppModeState(mode);
            // Persist the received mode
            void persistMode(mode);
          }
        });
      } catch {
        // ignore event listener errors outside Tauri
      }
    };

    void setup();

    return () => {
      unlisten?.();
    };
  }, []);

  const persistMode = async (mode: AppMode) => {
    try {
      if (isTauriAvailable()) {
        await appStateStore.set(APP_MODE_KEY, mode);
        await appStateStore.save();
      } else {
        localStorage.setItem(APP_MODE_KEY, mode);
      }
    } catch {
      // ignore persist errors
    }
  };

  const setAppMode = useCallback(async (mode: AppMode) => {
    setAppModeState(mode);
    await persistMode(mode);
  }, []);

  return { appMode, isLoaded, setAppMode };
}
