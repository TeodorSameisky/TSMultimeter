import { useMemo, useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import type { MeasurementSample } from '../../hooks/useDevice';
import {
  buildAxisDomains,
  buildAxisPrecision,
  buildChartData,
  clampOverlay,
  createDataSeries,
  deriveUnits,
} from './utils';
import type {
  ChannelStyleMap,
  ChartDatum,
  MeasurementSeries,
  ZoomFlashState,
  ZoomOverlayProps,
  ZoomSelectionState,
  AxisEditorState,
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
  handleAxisEditorChange: (field: 'min' | 'max', value: string) => void;
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

  const handleAxisEditorChange = useCallback((field: 'min' | 'max', value: string) => {
    setAxisEditor((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        unit: prev.unit,
        min: field === 'min' ? value : prev.min,
        max: field === 'max' ? value : prev.max,
      } satisfies AxisEditorState;
    });
  }, []);

  const handleAxisEditorApply = useCallback(() => {
    setAxisEditor((prev) => {
      if (!prev) {
        return prev;
      }
      const minValue = Number(prev.min);
      const maxValue = Number(prev.max);
      if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
        return { ...prev, error: 'Enter numeric bounds for min/max.' } satisfies AxisEditorState;
      }
      if (minValue >= maxValue) {
        return { ...prev, error: 'Minimum must be less than maximum.' } satisfies AxisEditorState;
      }
      setAxisScales((current) => ({
        ...current,
        [prev.unit]: { min: minValue, max: maxValue, locked: true },
      }));
      return null;
    });
  }, []);

  const handleAxisEditorAuto = useCallback(() => {
    setAxisEditor((prev) => {
      if (!prev) {
        return prev;
      }
      setAxisScales((current) => {
        const next = { ...current } satisfies AxisScaleSettings;
        delete next[prev.unit];
        return next;
      });
      return null;
    });
  }, []);

  const toggleAxisLock = useCallback((unit: string) => {
    setAxisScales((current) => {
      const next = { ...current } satisfies AxisScaleSettings;
      const existing = next[unit];
      if (existing?.locked) {
        delete next[unit];
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
      };
      return next;
    });
  }, [axisDomainsByUnit]);

  const openAxisScale = useCallback((unit: string) => {
    const current = axisScales[unit];
    const domain = axisDomainsByUnit.get(unit);
    const fallbackMin = domain ? domain.min : -1;
    const fallbackMax = domain ? domain.max : 1;
    const min = current ? current.min : fallbackMin;
    const max = current ? current.max : fallbackMax;
    setAxisEditor({
      unit,
      min: Number.isFinite(min) ? String(min) : '0',
      max: Number.isFinite(max) ? String(max) : '1',
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
