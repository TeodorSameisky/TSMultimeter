import { useCallback, useEffect, useState } from 'react';

/**
 * Manages the user facing scope title while persisting the value in local storage.
 * The hook keeps the latest in-memory value in sync with storage and restores the
 * previous title on mount. Consumers should call {@link commit} to sanitise and
 * persist the final value after the input loses focus.
 */
export const useScopeTitle = (storageKey: string, defaultTitle: string) => {
  const [title, setTitle] = useState(defaultTitle);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const storedTitle = window.localStorage.getItem(storageKey);
    if (storedTitle) {
      setTitle(storedTitle);
    }
  }, [storageKey]);

  const persist = useCallback((value: string) => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(storageKey, value);
  }, [storageKey]);

  const update = useCallback((nextTitle: string) => {
    setTitle(nextTitle);
    persist(nextTitle);
  }, [persist]);

  const commit = useCallback(() => {
    setTitle((current) => {
      const trimmed = current.trim();
      const resolved = trimmed.length === 0 ? defaultTitle : trimmed;
      persist(resolved);
      return resolved;
    });
  }, [defaultTitle, persist]);

  return {
    title,
    update,
    commit,
  } as const;
};
