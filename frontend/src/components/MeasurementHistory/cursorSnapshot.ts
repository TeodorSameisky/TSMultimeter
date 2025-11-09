import { DEFAULT_UNIT, META_PREFIX } from './constants.ts';
import type {
  ChartDatum,
  CursorSnapshot,
  MeasurementHistoryProps,
  SeriesSample,
} from './types.ts';

type SnapshotDependencies = {
  cursorTraceKey: string;
  isAutoCursorTrace: boolean;
  resolvedChannelStyles: NonNullable<MeasurementHistoryProps['channelStyles']>;
  findClosestRecord: (timestamp: number) => ChartDatum | undefined;
};

type BuildCursorSnapshotArgs = SnapshotDependencies & {
  sample: SeriesSample | undefined;
};

const resolveSeriesKey = (sample: SeriesSample): string => {
  const unit = sample.unit ?? DEFAULT_UNIT;
  return `${unit}|${sample.deviceId}`;
};

const applyChannelStyle = (
  entry: SeriesSample,
  key: string,
  targetKey: string,
  styles: NonNullable<MeasurementHistoryProps['channelStyles']>,
): SeriesSample | null => {
  const style = styles[entry.deviceId];
  if (style?.enabled === false && key !== targetKey) {
    return null;
  }

  const overrides: Partial<SeriesSample> = {};

  if (style?.alias && style.alias !== entry.deviceLabel) {
    overrides.deviceLabel = style.alias;
  }

  if (typeof style?.precision === 'number' && style.precision !== entry.precision) {
    overrides.precision = style.precision;
  }

  return Object.keys(overrides).length > 0 ? { ...entry, ...overrides } : entry;
};

const collectSamplesFromRecord = (
  record: ChartDatum | undefined,
  targetKey: string,
  styles: NonNullable<MeasurementHistoryProps['channelStyles']>,
): Map<string, SeriesSample> => {
  const sampleMap = new Map<string, SeriesSample>();

  if (!record) {
    return sampleMap;
  }

  Object.entries(record)
    .filter(([key]) => key.startsWith(META_PREFIX))
    .forEach(([key, value]) => {
      const baseSample = value as SeriesSample | undefined;
      if (!baseSample) {
        return;
      }
      const actualKey = key.slice(META_PREFIX.length);
      const styled = applyChannelStyle(baseSample, actualKey, targetKey, styles);
      if (styled) {
        sampleMap.set(actualKey, styled);
      }
    });

  return sampleMap;
};

export const buildCursorSnapshot = ({
  sample,
  cursorTraceKey,
  isAutoCursorTrace,
  resolvedChannelStyles,
  findClosestRecord,
}: BuildCursorSnapshotArgs): CursorSnapshot | undefined => {
  if (!sample) {
    return undefined;
  }

  const targetKey = isAutoCursorTrace ? resolveSeriesKey(sample) : cursorTraceKey;

  const record = findClosestRecord(sample.relativeTimestamp);
  const sampleMap = collectSamplesFromRecord(record, targetKey, resolvedChannelStyles);

  if (sampleMap.size === 0) {
    const styled = applyChannelStyle(sample, targetKey, targetKey, resolvedChannelStyles) ?? sample;
    sampleMap.set(targetKey, styled);
  } else if (!sampleMap.has(targetKey)) {
    const styled = applyChannelStyle(sample, targetKey, targetKey, resolvedChannelStyles) ?? sample;
    sampleMap.set(targetKey, styled);
  }

  const anchor = sampleMap.get(targetKey);
  if (!anchor) {
    return undefined;
  }

  const visibleEntries = isAutoCursorTrace
    ? Array.from(sampleMap.entries())
    : [[targetKey, anchor] as const];

  visibleEntries.sort((a, b) => a[1].deviceLabel.localeCompare(b[1].deviceLabel));

  return {
    anchorKey: targetKey,
    anchor,
    series: visibleEntries.map(([key, entry]) => ({ key, sample: entry })),
  } satisfies CursorSnapshot;
};
