import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { ReferenceLine, Label } from 'recharts';
import type { Formatter } from 'recharts/types/component/DefaultTooltipContent';
import { formatMeasurementDisplay } from '../../utils/formatNumber.ts';
import { AxisScaleModal } from './AxisScaleModal';
import { useYAxisCollection } from './useYAxisCollection';
import {
  Card,
  CursorCard,
  CursorHeading,
  CursorSeriesAlias,
  CursorSeriesLabel,
  CursorSeriesList,
  CursorSeriesRow,
  CursorSeriesSwatch,
  CursorTime,
  ExportLegend,
  ExportLegendRow,
  ExportLegendSwatch,
  ExportLegendLabel,
} from './styled';
import {
  computeCursorDistance,
  exportSamplesToCsv,
  extractPointerRatios,
  formatRelativeTime,
  shouldApplyZoom,
  buildEquidistantTicks,
} from './utils';
import {
  ChartDatum,
  ChartPointerEvent,
  CursorSnapshot,
  CursorState,
  MeasurementHistoryProps,
  SeriesSample,
  ZoomFlashState,
  ZoomSelectionState,
} from './types';
import { useAxisScaleManager, useMeasurementDerivedState } from './hooks';
import { MeasurementChart } from './MeasurementChart';
import { AXIS_TICK_TARGET, DEFAULT_AXIS_COLOR, DEFAULT_UNIT, SCOPE_TITLE_STORAGE_KEY } from './constants';
import { ScopeHeader } from './ScopeHeader';
import { CursorSummary } from './CursorSummary';
import { useScopeTitle } from './useScopeTitle';
import { useScopeImageExport } from './useScopeImageExport';

const CURSOR_DRAG_TOLERANCE_PX = 12;
const META_PREFIX = 'meta:';

const resolveSeriesKey = (sample: SeriesSample): string => {
  const unit = sample.unit ?? DEFAULT_UNIT;
  return `${unit}|${sample.deviceId}`;
};

export const MeasurementHistory: React.FC<MeasurementHistoryProps> = ({
  history,
  channelStyles,
  onClearHistory,
}) => {
  const [cursorState, setCursorState] = useState<CursorState>({});
  const [viewDomain, setViewDomain] = useState<[number, number] | undefined>(undefined);
  const [viewLock, setViewLock] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [displayHistory, setDisplayHistory] = useState(history);
  const scopeCaptureRef = useRef<HTMLDivElement | null>(null);

  const { title: scopeTitle, update: updateScopeTitle, commit: commitScopeTitle } = useScopeTitle(
    SCOPE_TITLE_STORAGE_KEY,
    'Measurement Scope',
  );
  const { isExporting: isExportingImage, exportImage } = useScopeImageExport(scopeTitle);

  const handleExportImage = useCallback(() => {
    void exportImage(scopeCaptureRef.current);
  }, [exportImage]);

  const zoomStartRef = useRef<number | null>(null);
  const zoomStartRatioRef = useRef<number | null>(null);
  const skipClickRef = useRef(false);
  const [zoomSelection, setZoomSelection] = useState<ZoomSelectionState | null>(null);
  const [zoomFlash, setZoomFlash] = useState<ZoomFlashState | null>(null);
  const zoomSelectionRef = useRef<ZoomSelectionState | null>(null);
  const [isSelectingZoom, setIsSelectingZoom] = useState(false);
  const draggingCursorRef = useRef<{ kind: 'primary' | 'secondary'; dataKey: string; deviceId: string } | null>(null);
  const resolvedChannelStyles = useMemo(() => channelStyles ?? {}, [channelStyles]);
  const [cursorTraceKey, setCursorTraceKey] = useState<string>('auto');
  const isAutoCursorTrace = cursorTraceKey === 'auto';

  const updateZoomSelection = useCallback((next: ZoomSelectionState | null) => {
    zoomSelectionRef.current = next;
    setZoomSelection(next);
  }, []);

  useEffect(() => {
    if (!isPaused) {
      setDisplayHistory(history);
    }
  }, [history, isPaused]);

  useEffect(() => {
    if (!zoomFlash) {
      return;
    }
    if (!zoomFlash.fading) {
      const fadeTimer = window.setTimeout(() => {
        setZoomFlash((prev) => (prev ? { ...prev, fading: true } : prev));
      }, 16);
      return () => window.clearTimeout(fadeTimer);
    }
    const clearTimer = window.setTimeout(() => {
      setZoomFlash(null);
    }, 180);
    return () => window.clearTimeout(clearTimer);
  }, [zoomFlash]);

  const {
    allSamples,
    series,
    units,
    chartData,
    activeDomain,
    axisDomainsByUnit,
    axisPrecisionByUnit,
    zoomOverlayProps,
  } = useMeasurementDerivedState(displayHistory, channelStyles, viewDomain, zoomSelection, zoomFlash);

  const xAxisTicks = useMemo(() => {
    if (!activeDomain) {
      return undefined;
    }
    let [start, end] = activeDomain;
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return undefined;
    }
    if (Math.abs(end - start) < Number.EPSILON) {
      const padding = Math.max(Math.abs(start) * 0.1, 1);
      start -= padding;
      end += padding;
    }
    const ticks = buildEquidistantTicks(start, end, AXIS_TICK_TARGET);
    return ticks.length > 0 ? ticks : undefined;
  }, [activeDomain]);
  const measurementChartTickProps = xAxisTicks ? { xTicks: xAxisTicks } : undefined;

  const seriesColorMap = useMemo(() => {
    const map = new Map<string, string>();
    series.forEach(({ key, deviceId }) => {
      const style = resolvedChannelStyles[deviceId];
      map.set(key, style?.color ?? DEFAULT_AXIS_COLOR);
    });
    return map;
  }, [resolvedChannelStyles, series]);

  const exportLegendEntries = useMemo(() => (
    series
      .map(({ key, label, unit, deviceId }) => {
        const style = resolvedChannelStyles[deviceId];
        if (style?.enabled === false) {
          return null;
        }
        const color = style?.color ?? DEFAULT_AXIS_COLOR;
        const resolvedLabel = unit ? `${label} (${unit})` : label;
        return { key, color, label: resolvedLabel };
      })
      .filter((entry): entry is { key: string; color: string; label: string } => Boolean(entry))
  ), [resolvedChannelStyles, series]);

  const cursorTraceOptions = useMemo(
    () => series.map((entry) => ({
      key: entry.key,
      label: `${entry.label} (${entry.unit})`,
      color: seriesColorMap.get(entry.key) ?? DEFAULT_AXIS_COLOR,
    })),
    [series, seriesColorMap],
  );

  const cursorTraceDeviceId = useMemo(() => {
    if (isAutoCursorTrace) {
      return undefined;
    }
    return series.find((entry) => entry.key === cursorTraceKey)?.deviceId;
  }, [cursorTraceKey, isAutoCursorTrace, series]);

  const cursorTraceHint = useMemo(() => {
    if (isAutoCursorTrace) {
      return undefined;
    }
    if (cursorTraceDeviceId) {
      return { dataKey: cursorTraceKey, deviceId: cursorTraceDeviceId } as const;
    }
    return { dataKey: cursorTraceKey } as const;
  }, [cursorTraceDeviceId, cursorTraceKey, isAutoCursorTrace]);

  const currentTraceColor = useMemo(() => {
    if (isAutoCursorTrace) {
      return '#7f8c8d';
    }
    return seriesColorMap.get(cursorTraceKey) ?? '#7f8c8d';
  }, [cursorTraceKey, isAutoCursorTrace, seriesColorMap]);

  useEffect(() => {
    if (!isAutoCursorTrace && !series.some((entry) => entry.key === cursorTraceKey)) {
      setCursorTraceKey('auto');
    }
  }, [cursorTraceKey, isAutoCursorTrace, series, setCursorTraceKey]);

  useEffect(() => {
    setCursorState({});
  }, [cursorTraceKey, setCursorState]);

  const handleCursorTraceChange = useCallback((value: string) => {
    setCursorTraceKey(value);
  }, [setCursorTraceKey]);

  const {
    axisScales,
    setAxisScales,
    axisEditor,
    closeAxisEditor,
    handleAxisEditorChange,
    handleAxisEditorApply,
    handleAxisEditorAuto,
    toggleAxisLock,
    openAxisScale,
  } = useAxisScaleManager(axisDomainsByUnit);

  useEffect(() => {
    if (chartData.length === 0) {
      if (viewDomain) {
        setViewDomain(undefined);
      }
      setViewLock(false);
      return;
    }
    const firstPoint = chartData[0];
    const lastPoint = chartData[chartData.length - 1];
    if (typeof firstPoint?.relativeTimestamp !== 'number' || typeof lastPoint?.relativeTimestamp !== 'number') {
      if (!viewDomain) {
        setViewDomain(undefined);
      }
      return;
    }
    const first = firstPoint.relativeTimestamp;
    const last = lastPoint.relativeTimestamp;
    if (!viewLock) {
      if (!viewDomain || viewDomain[0] !== first || viewDomain[1] !== last) {
        setViewDomain([first, last]);
      }
      return;
    }
    if (!viewDomain) {
      setViewDomain([first, last]);
    }
  }, [chartData, viewDomain, viewLock]);

  const clearHistory = useCallback(() => {
    setDisplayHistory({});
    setCursorState({});
    setViewDomain(undefined);
    setViewLock(false);
    updateZoomSelection(null);
    zoomStartRef.current = null;
    onClearHistory?.();
  }, [onClearHistory, updateZoomSelection]);

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

  const findClosestRecord = useCallback((timestamp: number): ChartDatum | undefined => {
    if (!Number.isFinite(timestamp) || chartData.length === 0) {
      return undefined;
    }

    let low = 0;
    let high = chartData.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const record = chartData[mid];
      if (!record) {
        break;
      }
      const midValue = record.relativeTimestamp;
      if (midValue === timestamp) {
        return record;
      }
      if (midValue < timestamp) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const lowerIndex = Math.max(0, Math.min(chartData.length - 1, high));
    const upperIndex = Math.max(0, Math.min(chartData.length - 1, low));
    const lowerRecord = chartData[lowerIndex];
    const upperRecord = chartData[upperIndex];

    if (!lowerRecord) {
      return upperRecord;
    }
    if (!upperRecord) {
      return lowerRecord;
    }

    const lowerDelta = Math.abs(lowerRecord.relativeTimestamp - timestamp);
    const upperDelta = Math.abs(upperRecord.relativeTimestamp - timestamp);
    return lowerDelta <= upperDelta ? lowerRecord : upperRecord;
  }, [chartData]);

  const buildCursorSnapshot = useCallback(
    (sample: SeriesSample | undefined): CursorSnapshot | undefined => {
      if (!sample) {
        return undefined;
      }

      const targetKey = isAutoCursorTrace ? resolveSeriesKey(sample) : cursorTraceKey;

      const applyStyle = (entry: SeriesSample, key: string): SeriesSample | null => {
        const style = resolvedChannelStyles[entry.deviceId];
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

      const record = findClosestRecord(sample.relativeTimestamp);
      const baseEntries = record
        ? Object.entries(record)
            .filter(([key]) => key.startsWith(META_PREFIX))
            .map(([key, value]) => ({
              key: key.slice(META_PREFIX.length),
              sample: value as SeriesSample,
            }))
        : [{ key: resolveSeriesKey(sample), sample }];

      const sampleMap = new Map<string, SeriesSample>();

      baseEntries.forEach(({ key, sample: baseSample }) => {
        const styled = applyStyle(baseSample, key);
        if (styled) {
          sampleMap.set(key, styled);
        }
      });

      if (!sampleMap.has(targetKey)) {
        const styled = applyStyle(sample, targetKey);
        if (styled) {
          sampleMap.set(targetKey, styled);
        }
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
    },
    [cursorTraceKey, findClosestRecord, isAutoCursorTrace, resolvedChannelStyles],
  );

  const handleCursorToggle = useCallback((sample: SeriesSample | undefined) => {
    const snapshot = buildCursorSnapshot(sample);
    if (!snapshot) {
      return;
    }
    setCursorState((prev) => {
      if (!prev.primary) {
        return { primary: snapshot } satisfies CursorState;
      }
      if (!prev.secondary) {
        if (snapshot.anchor.relativeTimestamp === prev.primary.anchor.relativeTimestamp) {
          return prev;
        }
        return { primary: prev.primary, secondary: snapshot } satisfies CursorState;
      }

      const distanceToPrimary = Math.abs(snapshot.anchor.relativeTimestamp - prev.primary.anchor.relativeTimestamp);
      const distanceToSecondary = Math.abs(snapshot.anchor.relativeTimestamp - prev.secondary.anchor.relativeTimestamp);

      if (distanceToPrimary <= distanceToSecondary) {
        return { primary: snapshot, secondary: prev.secondary } satisfies CursorState;
      }
      return { primary: prev.primary, secondary: snapshot } satisfies CursorState;
    });
  }, [buildCursorSnapshot]);

  const resolveSampleFromEvent = useCallback(
    (chartEvent: ChartPointerEvent | null, hint?: { dataKey?: string; deviceId?: string }): SeriesSample | undefined => {
      if (!chartEvent) {
        return undefined;
      }

      const toSample = (payloadItem: { dataKey?: string | number; name?: string | number; payload?: ChartDatum }) => {
        if (!payloadItem?.payload) {
          return undefined;
        }
        const keyRaw = payloadItem.dataKey ?? payloadItem.name;
        if (keyRaw === undefined || keyRaw === null) {
          return undefined;
        }
        const key = String(keyRaw);
  const record = payloadItem.payload;
  const meta = record[`${META_PREFIX}${key}`] as SeriesSample | undefined;
        return meta;
      };

      const payloads = chartEvent.activePayload ?? [];
      const hasHint = Boolean(hint?.dataKey || hint?.deviceId);

      if (hint?.dataKey) {
        const match = payloads.find((item) => {
          const keyRaw = item.dataKey ?? item.name;
          return keyRaw !== undefined && keyRaw !== null && String(keyRaw) === hint.dataKey;
        });
        const sample = toSample(match ?? {});
        if (sample) {
          return sample;
        }
      }

      if (hint?.deviceId) {
        for (const item of payloads) {
          const sample = toSample(item);
          if (sample?.deviceId === hint.deviceId) {
            return sample;
          }
        }
      }

      if (!hasHint) {
        for (const item of payloads) {
          const sample = toSample(item);
          if (sample) {
            return sample;
          }
        }
      }

      const timestamp = getEventRelativeTimestamp(chartEvent);
      if (timestamp === null) {
        return undefined;
      }
      const closest = findClosestRecord(timestamp);
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
    [findClosestRecord, getEventRelativeTimestamp],
  );

  const computeCursorTolerance = useCallback((chartEvent: ChartPointerEvent | null) => {
    if (!chartEvent || !activeDomain) {
      return 0;
    }
    const [domainStart, domainEnd] = activeDomain;
    const width = chartEvent.chartWidth ?? null;
    const span = domainEnd - domainStart;
    if (!width || width <= 0 || !Number.isFinite(span) || span <= 0) {
      return 0;
    }
    return (span / width) * CURSOR_DRAG_TOLERANCE_PX;
  }, [activeDomain]);

  const startCursorDrag = useCallback((chartEvent: ChartPointerEvent | null) => {
    if (!chartEvent) {
      return false;
    }
    if (!cursorState.primary && !cursorState.secondary) {
      return false;
    }

    const timestamp = getEventRelativeTimestamp(chartEvent);
    if (timestamp === null) {
      return false;
    }

    const tolerance = computeCursorTolerance(chartEvent);
    const attempt = (kind: 'primary' | 'secondary'): boolean => {
      const cursorSnapshot = cursorState[kind];
      if (!cursorSnapshot) {
        return false;
      }

      const anchor = cursorSnapshot.anchor;
      const delta = Math.abs(anchor.relativeTimestamp - timestamp);
      if (!Number.isFinite(delta) || delta > tolerance) {
        return false;
      }

      const dragHint = {
        dataKey: cursorSnapshot.anchorKey,
        deviceId: anchor.deviceId,
      } satisfies { dataKey: string; deviceId: string };

      draggingCursorRef.current = {
        kind,
        ...dragHint,
      };
      skipClickRef.current = true;
      zoomStartRef.current = null;
      zoomStartRatioRef.current = null;
      setIsSelectingZoom(false);
      updateZoomSelection(null);

      const initialSample = resolveSampleFromEvent(chartEvent, dragHint);
      const snapshot = buildCursorSnapshot(initialSample);
      if (snapshot) {
        setCursorState((prev) => ({ ...prev, [kind]: snapshot }));
      }

      return true;
    };

    if (attempt('primary')) {
      return true;
    }
    if (attempt('secondary')) {
      return true;
    }
    return false;
  }, [buildCursorSnapshot, computeCursorTolerance, cursorState, resolveSampleFromEvent, setIsSelectingZoom, updateZoomSelection, getEventRelativeTimestamp]);

  const handleChartClick = useCallback((chartEvent: ChartPointerEvent | null) => {
    if (skipClickRef.current || isSelectingZoom) {
      skipClickRef.current = false;
      return;
    }
    if (!chartEvent) {
      return;
    }
    const sample = resolveSampleFromEvent(chartEvent, cursorTraceHint);
    if (sample) {
      handleCursorToggle(sample);
    }
  }, [cursorTraceHint, handleCursorToggle, isSelectingZoom, resolveSampleFromEvent]);

  const resetView = useCallback(() => {
    if (chartData.length === 0) {
      setViewDomain(undefined);
      updateZoomSelection(null);
      zoomStartRef.current = null;
      setViewLock(false);
      return;
    }
    const firstPoint = chartData[0];
    const lastPoint = chartData[chartData.length - 1];
    if (typeof firstPoint?.relativeTimestamp !== 'number' || typeof lastPoint?.relativeTimestamp !== 'number') {
      setViewDomain(undefined);
      return;
    }
    const first = firstPoint.relativeTimestamp;
    const last = lastPoint.relativeTimestamp;
    setViewDomain([first, last]);
    updateZoomSelection(null);
    zoomStartRef.current = null;
    setViewLock(false);
  }, [chartData, updateZoomSelection]);

  const handlePauseToggle = useCallback(() => {
    setIsPaused((prev) => {
      if (prev) {
        setDisplayHistory(history);
      }
      return !prev;
    });
  }, [history]);

  const handleResetCursors = useCallback(() => {
    draggingCursorRef.current = null;
    setCursorState({});
  }, []);

  const handleChartMouseDown = useCallback((event: ChartPointerEvent | null) => {
    draggingCursorRef.current = null;
    if (startCursorDrag(event)) {
      return;
    }
    if (!activeDomain || isSelectingZoom) {
      return;
    }
    if (!event) {
      return;
    }
    const pointer = extractPointerRatios(event);
    if (!pointer) {
      return;
    }
    const [domainStart, domainEnd] = activeDomain;
    const span = domainEnd - domainStart;
    if (!Number.isFinite(span) || span <= 0) {
      return;
    }
    const startValue = domainStart + pointer.x * span;
    setZoomFlash(null);
    zoomStartRef.current = startValue;
    zoomStartRatioRef.current = pointer.y;
    updateZoomSelection({
      xStart: startValue,
      xEnd: startValue,
      yStart: pointer.y,
      yEnd: pointer.y,
    });
    setIsSelectingZoom(true);
  }, [activeDomain, isSelectingZoom, startCursorDrag, updateZoomSelection]);

  const handleChartMouseMove = useCallback((event: ChartPointerEvent | null) => {
    if (draggingCursorRef.current) {
      if (!event) {
        return;
      }
      const { kind, dataKey, deviceId } = draggingCursorRef.current;
      const hint = { dataKey, deviceId } satisfies { dataKey: string; deviceId: string };
      const sample = resolveSampleFromEvent(event, hint);
      const snapshot = buildCursorSnapshot(sample);
      if (snapshot) {
        setCursorState((prev) => ({ ...prev, [kind]: snapshot }));
      }
      skipClickRef.current = true;
      return;
    }
    if (!isSelectingZoom || zoomStartRef.current === null || !activeDomain) {
      return;
    }
    if (!event) {
      return;
    }
    const pointer = extractPointerRatios(event);
    if (!pointer) {
      return;
    }
    const [domainStart, domainEnd] = activeDomain;
    const span = domainEnd - domainStart;
    if (!Number.isFinite(span) || span <= 0) {
      return;
    }
    const currentValue = domainStart + pointer.x * span;
    const start = zoomStartRef.current;
    const initialY = zoomStartRatioRef.current ?? pointer.y;
    updateZoomSelection({
      xStart: Math.min(start, currentValue),
      xEnd: Math.max(start, currentValue),
      yStart: initialY,
      yEnd: pointer.y,
    });
  }, [activeDomain, buildCursorSnapshot, isSelectingZoom, resolveSampleFromEvent, updateZoomSelection]);

  const finalizeZoom = useCallback((selection: ZoomSelectionState | null) => {
    if (!selection) {
      updateZoomSelection(null);
      return;
    }

    const { applyX, applyY } = shouldApplyZoom(selection);

    if (!applyX && !applyY) {
      updateZoomSelection(null);
      return;
    }

    if (applyX) {
      const xMin = Math.min(selection.xStart, selection.xEnd);
      const xMax = Math.max(selection.xStart, selection.xEnd);
      setViewDomain([xMin, xMax]);
      setViewLock(true);
    }

    if (applyY) {
      const selectionTop = Math.min(selection.yStart, selection.yEnd);
      const selectionBottom = Math.max(selection.yStart, selection.yEnd);
      setAxisScales((current) => {
        const next = { ...current };
        units.forEach(([unit]) => {
          const existing = current[unit];
          let domainMin: number | null = null;
          let domainMax: number | null = null;

          if (existing) {
            domainMin = existing.min;
            domainMax = existing.max;
          } else {
            const stats = axisDomainsByUnit.get(unit);
            if (!stats) {
              return;
            }
            if (stats.min === stats.max) {
              const padding = Math.abs(stats.min) * 0.1 || 1;
              domainMin = stats.min - padding;
              domainMax = stats.max + padding;
            } else {
              const padding = (stats.max - stats.min) * 0.1;
              domainMin = stats.min - padding;
              domainMax = stats.max + padding;
            }
          }

          if (domainMin === null || domainMax === null) {
            return;
          }

          const span = domainMax - domainMin;
          if (!Number.isFinite(span) || span <= 0) {
            return;
          }

          const newMax = domainMax - span * selectionTop;
          const newMin = domainMax - span * selectionBottom;

          if (!Number.isFinite(newMin) || !Number.isFinite(newMax) || newMin >= newMax) {
            return;
          }

          next[unit] = { min: newMin, max: newMax, locked: true };
        });
        return next;
      });
    }

    const resolvedYStart = applyY ? Math.min(selection.yStart, selection.yEnd) : 0;
    const resolvedYEnd = applyY ? Math.max(selection.yStart, selection.yEnd) : 1;

    setZoomFlash({
      xStart: applyX ? Math.min(selection.xStart, selection.xEnd) : selection.xStart,
      xEnd: applyX ? Math.max(selection.xStart, selection.xEnd) : selection.xEnd,
      yStart: resolvedYStart,
      yEnd: resolvedYEnd,
      fading: false,
    });
    updateZoomSelection(null);
    skipClickRef.current = true;
    window.setTimeout(() => {
      skipClickRef.current = false;
    }, 0);
  }, [axisDomainsByUnit, setAxisScales, setViewDomain, setViewLock, units, updateZoomSelection]);

  const handleChartMouseUp = useCallback((event: ChartPointerEvent | null) => {
    if (draggingCursorRef.current) {
      draggingCursorRef.current = null;
      skipClickRef.current = true;
      return;
    }
    if (!isSelectingZoom || zoomStartRef.current === null) {
      return;
    }
    let selection = zoomSelectionRef.current;
    if (selection && activeDomain && event) {
      const pointer = extractPointerRatios(event);
      if (pointer) {
        const [domainStart, domainEnd] = activeDomain;
        const span = domainEnd - domainStart;
        if (Number.isFinite(span) && span > 0) {
          const currentValue = domainStart + pointer.x * span;
          const startValue = zoomStartRef.current;
          selection = {
            xStart: Math.min(startValue, currentValue),
            xEnd: Math.max(startValue, currentValue),
            yStart: selection.yStart,
            yEnd: pointer.y,
          };
        }
      }
    }
    zoomStartRef.current = null;
    zoomStartRatioRef.current = null;
    setIsSelectingZoom(false);
    finalizeZoom(selection ?? null);
  }, [activeDomain, finalizeZoom, isSelectingZoom]);

  const handleChartMouseLeave = useCallback(() => {
    if (draggingCursorRef.current) {
      draggingCursorRef.current = null;
      return;
    }
    if (!isSelectingZoom) {
      return;
    }
    zoomStartRef.current = null;
    zoomStartRatioRef.current = null;
    setIsSelectingZoom(false);
    updateZoomSelection(null);
  }, [isSelectingZoom, updateZoomSelection]);

  const handleExportCsv = useCallback(() => {
    exportSamplesToCsv(allSamples, { channelStyles: resolvedChannelStyles });
  }, [allSamples, resolvedChannelStyles]);

  const distanceInfo = useMemo(
    () => computeCursorDistance(cursorState),
    [cursorState],
  );

  type TooltipFormatterPayload = {
    payload?: ChartDatum;
  };

  const tooltipFormatter = useCallback<Formatter<number, string>>((value, name, payload) => {
    const key = String(name);
    const entry = (payload as TooltipFormatterPayload | undefined)?.payload;
    const meta = entry?.[`${META_PREFIX}${key}`] as (SeriesSample & { tooltipLabel?: string }) | undefined;

    if (typeof value === 'number') {
      const display = formatMeasurementDisplay(value, meta?.unit, meta?.precision);
      return [display.combined, meta?.tooltipLabel ?? key];
    }

    return [value, meta?.tooltipLabel ?? key];
  }, []);

  const labelFormatter = useCallback((value: number) => formatRelativeTime(value), []);

  const yAxes = useYAxisCollection({
    units,
    axisScales,
    axisDomainsByUnit,
    axisPrecisionByUnit,
    openAxisScale,
    toggleAxisLock,
    isExporting: isExportingImage,
  });

  const renderCursorSnapshot = useCallback((label: string, snapshot: CursorSnapshot) => {
    const { anchor, anchorKey, series: snapshotSeries } = snapshot;
    return (
      <CursorCard key={label}>
        <CursorHeading>
          <strong>{label}</strong>
          <CursorTime>{formatRelativeTime(anchor.relativeTimestamp)}</CursorTime>
        </CursorHeading>
        <CursorSeriesList>
          {snapshotSeries.map(({ key, sample }) => {
            const color = seriesColorMap.get(key) ?? DEFAULT_AXIS_COLOR;
            const display = formatMeasurementDisplay(sample.value, sample.unit, sample.precision);
            return (
              <CursorSeriesRow
                key={`${label}-${key}`}
                $highlight={key === anchorKey}
              >
                <CursorSeriesLabel>
                  <CursorSeriesSwatch $color={color} />
                  <CursorSeriesAlias title={display.combined}>
                    {display.combined}
                  </CursorSeriesAlias>
                </CursorSeriesLabel>
              </CursorSeriesRow>
            );
          })}
        </CursorSeriesList>
      </CursorCard>
    );
  }, [seriesColorMap]);

  const referenceLines = useMemo(() => {
    const entries = [
      cursorState.primary ? { label: 'A' as const, snapshot: cursorState.primary } : null,
      cursorState.secondary ? { label: 'B' as const, snapshot: cursorState.secondary } : null,
    ].filter(Boolean) as Array<{ label: 'A' | 'B'; snapshot: CursorSnapshot }>;

    return entries.map(({ label, snapshot }) => {
      const anchor = snapshot.anchor;
      const unitId = anchor.unit ?? units[0]?.[0];
      const stroke = seriesColorMap.get(snapshot.anchorKey) ?? '#e74c3c';
      return (
        <ReferenceLine
          key={`cursor-${label}-${anchor.timestamp}`}
          x={anchor.relativeTimestamp}
          stroke={stroke}
          strokeDasharray="3 3"
          yAxisId={unitId}
          isFront
        >
          <Label
            position="insideTop"
            content={({ viewBox }) => {
              if (!viewBox || typeof (viewBox as any).x !== 'number' || typeof (viewBox as any).y !== 'number') {
                return null;
              }
              const { x, y } = viewBox as { x: number; y: number };
              const radius = 10;
              return (
                <g transform={`translate(${x}, ${y + radius + 6})`}>
                  <circle cx={0} cy={0} r={radius} fill="#ffffff" stroke={stroke} strokeWidth={2} />
                  <text
                    x={0}
                    y={4}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={600}
                    fill={stroke}
                  >
                    {label}
                  </text>
                </g>
              );
            }}
          />
        </ReferenceLine>
      );
    });
  }, [cursorState, seriesColorMap, units]);

  return (
    <Card ref={scopeCaptureRef}>
      <ScopeHeader
        scopeTitle={scopeTitle}
        onTitleChange={updateScopeTitle}
        onTitleBlur={commitScopeTitle}
        cursorTraceKey={cursorTraceKey}
        cursorTraceOptions={cursorTraceOptions}
        currentTraceColor={currentTraceColor}
        onCursorTraceChange={handleCursorTraceChange}
        isPaused={isPaused}
        onPauseToggle={handlePauseToggle}
        onAutoFit={resetView}
        onResetCursors={handleResetCursors}
        onExportImage={handleExportImage}
        isExportingImage={isExportingImage}
        onExportCsv={handleExportCsv}
        canExportCsv={chartData.length > 0}
        onClearHistory={clearHistory}
      />

      <MeasurementChart
        chartData={chartData}
        viewDomain={viewDomain}
        onChartClick={handleChartClick}
        onMouseDown={handleChartMouseDown}
        onMouseMove={handleChartMouseMove}
        onMouseUp={handleChartMouseUp}
        onMouseLeave={handleChartMouseLeave}
        yAxes={yAxes}
        series={series}
        channelStyles={resolvedChannelStyles}
        referenceLines={referenceLines}
        zoomOverlayProps={zoomOverlayProps}
        zoomSelection={zoomSelection}
        zoomFlash={zoomFlash}
        tooltipFormatter={tooltipFormatter}
        labelFormatter={labelFormatter}
        {...(measurementChartTickProps ?? undefined)}
      />

      {exportLegendEntries.length > 0 && (
        <ExportLegend $visible={isExportingImage} aria-hidden={!isExportingImage}>
          {exportLegendEntries.map((entry) => (
            <ExportLegendRow key={entry.key}>
              <ExportLegendSwatch $color={entry.color} />
              <ExportLegendLabel>{entry.label}</ExportLegendLabel>
            </ExportLegendRow>
          ))}
        </ExportLegend>
      )}

      <CursorSummary
        cursorState={cursorState}
        renderCursorSnapshot={renderCursorSnapshot}
        distanceInfo={distanceInfo}
      />

      {axisEditor && (
        <AxisScaleModal
          editor={axisEditor}
          onChange={handleAxisEditorChange}
          onAuto={handleAxisEditorAuto}
          onClose={closeAxisEditor}
          onApply={handleAxisEditorApply}
        />
      )}
    </Card>
  );
};
