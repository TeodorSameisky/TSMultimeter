import { format } from 'date-fns';
import type { MeasurementSample } from '../../hooks/useDevice';
import { COLORS, DEFAULT_AXIS_COLOR, DEFAULT_UNIT, MIN_X_ZOOM_SPAN, MIN_Y_RATIO_SPAN, UNIT_ORDER } from './constants';
import type {
  ChannelStyleMap,
  ChartPointerEvent,
  CursorDistanceInfo,
  CursorState,
  ChartDatum,
  MeasurementSeries,
  PointerRatios,
  SeriesSample,
  ZoomFlashState,
  ZoomOverlayProps,
  ZoomSelectionState,
} from './types';

export const clamp01 = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
};

export const formatTimestamp = (timestamp: number) => {
  try {
    return format(timestamp, 'HH:mm:ss.SSS');
  } catch {
    return new Date(timestamp).toLocaleTimeString();
  }
};

export const formatRelativeTime = (relativeMs: number) => {
  if (!Number.isFinite(relativeMs)) {
    return '0.000 s';
  }
  return `${(relativeMs / 1000).toFixed(3)} s`;
};

export const buildEquidistantTicks = (min: number, max: number, count: number): number[] => {
  if (!Number.isFinite(min) || !Number.isFinite(max) || count <= 0) {
    return [];
  }
  if (count === 1) {
    return [min];
  }

  const ascending = min <= max;
  const start = ascending ? min : max;
  const end = ascending ? max : min;
  const span = end - start;

  if (!Number.isFinite(span)) {
    return [];
  }

  if (Math.abs(span) < Number.EPSILON) {
    const padding = Math.max(Math.abs(start) * 0.1, 1);
    return buildEquidistantTicks(start - padding, end + padding, count);
  }

  const step = span / (count - 1);
  const ticks = Array.from({ length: count }, (_, index) => start + step * index);
  return ascending ? ticks : ticks.reverse();
};

export const deriveUnits = (
  series: MeasurementSeries[],
  channelStyles?: ChannelStyleMap,
) => {
  const unitMap = new Map<string, string>();
  series.forEach((item) => {
    const channel = channelStyles?.[item.deviceId];
    if (channel && channel.enabled === false) {
      return;
    }
    if (!unitMap.has(item.unit)) {
      const color = channel?.color
        ?? COLORS[unitMap.size % COLORS.length]
        ?? DEFAULT_AXIS_COLOR;
      unitMap.set(item.unit, color);
    }
  });
  return Array.from(unitMap.entries()).sort((a, b) => {
    const indexA = UNIT_ORDER.indexOf(a[0]);
    const indexB = UNIT_ORDER.indexOf(b[0]);
    return (indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA)
      - (indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB);
  });
};

export const createDataSeries = (
  samples: MeasurementSample[],
  channelStyles?: ChannelStyleMap,
  baseTimestamp?: number,
): MeasurementSeries[] => {
  if (samples.length === 0) {
    return [];
  }

  const firstSample = samples[0];
  const base = baseTimestamp ?? (firstSample ? firstSample.timestamp : Date.now());
  const grouped = new Map<string, SeriesSample[]>();

  samples.forEach((sample) => {
    if (!Number.isFinite(sample.value)) {
      return;
    }
    const unit = sample.unit ?? DEFAULT_UNIT;
    const key = `${unit}|${sample.deviceId}`;
    const seriesSamples = grouped.get(key) ?? [];
    const style = channelStyles?.[sample.deviceId];
    const precision = typeof style?.precision === 'number' ? style.precision : undefined;
    seriesSamples.push({
      ...sample,
      relativeTimestamp: Math.max(0, sample.timestamp - base),
      ...(precision !== undefined ? { precision } : {}),
    });
    grouped.set(key, seriesSamples);
  });

  return Array.from(grouped.entries()).map(([key, values]) => {
    const [unitRaw, deviceIdRaw] = key.split('|');
    const unit = unitRaw || DEFAULT_UNIT;
    const deviceId = deviceIdRaw || 'Unknown Device';
    const style = channelStyles?.[deviceId];
    const label = style?.alias ?? values[0]?.deviceLabel ?? deviceId;
    const sortedValues = values
      .slice()
      .sort((a, b) => a.relativeTimestamp - b.relativeTimestamp);

    return {
      key,
      unit,
      deviceId,
      label,
      values: sortedValues,
    } satisfies MeasurementSeries;
  });
};

export const buildChartData = (
  samples: MeasurementSample[],
  channelStyles?: ChannelStyleMap,
): ChartDatum[] => {
  const filteredSamples = samples.filter((sample) => Number.isFinite(sample.value));
  if (filteredSamples.length === 0) {
    return [];
  }

  const baseTimestamp = filteredSamples[0]?.timestamp ?? Date.now();
  const timeIndex = new Map<number, ChartDatum>();

  filteredSamples.forEach((sample) => {
    const relativeTimestamp = Math.max(0, sample.timestamp - baseTimestamp);
    const bucket = timeIndex.get(relativeTimestamp) ?? {
      relativeTimestamp,
      timestamp: sample.timestamp,
      timestampLabel: formatTimestamp(sample.timestamp),
    } as ChartDatum;
    const unit = sample.unit ?? DEFAULT_UNIT;
    const key = `${unit}|${sample.deviceId}`;
    const channel = channelStyles?.[sample.deviceId];
    const alias = channel?.alias ?? sample.deviceLabel ?? sample.deviceId;
    const precision = typeof channel?.precision === 'number' ? channel.precision : undefined;
    bucket[key] = sample.value;
    bucket[`meta:${key}`] = {
      ...sample,
      relativeTimestamp,
      tooltipLabel: `${alias} (${unit})`,
      ...(precision !== undefined ? { precision } : {}),
    };
    timeIndex.set(relativeTimestamp, bucket);
  });

  return Array.from(timeIndex.values()).sort((a, b) => (
    a.relativeTimestamp - b.relativeTimestamp
  ));
};

export const buildAxisDomains = (
  series: MeasurementSeries[],
  channelStyles?: ChannelStyleMap,
  viewDomain?: [number, number],
) => {
  const domainMap = new Map<string, { min: number; max: number }>();

  series.forEach((item) => {
    const channel = channelStyles?.[item.deviceId];
    if (channel && channel.enabled === false) {
      return;
    }

    const points = viewDomain
      ? item.values.filter((sample) => (
        sample.relativeTimestamp >= viewDomain[0]
        && sample.relativeTimestamp <= viewDomain[1]
      ))
      : item.values;

    const finitePoints = points.filter((point) => Number.isFinite(point.value));

    if (finitePoints.length === 0) {
      return;
    }

    const values = finitePoints.map((point) => point.value);
    const seriesMin = Math.min(...values);
    const seriesMax = Math.max(...values);
    const current = domainMap.get(item.unit);

    if (!current) {
      domainMap.set(item.unit, { min: seriesMin, max: seriesMax });
      return;
    }

    domainMap.set(item.unit, {
      min: Math.min(current.min, seriesMin),
      max: Math.max(current.max, seriesMax),
    });
  });

  return domainMap;
};

export const buildAxisPrecision = (series: MeasurementSeries[]) => {
  const precisionMap = new Map<string, number>();
  series.forEach((item) => {
    let bestPrecision: number | undefined;
    item.values.forEach((sample) => {
      if (typeof sample.precision === 'number') {
        bestPrecision = typeof bestPrecision === 'number'
          ? Math.max(bestPrecision, sample.precision)
          : sample.precision;
      }
    });
    if (typeof bestPrecision === 'number') {
      const existing = precisionMap.get(item.unit);
      precisionMap.set(
        item.unit,
        typeof existing === 'number' ? Math.max(existing, bestPrecision) : bestPrecision,
      );
    }
  });
  return precisionMap;
};

export const computeCursorDistance = (state: CursorState): CursorDistanceInfo | null => {
  const primary = state.primary?.anchor;
  const secondary = state.secondary?.anchor;
  if (!primary || !secondary) {
    return null;
  }
  if (primary.unit !== secondary.unit) {
    return null;
  }
  const deltaTime = Math.abs(primary.timestamp - secondary.timestamp);
  const deltaSeconds = deltaTime / 1000;
  const deltaValues = primary.value - secondary.value;
  const precision = primary.precision ?? secondary.precision;
  const result: CursorDistanceInfo = {
    deltaTime,
    deltaSeconds,
    deltaValues,
  };
  if (precision !== undefined) {
    result.precision = precision;
  }
  return result;
};

const encodeCsvCell = (cell: string) => {
  const safeCell = cell.replace(/"/g, '""');
  return /[",\n]/.test(safeCell) ? `"${safeCell}"` : safeCell;
};

type ExportCsvOptions = {
  channelStyles?: ChannelStyleMap;
};

export const exportSamplesToCsv = (
  samples: MeasurementSample[],
  options?: ExportCsvOptions,
) => {
  if (samples.length === 0) {
    return;
  }

  const channelStyles = options?.channelStyles;
  const filteredSamples = samples
    .filter((sample) => channelStyles?.[sample.deviceId]?.enabled !== false)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (filteredSamples.length === 0) {
    return;
  }

  const baseTimestamp = filteredSamples[0]?.timestamp ?? Date.now();
  type ChannelKey = string;
  type ChannelBucket = {
    channelName: string;
    unit: string;
    deviceId: string;
    precision?: number;
    rows: Array<{ relative: number; timeLabel: string; value: string }>;
  };

  const buckets = new Map<ChannelKey, ChannelBucket>();

  filteredSamples.forEach((sample) => {
    const style = channelStyles?.[sample.deviceId];
    const alias = style?.alias?.trim();
    const channelName = alias && alias.length > 0 ? alias : (sample.deviceLabel ?? sample.deviceId);
    const unit = sample.unit ?? DEFAULT_UNIT;
    const precision = typeof style?.precision === 'number' ? style.precision : undefined;
    const relative = Math.max(0, sample.timestamp - baseTimestamp);
    const timeDisplay = formatRelativeTime(relative);
    const valueText = Number.isFinite(sample.value)
      ? (precision !== undefined ? sample.value.toFixed(precision) : sample.value.toString())
      : '';
    const channelKey = `${sample.deviceId}|${channelName}|${unit}`;

    if (!buckets.has(channelKey)) {
      buckets.set(channelKey, {
        channelName,
        unit,
        deviceId: sample.deviceId,
        ...(precision !== undefined ? { precision } : {}),
        rows: [],
      });
    }

    const bucket = buckets.get(channelKey);
    if (!bucket) {
      return;
    }
    bucket.rows.push({ relative, timeLabel: timeDisplay, value: valueText });
  });

  const sanitizeForFilename = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    const replaced = trimmed.replace(/[^a-z0-9]+/g, '-');
    const cleaned = replaced.replace(/^-+|-+$/g, '');
    return cleaned.length > 0 ? cleaned : 'channel';
  };

  buckets.forEach((bucket) => {
    if (bucket.rows.length === 0) {
      return;
    }

    bucket.rows.sort((a, b) => a.relative - b.relative);

    const header = ['time', 'channel', 'unit', 'value'].map(encodeCsvCell);
    const csvRows: string[] = [header.join(',')];

    bucket.rows.forEach((row) => {
      const cells = [
        encodeCsvCell(row.timeLabel),
        encodeCsvCell(bucket.channelName),
        encodeCsvCell(bucket.unit),
        encodeCsvCell(row.value),
      ];
      csvRows.push(cells.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const channelPart = sanitizeForFilename(bucket.channelName);
    const unitPart = sanitizeForFilename(bucket.unit);
    link.setAttribute('download', `tsmultimeter-${channelPart}-${unitPart}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
};

export const shouldApplyZoom = (selection: ZoomSelectionState | null) => {
  if (!selection) {
    return { applyX: false, applyY: false };
  }
  const xSpan = Math.abs(selection.xEnd - selection.xStart);
  const ySpan = Math.abs(selection.yEnd - selection.yStart);
  return {
    applyX: xSpan >= MIN_X_ZOOM_SPAN,
    applyY: ySpan >= MIN_Y_RATIO_SPAN,
  };
};

export const clampOverlay = (
  overlaySelection: ZoomSelectionState | ZoomFlashState,
  activeDomain: [number, number],
): ZoomOverlayProps | null => {
  const [domainStart, domainEnd] = activeDomain;
  const span = domainEnd - domainStart;
  if (span <= 0) {
    return null;
  }
  const rawStart = Math.min(overlaySelection.xStart, overlaySelection.xEnd);
  const rawEnd = Math.max(overlaySelection.xStart, overlaySelection.xEnd);
  const clampedStart = Math.min(domainEnd, Math.max(domainStart, rawStart));
  const clampedEnd = Math.min(domainEnd, Math.max(domainStart, rawEnd));
  const width = Math.max(0, clampedEnd - clampedStart);
  let leftRatio = clamp01((clampedStart - domainStart) / span);
  let widthRatio = clamp01(width / span);
  if (widthRatio <= 0) {
    leftRatio = 0;
    widthRatio = 1;
  }
  let topRatio = clamp01(Math.min(overlaySelection.yStart, overlaySelection.yEnd));
  let bottomRatio = clamp01(Math.max(overlaySelection.yStart, overlaySelection.yEnd));
  let heightRatio = clamp01(bottomRatio - topRatio);
  if (heightRatio <= 0) {
    topRatio = 0;
    bottomRatio = 1;
    heightRatio = 1;
  }
  return {
    left: leftRatio,
    width: widthRatio,
    top: topRatio,
    height: heightRatio,
  } satisfies ZoomOverlayProps;
};

export const extractPointerRatios = (chartEvent: ChartPointerEvent): PointerRatios | null => {
  const chartWidth = typeof chartEvent.chartWidth === 'number' ? chartEvent.chartWidth : null;
  const chartHeight = typeof chartEvent.chartHeight === 'number' ? chartEvent.chartHeight : null;
  const chartX = typeof chartEvent.chartX === 'number' ? chartEvent.chartX : null;
  const chartY = typeof chartEvent.chartY === 'number' ? chartEvent.chartY : null;
  if (
    chartWidth === null
    || chartHeight === null
    || chartWidth <= 0
    || chartHeight <= 0
    || chartX === null
    || chartY === null
  ) {
    return null;
  }
  return {
    x: clamp01(chartX / chartWidth),
    y: clamp01(chartY / chartHeight),
  } satisfies PointerRatios;
};

