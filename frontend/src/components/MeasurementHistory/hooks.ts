import { useMemo, useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import type { MeasurementSample } from '../../types/deviceData.ts';
import {
  buildAxisDomains,
  buildAxisPrecision,
  buildChartData,
  clampOverlay,
  createDataSeries,
  deriveUnits,
} from './utils';
import { AXIS_TICK_TARGET } from './constants';
import type {
  ChannelStyleMap,
  ChartDatum,
  MeasurementSeries,
  ZoomFlashState,
  ZoomOverlayProps,
  ZoomSelectionState,
  AxisEditorState,
  AxisScaleSetting,
  AxisScaleSettings,
} from './types';

export type MeasurementDerivedState = {
  allSamples: MeasurementSample[];
  series: MeasurementSeries[];
  units: Array<[string, string]>;
  chartData: ChartDatum[];
  activeDomain: [number, number] | null;
  axisDomainsByUnit: Map<string, { min: number; max: number }>;
  axisPrecisionByUnit: Map<string, number>;
  overlaySelection: ZoomSelectionState | ZoomFlashState | null;
  zoomOverlayProps: ZoomOverlayProps | null;
};

export type AxisScaleManager = {
  axisScales: AxisScaleSettings;
  setAxisScales: Dispatch<SetStateAction<AxisScaleSettings>>;
  axisEditor: AxisEditorState | null;
  closeAxisEditor: () => void;
  handleAxisEditorChange: (field: 'min' | 'max' | 'tickCount', value: string) => void;
  handleAxisEditorApply: () => void;
  handleAxisEditorAuto: () => void;
  toggleAxisLock: (unit: string) => void;
  openAxisScale: (unit: string) => void;
};

const buildSampleList = (history: Record<string, MeasurementSample[]>) => {
  const samples = Object.values(history).flat();
  return samples.sort((a, b) => a.timestamp - b.timestamp);
};

export const useMeasurementDerivedState = (
  displayHistory: Record<string, MeasurementSample[]>,
  channelStyles: ChannelStyleMap | undefined,
  viewDomain: [number, number] | undefined,
  zoomSelection: ZoomSelectionState | null,
  zoomFlash: ZoomFlashState | null,
): MeasurementDerivedState => {
  const allSamples = useMemo(() => buildSampleList(displayHistory), [displayHistory]);

  const series = useMemo(
    () => createDataSeries(allSamples, channelStyles),
    [allSamples, channelStyles],
  );

  const units = useMemo(
    () => deriveUnits(series, channelStyles),
    [series, channelStyles],
  );

  const chartData = useMemo(
    () => buildChartData(allSamples, channelStyles),
    [allSamples, channelStyles],
  );

  const activeDomain = useMemo<[number, number] | null>(() => {
    if (viewDomain) {
      return viewDomain;
    }
    if (chartData.length === 0) {
      return null;
    }
    const firstPoint = chartData[0];
    const lastPoint = chartData[chartData.length - 1];
    if (typeof firstPoint?.relativeTimestamp !== 'number' || typeof lastPoint?.relativeTimestamp !== 'number') {
      return null;
    }
    return [firstPoint.relativeTimestamp, lastPoint.relativeTimestamp];
  }, [viewDomain, chartData]);

  const overlaySelection = useMemo(
    () => (zoomSelection ?? zoomFlash),
    [zoomFlash, zoomSelection],
  );

  const zoomOverlayProps = useMemo<ZoomOverlayProps | null>(() => {
    if (!overlaySelection || !activeDomain) {
      return null;
    }
    return clampOverlay(overlaySelection, activeDomain);
  }, [overlaySelection, activeDomain]);

  const axisDomainsByUnit = useMemo(
    () => buildAxisDomains(series, channelStyles, viewDomain),
    [series, channelStyles, viewDomain],
  );

  const axisPrecisionByUnit = useMemo(
    () => buildAxisPrecision(series),
    [series],
  );

  return {
    allSamples,
    series,
    units,
    chartData,
    activeDomain,
    axisDomainsByUnit,
    axisPrecisionByUnit,
    overlaySelection,
    zoomOverlayProps,
  };
};

export const useAxisScaleManager = (axisDomainsByUnit: Map<string, { min: number; max: number }>): AxisScaleManager => {
  const [axisScales, setAxisScales] = useState<AxisScaleSettings>({});
  const [axisEditor, setAxisEditor] = useState<AxisEditorState | null>(null);

  const closeAxisEditor = useCallback(() => {
    setAxisEditor(null);
  }, []);

  const handleAxisEditorChange = useCallback((field: 'min' | 'max' | 'tickCount', value: string) => {
    setAxisEditor((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        unit: prev.unit,
        min: field === 'min' ? value : prev.min,
        max: field === 'max' ? value : prev.max,
        tickCount: field === 'tickCount' ? value : prev.tickCount,
      } satisfies AxisEditorState;
    });
  }, []);

  const handleAxisEditorApply = useCallback(() => {
    setAxisEditor((prev) => {
      if (!prev) {
        return prev;
      }
      const minText = prev.min.trim();
      const maxText = prev.max.trim();
      const tickText = prev.tickCount.trim();

      const hasMin = minText.length > 0;
      const hasMax = maxText.length > 0;

      if (hasMin !== hasMax) {
        return { ...prev, error: 'Provide both minimum and maximum or leave both blank.' } satisfies AxisEditorState;
      }

      let minValue: number | undefined;
      let maxValue: number | undefined;

      if (hasMin && hasMax) {
        minValue = Number(minText);
        maxValue = Number(maxText);
        if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
          return { ...prev, error: 'Enter numeric bounds for min/max.' } satisfies AxisEditorState;
        }
        if (minValue >= maxValue) {
          return { ...prev, error: 'Minimum must be less than maximum.' } satisfies AxisEditorState;
        }
      }

      let tickValue: number | undefined;
      if (tickText.length > 0) {
        const parsed = Number(tickText);
        if (!Number.isFinite(parsed)) {
          return { ...prev, error: 'Enter a numeric tick count.' } satisfies AxisEditorState;
        }
        const integer = Math.trunc(parsed);
        if (Math.abs(integer - parsed) > Number.EPSILON) {
          return { ...prev, error: 'Tick count must be a whole number.' } satisfies AxisEditorState;
        }
        if (integer < 2) {
          return { ...prev, error: 'Tick count must be at least 2.' } satisfies AxisEditorState;
        }
        tickValue = integer;
      }

      setAxisScales((current) => {
        const existing = current[prev.unit];
        const nextEntry: AxisScaleSetting = existing ? { ...existing } : {};

        if (minValue !== undefined && maxValue !== undefined) {
          nextEntry.min = minValue;
          nextEntry.max = maxValue;
          nextEntry.locked = true;
        } else {
          delete nextEntry.min;
          delete nextEntry.max;
          delete nextEntry.locked;
        }

        if (tickValue !== undefined) {
          nextEntry.tickCount = tickValue;
        } else {
          delete nextEntry.tickCount;
        }

        const hasConfig = (
          typeof nextEntry.min === 'number'
          || typeof nextEntry.max === 'number'
          || typeof nextEntry.tickCount === 'number'
          || nextEntry.locked === true
        );

        if (!hasConfig) {
          if (!current[prev.unit]) {
            return current;
          }
          const { [prev.unit]: _removed, ...rest } = current;
          return rest;
        }

        return {
          ...current,
          [prev.unit]: nextEntry,
        } satisfies AxisScaleSettings;
      });
      return null;
    });
  }, [setAxisScales]);

  const handleAxisEditorAuto = useCallback(() => {
    setAxisEditor((prev) => {
      if (!prev) {
        return prev;
      }
      setAxisScales((current) => {
        const existing = current[prev.unit];
        if (!existing) {
          return current;
        }
        const next: AxisScaleSettings = { ...current };
        if (typeof existing.tickCount === 'number') {
          next[prev.unit] = { tickCount: existing.tickCount };
        } else {
          delete next[prev.unit];
        }
        return next;
      });
      return null;
    });
  }, [setAxisScales]);

  const toggleAxisLock = useCallback((unit: string) => {
    setAxisScales((current) => {
      const next: AxisScaleSettings = { ...current };
      const existing = next[unit];
      if (existing?.locked) {
        if (typeof existing.tickCount === 'number') {
          next[unit] = { tickCount: existing.tickCount };
        } else {
          delete next[unit];
        }
        return next;
      }
      const stats = axisDomainsByUnit.get(unit);
      if (!stats) {
        return current;
      }
      const padding = stats.min === stats.max
        ? (Math.abs(stats.min) * 0.1 || 1)
        : ((stats.max - stats.min) * 0.1);
      next[unit] = {
        min: stats.min - padding,
        max: stats.max + padding,
        locked: true,
        tickCount: existing?.tickCount ?? AXIS_TICK_TARGET,
      } satisfies AxisScaleSetting;
      return next;
    });
  }, [axisDomainsByUnit]);

  const openAxisScale = useCallback((unit: string) => {
    const current = axisScales[unit];
    const domain = axisDomainsByUnit.get(unit);
    const fallbackMin = domain ? domain.min : -1;
    const fallbackMax = domain ? domain.max : 1;
    const min = typeof current?.min === 'number' ? current.min : fallbackMin;
    const max = typeof current?.max === 'number' ? current.max : fallbackMax;
    const tickCount = current?.tickCount;
    setAxisEditor({
      unit,
      min: Number.isFinite(min) ? String(min) : '',
      max: Number.isFinite(max) ? String(max) : '',
      tickCount: typeof tickCount === 'number' && Number.isFinite(tickCount)
        ? String(tickCount)
        : '',
    });
  }, [axisDomainsByUnit, axisScales]);

  return {
    axisScales,
    setAxisScales,
    axisEditor,
    closeAxisEditor,
    handleAxisEditorChange,
    handleAxisEditorApply,
    handleAxisEditorAuto,
    toggleAxisLock,
    openAxisScale,
  } satisfies AxisScaleManager;
};

export { useCursorState } from './useCursorState.ts';
export { useCursorInteractions } from './useCursorInteractions.ts';
export { useHistoryPlayback } from './useHistoryPlayback.ts';
export { useSkipNextClick } from './useSkipNextClick.ts';
export { useMeasurementPointerHandlers } from './useMeasurementPointerHandlers.ts';
export { useCursorDistance } from './useCursorDistance.ts';
export type { CursorDistance } from './useCursorDistance.ts';
export { useTooltipFormatters } from './useTooltipFormatters.ts';
export { useZoomController } from './useZoomController.ts';
