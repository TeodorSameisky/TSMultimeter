import { useCallback, useState } from 'react';

const isBrowser = () => typeof window !== 'undefined';

/**
 * Centralises the developer mode persistence logic so the App component can
 * focus on behaviour instead of storage plumbing. The hook keeps a boolean flag
 * in sync with localStorage and exposes a simple toggle helper.
 */
export const useDeveloperMode = (storageKey: string) => {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (!isBrowser()) {
      return false;
    }
    return window.localStorage.getItem(storageKey) === 'true';
  });

  const toggle = useCallback(() => {
    setEnabled((current) => {
      const next = !current;
      if (isBrowser()) {
        window.localStorage.setItem(storageKey, next ? 'true' : 'false');
      }
      return next;
    });
  }, [storageKey]);

  const set = useCallback((next: boolean) => {
    setEnabled(next);
    if (isBrowser()) {
      window.localStorage.setItem(storageKey, next ? 'true' : 'false');
    }
  }, [storageKey]);

  return {
    enabled,
    toggle,
    set,
  } as const;
};
