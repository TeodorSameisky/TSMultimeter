import { useCallback, useEffect, useState } from 'react';
import type { MeasurementHistoryProps } from './types.ts';

type UseHistoryPlaybackArgs = {
  history: MeasurementHistoryProps['history'];
};

type UseHistoryPlaybackResult = {
  displayHistory: MeasurementHistoryProps['history'];
  isPaused: boolean;
  handlePauseToggle: () => void;
  resetDisplayHistory: () => void;
};

export const useHistoryPlayback = ({ history }: UseHistoryPlaybackArgs): UseHistoryPlaybackResult => {
  const [displayHistory, setDisplayHistory] = useState(history);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!isPaused) {
      setDisplayHistory(history);
    }
  }, [history, isPaused]);

  const handlePauseToggle = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      if (!next) {
        setDisplayHistory(history);
      }
      return next;
    });
  }, [history]);

  const resetDisplayHistory = useCallback(() => {
    setDisplayHistory({});
  }, []);

  return {
    displayHistory,
    isPaused,
    handlePauseToggle,
    resetDisplayHistory,
  } satisfies UseHistoryPlaybackResult;
};
