import { useCallback, useMemo, useState } from 'react';
import {
  useAxisScaleManager,
  useCursorDistance,
  useCursorInteractions,
  useCursorState,
  useHistoryPlayback,
  useMeasurementDerivedState,
  useMeasurementPointerHandlers,
  useSkipNextClick,
  useTooltipFormatters,
  useZoomController,
} from './hooks.ts';
import { useExportLegend } from './useExportLegend.ts';
import { useMeasurementTicks } from './useMeasurementTicks.ts';
import { exportSamplesToCsv } from './utils.ts';
import {
  ChartDatum,
  ChartPointerEvent,
  CursorState,
  MeasurementHistoryProps,
  ZoomFlashState,
  ZoomSelectionState,
} from './types.ts';
import type { CursorDistance } from './hooks.ts';

type MeasurementHistoryControllerArgs = {
  history: MeasurementHistoryProps['history'];
  channelStyles?: MeasurementHistoryProps['channelStyles'];
  onClearHistory?: MeasurementHistoryProps['onClearHistory'];
};

type CursorTraceOption = {
  key: string;
  label: string;
  color: string;
};

type TooltipFormatters = ReturnType<typeof useTooltipFormatters>;

type PointerHandlers = {
  handleChartClick: (chartEvent: ChartPointerEvent | null) => void;
  handleChartMouseDown: (event: ChartPointerEvent | null) => void;
  handleChartMouseMove: (event: ChartPointerEvent | null) => void;
  handleChartMouseUp: (event: ChartPointerEvent | null) => void;
  handleChartMouseLeave: () => void;
};

type CursorControls = {
  state: CursorState;
  seriesColorMap: Map<string, string>;
  traceKey: string;
  traceOptions: CursorTraceOption[];
  currentTraceColor: string;
  handleTraceChange: (value: string) => void;
  reset: () => void;
  distanceInfo: CursorDistance;
};

type ZoomControls = {
  viewDomain: [number, number] | undefined;
  selection: ZoomSelectionState | null;
  flash: ZoomFlashState | null;
  overlayProps: ReturnType<typeof useMeasurementDerivedState>['zoomOverlayProps'];
  resetView: () => void;
};

type AxisControls = {
  units: ReturnType<typeof useMeasurementDerivedState>['units'];
  scales: ReturnType<typeof useAxisScaleManager>['axisScales'];
  domainsByUnit: ReturnType<typeof useMeasurementDerivedState>['axisDomainsByUnit'];
  precisionByUnit: ReturnType<typeof useMeasurementDerivedState>['axisPrecisionByUnit'];
  openScale: ReturnType<typeof useAxisScaleManager>['openAxisScale'];
  toggleLock: ReturnType<typeof useAxisScaleManager>['toggleAxisLock'];
  editor: ReturnType<typeof useAxisScaleManager>['axisEditor'];
  closeEditor: ReturnType<typeof useAxisScaleManager>['closeAxisEditor'];
  handleEditorChange: ReturnType<typeof useAxisScaleManager>['handleAxisEditorChange'];
  handleEditorApply: ReturnType<typeof useAxisScaleManager>['handleAxisEditorApply'];
  handleEditorAuto: ReturnType<typeof useAxisScaleManager>['handleAxisEditorAuto'];
};

type MeasurementHistoryController = {
  chartData: ChartDatum[];
  measurementChartTickProps: { xTicks: number[] } | undefined;
  series: ReturnType<typeof useMeasurementDerivedState>['series'];
  resolvedChannelStyles: NonNullable<MeasurementHistoryProps['channelStyles']>;
  cursorControls: CursorControls;
  pointerHandlers: PointerHandlers;
  zoomControls: ZoomControls;
  axisControls: AxisControls;
  isPaused: boolean;
  handlePauseToggle: () => void;
  handleExportCsv: () => void;
  clearHistory: () => void;
  tooltipFormatter: TooltipFormatters['tooltipFormatter'];
  labelFormatter: TooltipFormatters['labelFormatter'];
  exportLegendEntries: Array<{ key: string; color: string; label: string }>;
};

export const useMeasurementHistoryController = ({
  history,
  channelStyles,
  onClearHistory,
}: MeasurementHistoryControllerArgs): MeasurementHistoryController => {
  const [viewDomain, setViewDomain] = useState<[number, number] | undefined>(undefined);
  const [zoomSelection, setZoomSelection] = useState<ZoomSelectionState | null>(null);
  const [zoomFlash, setZoomFlash] = useState<ZoomFlashState | null>(null);
  const [isSelectingZoom, setIsSelectingZoom] = useState(false);

  const resolvedChannelStyles = useMemo(() => channelStyles ?? {}, [channelStyles]);

  const { markSkip: markClickSkipped, consumeSkip, clearSkip } = useSkipNextClick();

  const {
    displayHistory,
    isPaused,
    handlePauseToggle,
    resetDisplayHistory,
  } = useHistoryPlayback({ history });

  const {
    allSamples,
    series,
    units,
    chartData,
    activeDomain,
    axisDomainsByUnit,
    axisPrecisionByUnit,
    zoomOverlayProps,
  } = useMeasurementDerivedState(displayHistory, resolvedChannelStyles, viewDomain, zoomSelection, zoomFlash);

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

  const {
    cursorState,
    setCursorState,
    resetCursors,
    cursorTraceKey,
    isAutoCursorTrace,
    cursorTraceOptions,
    currentTraceColor,
    handleCursorTraceChange,
    seriesColorMap,
    cursorTraceHint,
  } = useCursorState({
    series,
    resolvedChannelStyles,
  });

  const {
    resetView: resetZoomView,
    clearZoomState,
    beginZoomSelection,
    updateZoomPointer,
    finalizeZoomSelection,
    cancelZoomSelection,
    abortZoomSelection,
  } = useZoomController({
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
    onSkipNextClick: markClickSkipped,
  });

  const measurementChartTickProps = useMeasurementTicks(activeDomain);

  const exportLegendEntries = useExportLegend({
    series,
    channelStyles: resolvedChannelStyles,
  });

  const clearHistory = useCallback(() => {
    resetDisplayHistory();
    resetCursors();
    clearZoomState();
    onClearHistory?.();
  }, [clearZoomState, onClearHistory, resetCursors, resetDisplayHistory]);

  const {
    handleChartClick: handleCursorClick,
    handleChartMouseDown: handleCursorMouseDown,
    handleChartMouseMove: handleCursorMouseMove,
    handleChartMouseUp: handleCursorMouseUp,
    handleChartMouseLeave: handleCursorMouseLeave,
    handleResetCursors,
    isDraggingCursor,
  } = useCursorInteractions({
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
  });
  const pointerHandlers = useMeasurementPointerHandlers({
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
  });

  const handleExportCsv = useCallback(() => {
    exportSamplesToCsv(allSamples, { channelStyles: resolvedChannelStyles });
  }, [allSamples, resolvedChannelStyles]);

  const distanceInfo = useCursorDistance(cursorState);

  const { tooltipFormatter, labelFormatter } = useTooltipFormatters();

  const cursorControls = useMemo(() => ({
    state: cursorState,
    seriesColorMap,
    traceKey: cursorTraceKey,
    traceOptions: cursorTraceOptions,
    currentTraceColor,
    handleTraceChange: handleCursorTraceChange,
    reset: handleResetCursors,
    distanceInfo,
  }), [
    cursorState,
    seriesColorMap,
    cursorTraceKey,
    cursorTraceOptions,
    currentTraceColor,
    handleCursorTraceChange,
    handleResetCursors,
    distanceInfo,
  ]);

  const zoomControls = useMemo(() => ({
    viewDomain,
    selection: zoomSelection,
    flash: zoomFlash,
    overlayProps: zoomOverlayProps,
    resetView: resetZoomView,
  }), [viewDomain, zoomSelection, zoomFlash, zoomOverlayProps, resetZoomView]);

  const axisControls = useMemo(() => ({
    units,
    scales: axisScales,
    domainsByUnit: axisDomainsByUnit,
    precisionByUnit: axisPrecisionByUnit,
    openScale: openAxisScale,
    toggleLock: toggleAxisLock,
    editor: axisEditor,
    closeEditor: closeAxisEditor,
    handleEditorChange: handleAxisEditorChange,
    handleEditorApply: handleAxisEditorApply,
    handleEditorAuto: handleAxisEditorAuto,
  }), [
    axisScales,
    axisDomainsByUnit,
    axisPrecisionByUnit,
    units,
    openAxisScale,
    toggleAxisLock,
    axisEditor,
    closeAxisEditor,
    handleAxisEditorChange,
    handleAxisEditorApply,
    handleAxisEditorAuto,
  ]);

  return {
    chartData,
    measurementChartTickProps,
    series,
    resolvedChannelStyles,
    cursorControls,
    pointerHandlers,
    zoomControls,
    axisControls,
    isPaused,
    handlePauseToggle,
    handleExportCsv,
    clearHistory,
    tooltipFormatter,
    labelFormatter,
    exportLegendEntries,
  } satisfies MeasurementHistoryController;
};
