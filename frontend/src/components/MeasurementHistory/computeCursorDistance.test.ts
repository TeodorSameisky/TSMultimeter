import { describe, expect, it } from 'vitest';
import { computeCursorDistance } from './utils.ts';
import type {
  CursorSeriesEntry,
  CursorSnapshot,
  CursorState,
  SeriesSample,
} from './types.ts';

const createSeriesSample = (overrides: Partial<SeriesSample> = {}): SeriesSample => ({
  deviceId: 'device_alpha',
  deviceType: 'Mock',
  deviceLabel: 'Channel Alpha',
  value: 4.88,
  unit: 'V DC',
  timestamp: 22_576,
  relativeTimestamp: 22_576,
  ...overrides,
});

const buildSnapshot = (entries: CursorSeriesEntry[], anchorIndex = 0): CursorSnapshot => {
  const anchorEntry = entries[anchorIndex];
  if (!anchorEntry) {
    throw new Error('Missing anchor entry for cursor snapshot test data.');
  }
  const anchorKey = anchorEntry.key;
  return {
    anchorKey,
    anchor: anchorEntry.sample,
    series: entries,
  } satisfies CursorSnapshot;
};

describe('computeCursorDistance', () => {
  it('produces per-series deltas for matching cursor snapshots', () => {
    const primarySeries: CursorSeriesEntry[] = [
      {
        key: 'V DC|device_alpha',
        sample: createSeriesSample({ value: 4.88, unit: 'V DC', deviceLabel: 'Voltage' }),
      },
      {
        key: 'kHz|device_alpha',
        sample: createSeriesSample({
          value: 1.166,
          unit: 'kHz',
          deviceLabel: 'Frequency',
          precision: 4,
        }),
      },
    ];

    const secondarySeries: CursorSeriesEntry[] = [
      {
        key: 'V DC|device_alpha',
        sample: createSeriesSample({ value: 6.516, unit: 'V DC', timestamp: 19_580, relativeTimestamp: 19_580 }),
      },
      {
        key: 'kHz|device_alpha',
        sample: createSeriesSample({
          value: 1.202,
          unit: 'kHz',
          timestamp: 19_580,
          relativeTimestamp: 19_580,
        }),
      },
    ];

    const state: CursorState = {
      primary: buildSnapshot(primarySeries, 0),
      secondary: buildSnapshot(secondarySeries, 0),
    };

    const result = computeCursorDistance(state);
    expect(result).not.toBeNull();

    const info = result!;
    expect(info.deltaSeconds).toBeCloseTo(2.996, 6);
    expect(info.deltaValues).toBeDefined();
    expect(info.deltaValues).toBeCloseTo(-1.636, 3);
    expect(info.series).toHaveLength(2);

    const voltageDelta = info.series.find((entry) => entry.unit === 'V DC');
    expect(voltageDelta?.delta).toBeCloseTo(-1.636, 3);
    expect(voltageDelta?.precision).toBeUndefined();

    const frequencyDelta = info.series.find((entry) => entry.unit === 'kHz');
    expect(frequencyDelta?.delta).toBeCloseTo(-0.036, 3);
    expect(frequencyDelta?.precision).toBe(4);
  });
});
