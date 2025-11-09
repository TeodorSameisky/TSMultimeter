import { useCallback, useRef } from 'react';

export type UseSkipNextClickResult = {
  markSkip: () => void;
  consumeSkip: () => boolean;
  clearSkip: () => void;
};

export const useSkipNextClick = (): UseSkipNextClickResult => {
  const skipRef = useRef(false);

  const markSkip = useCallback(() => {
    skipRef.current = true;
    window.setTimeout(() => {
      skipRef.current = false;
    }, 0);
  }, []);

  const consumeSkip = useCallback(() => {
    if (!skipRef.current) {
      return false;
    }
    skipRef.current = false;
    return true;
  }, []);

  const clearSkip = useCallback(() => {
    skipRef.current = false;
  }, []);

  return {
    markSkip,
    consumeSkip,
    clearSkip,
  } satisfies UseSkipNextClickResult;
};
