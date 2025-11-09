import { useCallback } from 'react';
import type { ChartPointerEvent } from './types.ts';

type UseMeasurementPointerHandlersArgs = {
  isSelectingZoom: boolean;
  consumeSkip: () => boolean;
  clearSkip: () => void;
  handleCursorClick: (chartEvent: ChartPointerEvent | null) => void;
  handleCursorMouseDown: (event: ChartPointerEvent | null) => boolean;
  handleCursorMouseMove: (event: ChartPointerEvent | null) => void;
  handleCursorMouseUp: (event: ChartPointerEvent | null) => void;
  handleCursorMouseLeave: () => void;
  isDraggingCursor: () => boolean;
  beginZoomSelection: (event: ChartPointerEvent | null) => void;
  updateZoomPointer: (event: ChartPointerEvent | null) => void;
  finalizeZoomSelection: (event: ChartPointerEvent | null) => void;
  cancelZoomSelection: () => void;
};

type UseMeasurementPointerHandlersResult = {
  handleChartClick: (chartEvent: ChartPointerEvent | null) => void;
  handleChartMouseDown: (event: ChartPointerEvent | null) => void;
  handleChartMouseMove: (event: ChartPointerEvent | null) => void;
  handleChartMouseUp: (event: ChartPointerEvent | null) => void;
  handleChartMouseLeave: () => void;
};

export const useMeasurementPointerHandlers = ({
  isSelectingZoom,
  consumeSkip,
  clearSkip,
  handleCursorClick,
  handleCursorMouseDown,
  handleCursorMouseMove,
  handleCursorMouseUp,
  handleCursorMouseLeave,
  isDraggingCursor,
  beginZoomSelection,
  updateZoomPointer,
  finalizeZoomSelection,
  cancelZoomSelection,
}: UseMeasurementPointerHandlersArgs): UseMeasurementPointerHandlersResult => {
  const handleChartClick = useCallback((chartEvent: ChartPointerEvent | null) => {
    if (consumeSkip()) {
      return;
    }
    if (isSelectingZoom) {
      clearSkip();
      return;
    }
    handleCursorClick(chartEvent);
  }, [clearSkip, consumeSkip, handleCursorClick, isSelectingZoom]);

  const handleChartMouseDown = useCallback((event: ChartPointerEvent | null) => {
    if (handleCursorMouseDown(event)) {
      return;
    }
    beginZoomSelection(event);
  }, [beginZoomSelection, handleCursorMouseDown]);

  const handleChartMouseMove = useCallback((event: ChartPointerEvent | null) => {
    handleCursorMouseMove(event);
    if (!isDraggingCursor()) {
      updateZoomPointer(event);
    }
  }, [handleCursorMouseMove, isDraggingCursor, updateZoomPointer]);

  const handleChartMouseUp = useCallback((event: ChartPointerEvent | null) => {
    const wasDragging = isDraggingCursor();
    handleCursorMouseUp(event);
    if (!wasDragging) {
      finalizeZoomSelection(event);
    }
  }, [finalizeZoomSelection, handleCursorMouseUp, isDraggingCursor]);

  const handleChartMouseLeave = useCallback(() => {
    const wasDragging = isDraggingCursor();
    handleCursorMouseLeave();
    if (!wasDragging) {
      cancelZoomSelection();
    }
  }, [cancelZoomSelection, handleCursorMouseLeave, isDraggingCursor]);

  return {
    handleChartClick,
    handleChartMouseDown,
    handleChartMouseMove,
    handleChartMouseUp,
    handleChartMouseLeave,
  } satisfies UseMeasurementPointerHandlersResult;
};
