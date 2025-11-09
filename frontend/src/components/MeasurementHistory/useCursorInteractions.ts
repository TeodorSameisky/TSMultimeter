import { useCallback, useRef } from 'react';
import { buildCursorSnapshot as buildCursorSnapshotFromConfig } from './cursorSnapshot.ts';
import type { MeasurementHistoryProps } from './types.ts';
import type { ChartDatum, ChartPointerEvent, CursorSnapshot, CursorState, SeriesSample } from './types.ts';
import type { CursorTraceHint, UseCursorStateResult } from './useCursorState.ts';
import { findClosestRecord } from './utils.ts';
import { useEventSampleResolver } from './useEventSampleResolver.ts';

const CURSOR_DRAG_TOLERANCE_PX = 12;

type DraggingCursor = {
  kind: 'primary' | 'secondary';
  dataKey: string;
  deviceId: string;
};

type CursorInteractionsArgs = {
  chartData: ChartDatum[];
  activeDomain: [number, number] | null;
  cursorState: CursorState;
  setCursorState: UseCursorStateResult['setCursorState'];
  cursorTraceHint: CursorTraceHint;
  cursorTraceKey: string;
  isAutoCursorTrace: boolean;
  resolvedChannelStyles: NonNullable<MeasurementHistoryProps['channelStyles']>;
  resetCursors: () => void;
  markClickSkipped: () => void;
  abortZoomSelection: () => void;
};

type CursorInteractions = {
  handleChartClick: (chartEvent: ChartPointerEvent | null) => void;
  handleChartMouseDown: (event: ChartPointerEvent | null) => boolean;
  handleChartMouseMove: (event: ChartPointerEvent | null) => void;
  handleChartMouseUp: (event: ChartPointerEvent | null) => void;
  handleChartMouseLeave: () => void;
  handleResetCursors: () => void;
  isDraggingCursor: () => boolean;
};

const computeCursorTolerance = (
  chartEvent: ChartPointerEvent | null,
  activeDomain: [number, number] | null,
): number => {
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
};

export const useCursorInteractions = ({
  chartData,
  activeDomain,
  cursorState,
  setCursorState,
  cursorTraceHint,
  cursorTraceKey,
  isAutoCursorTrace,
  resolvedChannelStyles,
  resetCursors,
  markClickSkipped,
  abortZoomSelection,
}: CursorInteractionsArgs): CursorInteractions => {
  const draggingCursorRef = useRef<DraggingCursor | null>(null);
  const { getEventRelativeTimestamp, resolveSampleFromEvent } = useEventSampleResolver({ chartData });

  const buildCursorSnapshot = useCallback(
    (sample: SeriesSample | undefined): CursorSnapshot | undefined => buildCursorSnapshotFromConfig({
      sample,
      cursorTraceKey,
      isAutoCursorTrace,
      resolvedChannelStyles,
      findClosestRecord: (timestamp: number) => findClosestRecord(chartData, timestamp),
    }),
    [chartData, cursorTraceKey, isAutoCursorTrace, resolvedChannelStyles],
  );

  const toggleCursorSnapshot = useCallback((snapshot: CursorSnapshot) => {
    setCursorState((prev) => {
      const next: CursorState = { ...prev };
      if (!next.primary) {
        next.primary = snapshot;
        return next;
      }
      if (!next.secondary) {
        if (snapshot.anchor.relativeTimestamp === next.primary.anchor.relativeTimestamp) {
          return prev;
        }
        next.secondary = snapshot;
        return next;
      }
      const primaryDelta = Math.abs(snapshot.anchor.relativeTimestamp - next.primary.anchor.relativeTimestamp);
      const secondaryDelta = Math.abs(snapshot.anchor.relativeTimestamp - next.secondary.anchor.relativeTimestamp);
      if (primaryDelta <= secondaryDelta) {
        next.primary = snapshot;
        return next;
      }
      next.secondary = snapshot;
      return next;
    });
  }, [setCursorState]);

  const handleChartClick = useCallback(
    (chartEvent: ChartPointerEvent | null) => {
      if (!chartEvent) {
        return;
      }
      const sample = resolveSampleFromEvent(chartEvent, cursorTraceHint);
      if (!sample) {
        return;
      }
      const snapshot = buildCursorSnapshot(sample);
      if (!snapshot) {
        return;
      }
      toggleCursorSnapshot(snapshot);
    },
    [buildCursorSnapshot, cursorTraceHint, resolveSampleFromEvent, toggleCursorSnapshot],
  );

  const startCursorDrag = useCallback(
    (chartEvent: ChartPointerEvent | null) => {
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
      const tolerance = computeCursorTolerance(chartEvent, activeDomain);
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
        const dragHint: DraggingCursor = {
          kind,
          dataKey: cursorSnapshot.anchorKey,
          deviceId: anchor.deviceId,
        };
        draggingCursorRef.current = dragHint;
        markClickSkipped();
        abortZoomSelection();
        const initialSample = resolveSampleFromEvent(chartEvent, dragHint);
        const snapshot = buildCursorSnapshot(initialSample);
        if (snapshot) {
          setCursorState((prev) => ({ ...prev, [kind]: snapshot } satisfies CursorState));
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
    },
    [abortZoomSelection, activeDomain, buildCursorSnapshot, cursorState, getEventRelativeTimestamp, markClickSkipped, resolveSampleFromEvent, setCursorState],
  );

  const handleChartMouseDown = useCallback(
    (event: ChartPointerEvent | null) => {
      draggingCursorRef.current = null;
      return startCursorDrag(event);
    },
    [startCursorDrag],
  );

  const handleChartMouseMove = useCallback(
    (event: ChartPointerEvent | null) => {
      const current = draggingCursorRef.current;
      if (!current) {
        return;
      }
      if (!event) {
        return;
      }
      const sample = resolveSampleFromEvent(event, current);
      const snapshot = buildCursorSnapshot(sample);
      if (snapshot) {
        setCursorState((prev) => ({ ...prev, [current.kind]: snapshot } satisfies CursorState));
      }
      markClickSkipped();
    },
    [buildCursorSnapshot, markClickSkipped, resolveSampleFromEvent, setCursorState],
  );

  const handleChartMouseUp = useCallback((_event: ChartPointerEvent | null) => {
    if (draggingCursorRef.current) {
      draggingCursorRef.current = null;
      markClickSkipped();
    }
  }, [markClickSkipped]);

  const handleChartMouseLeave = useCallback(() => {
    if (draggingCursorRef.current) {
      draggingCursorRef.current = null;
    }
  }, []);

  const handleResetCursors = useCallback(() => {
    draggingCursorRef.current = null;
    resetCursors();
  }, [resetCursors]);

  return {
    handleChartClick,
    handleChartMouseDown,
    handleChartMouseMove,
    handleChartMouseUp,
    handleChartMouseLeave,
    handleResetCursors,
    isDraggingCursor: () => Boolean(draggingCursorRef.current),
  } satisfies CursorInteractions;
};
