import { useCallback } from 'react';
import { META_PREFIX } from './constants.ts';
import { findClosestRecord } from './utils.ts';
import type { ChartDatum, ChartPointerEvent, SeriesSample } from './types.ts';

type SampleHint = {
  dataKey?: string;
  deviceId?: string;
};

type UseEventSampleResolverArgs = {
  chartData: ChartDatum[];
};

type UseEventSampleResolverResult = {
  getEventRelativeTimestamp: (chartEvent: ChartPointerEvent | null) => number | null;
  resolveSampleFromEvent: (chartEvent: ChartPointerEvent | null, hint?: SampleHint) => SeriesSample | undefined;
};

type PayloadLike = {
  dataKey?: string | number;
  name?: string | number;
  payload?: ChartDatum;
};

const extractSample = (payloadItem: PayloadLike): SeriesSample | undefined => {
  if (!payloadItem?.payload) {
    return undefined;
  }
  const keyRaw = payloadItem.dataKey ?? payloadItem.name;
  if (keyRaw === undefined || keyRaw === null) {
    return undefined;
  }
  const key = String(keyRaw);
  return payloadItem.payload[`${META_PREFIX}${key}`] as SeriesSample | undefined;
};

export const useEventSampleResolver = ({
  chartData,
}: UseEventSampleResolverArgs): UseEventSampleResolverResult => {
  const getEventRelativeTimestamp = useCallback((chartEvent: ChartPointerEvent | null): number | null => {
    if (!chartEvent) {
      return null;
    }
    if (typeof chartEvent.activeLabel === 'number') {
      return chartEvent.activeLabel;
    }
    if (typeof chartEvent.activeLabel === 'string') {
      const parsed = Number(chartEvent.activeLabel);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    const primaryPayload = chartEvent.activePayload?.[0];
    const record = primaryPayload?.payload as ChartDatum | undefined;
    if (record && typeof record.relativeTimestamp === 'number') {
      return record.relativeTimestamp;
    }
    return null;
  }, []);

  const resolveSampleFromEvent = useCallback(
    (chartEvent: ChartPointerEvent | null, hint?: SampleHint): SeriesSample | undefined => {
      if (!chartEvent) {
        return undefined;
      }

      const payloads = chartEvent.activePayload ?? [];
      const hasHint = Boolean(hint?.dataKey || hint?.deviceId);

      if (hint?.dataKey) {
        const match = payloads.find((item) => {
          const keyRaw = item.dataKey ?? item.name;
          return keyRaw !== undefined && keyRaw !== null && String(keyRaw) === hint.dataKey;
        });
        const sample = extractSample(match ?? {});
        if (sample) {
          return sample;
        }
      }

      if (hint?.deviceId) {
        for (const item of payloads) {
          const sample = extractSample(item);
          if (sample?.deviceId === hint.deviceId) {
            return sample;
          }
        }
      }

      if (!hasHint) {
        for (const item of payloads) {
          const sample = extractSample(item);
          if (sample) {
            return sample;
          }
        }
      }

      const timestamp = getEventRelativeTimestamp(chartEvent);
      if (timestamp === null) {
        return undefined;
      }
      const closest = findClosestRecord(chartData, timestamp);
      if (!closest) {
        return undefined;
      }

      if (hint?.dataKey) {
        const metaKey = `${META_PREFIX}${hint.dataKey}`;
        const sample = closest[metaKey] as SeriesSample | undefined;
        if (sample) {
          return sample;
        }
      }

      const samples = Object.entries(closest)
        .filter(([key]) => key.startsWith(META_PREFIX))
        .map(([, value]) => value as SeriesSample | undefined)
        .filter(Boolean) as SeriesSample[];

      if (hint?.deviceId) {
        const match = samples.find((entry) => entry.deviceId === hint.deviceId);
        if (match) {
          return match;
        }
      }

      return hasHint ? undefined : samples[0];
    },
    [chartData, getEventRelativeTimestamp],
  );

  return {
    getEventRelativeTimestamp,
    resolveSampleFromEvent,
  } satisfies UseEventSampleResolverResult;
};
