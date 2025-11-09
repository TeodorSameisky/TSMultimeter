import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { extractPointerRatios, shouldApplyZoom } from './utils.ts';
import type {
  AxisScaleSettings,
  ChartDatum,
  ChartPointerEvent,
  ZoomFlashState,
  ZoomSelectionState,
} from './types.ts';

type ZoomControllerArgs = {
  activeDomain: [number, number] | null;
  chartData: ChartDatum[];
  units: Array<[string, string]>;
  axisDomainsByUnit: Map<string, { min: number; max: number }>;
  setAxisScales: Dispatch<SetStateAction<AxisScaleSettings>>;
  viewDomain: [number, number] | undefined;
  setViewDomain: Dispatch<SetStateAction<[number, number] | undefined>>;
  zoomSelection: ZoomSelectionState | null;
  setZoomSelection: Dispatch<SetStateAction<ZoomSelectionState | null>>;
  zoomFlash: ZoomFlashState | null;
  setZoomFlash: Dispatch<SetStateAction<ZoomFlashState | null>>;
  isSelectingZoom: boolean;
  setIsSelectingZoom: Dispatch<SetStateAction<boolean>>;
  onSkipNextClick: () => void;
};

type ZoomController = {
  resetView: () => void;
  clearZoomState: () => void;
  beginZoomSelection: (event: ChartPointerEvent | null) => void;
  updateZoomPointer: (event: ChartPointerEvent | null) => void;
  finalizeZoomSelection: (event: ChartPointerEvent | null) => void;
  cancelZoomSelection: () => void;
  abortZoomSelection: () => void;
};

const useZoomController = ({
  activeDomain,
  chartData,
  units,
  axisDomainsByUnit,
  setAxisScales,
  viewDomain,
  setViewDomain,
  zoomSelection,
  setZoomSelection,
  zoomFlash,
  setZoomFlash,
  isSelectingZoom,
  setIsSelectingZoom,
  onSkipNextClick,
}: ZoomControllerArgs): ZoomController => {
  const [viewLock, setViewLock] = useState(false);
  const zoomStartRef = useRef<number | null>(null);
  const zoomStartRatioRef = useRef<number | null>(null);
  const zoomSelectionRef = useRef<ZoomSelectionState | null>(zoomSelection);

  useEffect(() => {
    zoomSelectionRef.current = zoomSelection;
  }, [zoomSelection]);

  const updateZoomSelection = useCallback((next: ZoomSelectionState | null) => {
    zoomSelectionRef.current = next;
    setZoomSelection(next);
  }, [setZoomSelection]);

  const abortZoomSelection = useCallback(() => {
    zoomStartRef.current = null;
    zoomStartRatioRef.current = null;
    if (isSelectingZoom) {
      setIsSelectingZoom(false);
    }
    updateZoomSelection(null);
  }, [isSelectingZoom, setIsSelectingZoom, updateZoomSelection]);

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
  }, [setZoomFlash, zoomFlash]);

  useEffect(() => {
    if (chartData.length === 0) {
      if (viewDomain) {
        setViewDomain(undefined);
      }
      if (viewLock) {
        setViewLock(false);
      }
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
  }, [chartData, setViewDomain, viewDomain, viewLock]);

  const clearZoomState = useCallback(() => {
    setViewDomain(undefined);
    setViewLock(false);
    zoomStartRef.current = null;
    zoomStartRatioRef.current = null;
    updateZoomSelection(null);
    setZoomFlash(null);
    setIsSelectingZoom(false);
    setAxisScales((current) => (Object.keys(current).length === 0 ? current : {}));
  }, [setAxisScales, setIsSelectingZoom, setViewDomain, setZoomFlash, updateZoomSelection]);

  const resetView = useCallback(() => {
    setAxisScales((current) => (Object.keys(current).length === 0 ? current : {}));
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
    setViewDomain([firstPoint.relativeTimestamp, lastPoint.relativeTimestamp]);
    updateZoomSelection(null);
    zoomStartRef.current = null;
    zoomStartRatioRef.current = null;
    setViewLock(false);
  }, [chartData, setAxisScales, setViewDomain, updateZoomSelection]);

  const beginZoomSelection = useCallback((event: ChartPointerEvent | null) => {
    if (!activeDomain || isSelectingZoom || !event) {
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
  }, [activeDomain, isSelectingZoom, setIsSelectingZoom, setZoomFlash, updateZoomSelection]);

  const updateZoomPointer = useCallback((event: ChartPointerEvent | null) => {
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
  }, [activeDomain, isSelectingZoom, updateZoomSelection]);

  const finalizeZoomSelection = useCallback((event: ChartPointerEvent | null) => {
    const existingSelection = zoomSelectionRef.current;
    zoomStartRef.current = null;
    zoomStartRatioRef.current = null;
    setIsSelectingZoom(false);

    if (!existingSelection) {
      return;
    }

    let selection = existingSelection;
    if (activeDomain && event) {
      const pointer = extractPointerRatios(event);
      if (pointer) {
        const [domainStart, domainEnd] = activeDomain;
        const span = domainEnd - domainStart;
        if (Number.isFinite(span) && span > 0) {
          const currentValue = domainStart + pointer.x * span;
          selection = {
            xStart: Math.min(existingSelection.xStart, currentValue),
            xEnd: Math.max(existingSelection.xStart, currentValue),
            yStart: existingSelection.yStart,
            yEnd: pointer.y,
          } satisfies ZoomSelectionState;
        }
      }
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
        const next = { ...current } satisfies AxisScaleSettings;
        units.forEach(([unit]) => {
          const existing = current[unit];
          let domainMin: number | null = null;
          let domainMax: number | null = null;

          if (existing && typeof existing.min === 'number' && typeof existing.max === 'number') {
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

          const tickCount = typeof existing?.tickCount === 'number' ? existing.tickCount : undefined;
          next[unit] = {
            min: newMin,
            max: newMax,
            locked: true,
            ...(tickCount !== undefined ? { tickCount } : {}),
          };
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
    onSkipNextClick();
  }, [activeDomain, axisDomainsByUnit, onSkipNextClick, setAxisScales, setIsSelectingZoom, setViewDomain, setZoomFlash, units, updateZoomSelection]);

  const cancelZoomSelection = useCallback(() => {
    if (!isSelectingZoom) {
      return;
    }
    zoomStartRef.current = null;
    zoomStartRatioRef.current = null;
    setIsSelectingZoom(false);
    updateZoomSelection(null);
  }, [isSelectingZoom, setIsSelectingZoom, updateZoomSelection]);

  return useMemo(() => ({
    resetView,
    clearZoomState,
    beginZoomSelection,
    updateZoomPointer,
    finalizeZoomSelection,
    cancelZoomSelection,
    abortZoomSelection,
  }), [abortZoomSelection, beginZoomSelection, cancelZoomSelection, clearZoomState, finalizeZoomSelection, resetView, updateZoomPointer]);
};

export { useZoomController };
