import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MeasurementSample } from '../../types/deviceData.ts';
import { useHistoryPlayback } from './useHistoryPlayback.ts';

type History = Record<string, MeasurementSample[]>;

const buildSample = (overrides: Partial<MeasurementSample> = {}): MeasurementSample => ({
  deviceId: 'device_001',
  deviceType: 'mock',
  deviceLabel: 'Mock Device',
  value: 1,
  unit: 'V',
  timestamp: Date.now(),
  ...overrides,
});

describe('useHistoryPlayback', () => {
  it('pauses updates and resumes with latest history', () => {
    const initialHistory: History = {
      device_001: [buildSample({ timestamp: 1, value: 10 })],
    };

    const updatedHistory: History = {
      device_001: [buildSample({ timestamp: 2, value: 20 })],
    };

    const { result, rerender } = renderHook(
      ({ history }) => useHistoryPlayback({ history }),
      { initialProps: { history: initialHistory } },
    );

    expect(result.current.displayHistory).toEqual(initialHistory);
    expect(result.current.isPaused).toBe(false);

    act(() => {
      result.current.handlePauseToggle();
    });

    expect(result.current.isPaused).toBe(true);

    rerender({ history: updatedHistory });
    expect(result.current.displayHistory).toEqual(initialHistory);

    act(() => {
      result.current.handlePauseToggle();
    });

    expect(result.current.isPaused).toBe(false);
    expect(result.current.displayHistory).toEqual(updatedHistory);

    act(() => {
      result.current.resetDisplayHistory();
    });

    expect(result.current.displayHistory).toEqual({});
  });
});
