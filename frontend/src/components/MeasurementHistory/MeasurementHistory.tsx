import { useCallback, useMemo, useRef } from 'react';
import { ReferenceLine, Label } from 'recharts';
import { AxisScaleModal } from './AxisScaleModal';
import { useYAxisCollection } from './useYAxisCollection';
import {
  Card,
  ExportLegend,
  ExportLegendRow,
  ExportLegendSwatch,
  ExportLegendLabel,
} from './styled';
import { CursorSummary } from './CursorSummary';
import { MeasurementChart } from './MeasurementChart';
import { ScopeHeader } from './ScopeHeader';
import { useScopeTitle } from './useScopeTitle';
import { useScopeImageExport } from './useScopeImageExport';
import { SCOPE_TITLE_STORAGE_KEY } from './constants';
import type { MeasurementHistoryProps } from './types';
import { useMeasurementHistoryController } from './useMeasurementHistoryController';
import { useCursorReferenceLines } from './useCursorReferenceLines';

export const MeasurementHistory: React.FC<MeasurementHistoryProps> = ({
  history,
  channelStyles,
  onClearHistory,
}) => {
  const scopeCaptureRef = useRef<HTMLDivElement | null>(null);

  const { title: scopeTitle, update: updateScopeTitle, commit: commitScopeTitle } = useScopeTitle(
    SCOPE_TITLE_STORAGE_KEY,
    'Measurement Scope',
  );
  const { isExporting: isExportingImage, exportImage } = useScopeImageExport(scopeTitle);

  const controller = useMeasurementHistoryController({ history, channelStyles, onClearHistory });

  const handleExportImage = useCallback(() => {
    void exportImage(scopeCaptureRef.current);
  }, [exportImage]);

  const yAxes = useYAxisCollection({
    units: controller.axisControls.units,
    axisScales: controller.axisControls.scales,
    axisDomainsByUnit: controller.axisControls.domainsByUnit,
    axisPrecisionByUnit: controller.axisControls.precisionByUnit,
    openAxisScale: controller.axisControls.openScale,
    toggleAxisLock: controller.axisControls.toggleLock,
    isExporting: isExportingImage,
  });

  const cursorReferenceLines = useCursorReferenceLines({
    cursorState: controller.cursorControls.state,
    seriesColorMap: controller.cursorControls.seriesColorMap,
    units: controller.axisControls.units,
  });

  const referenceLines = useMemo(() => cursorReferenceLines.map((entry) => (
    <ReferenceLine
      key={entry.id}
      x={entry.x}
      stroke={entry.stroke}
      strokeDasharray="3 3"
      yAxisId={entry.unitId}
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
              <circle cx={0} cy={0} r={radius} fill="#ffffff" stroke={entry.stroke} strokeWidth={2} />
              <text
                x={0}
                y={4}
                textAnchor="middle"
                fontSize={12}
                fontWeight={600}
                fill={entry.stroke}
              >
                {entry.label}
              </text>
            </g>
          );
        }}
      />
    </ReferenceLine>
  )), [cursorReferenceLines]);

  return (
    <Card ref={scopeCaptureRef}>
      <ScopeHeader
        scopeTitle={scopeTitle}
        onTitleChange={updateScopeTitle}
        onTitleBlur={commitScopeTitle}
        cursorTraceKey={controller.cursorControls.traceKey}
        cursorTraceOptions={controller.cursorControls.traceOptions}
        currentTraceColor={controller.cursorControls.currentTraceColor}
        onCursorTraceChange={controller.cursorControls.handleTraceChange}
        isPaused={controller.isPaused}
        onPauseToggle={controller.handlePauseToggle}
        onAutoFit={controller.zoomControls.resetView}
        onResetCursors={controller.cursorControls.reset}
        onExportImage={handleExportImage}
        isExportingImage={isExportingImage}
        onExportCsv={controller.handleExportCsv}
        canExportCsv={controller.chartData.length > 0}
        onClearHistory={controller.clearHistory}
      />

      <MeasurementChart
        chartData={controller.chartData}
        viewDomain={controller.zoomControls.viewDomain}
        onChartClick={controller.pointerHandlers.handleChartClick}
        onMouseDown={controller.pointerHandlers.handleChartMouseDown}
        onMouseMove={controller.pointerHandlers.handleChartMouseMove}
        onMouseUp={controller.pointerHandlers.handleChartMouseUp}
        onMouseLeave={controller.pointerHandlers.handleChartMouseLeave}
        yAxes={yAxes}
        series={controller.series}
        channelStyles={controller.resolvedChannelStyles}
        referenceLines={referenceLines}
        zoomOverlayProps={controller.zoomControls.overlayProps}
        zoomSelection={controller.zoomControls.selection}
        zoomFlash={controller.zoomControls.flash}
        tooltipFormatter={controller.tooltipFormatter}
        labelFormatter={controller.labelFormatter}
        {...(controller.measurementChartTickProps ?? undefined)}
      />

      {controller.exportLegendEntries.length > 0 && (
        <ExportLegend $visible={isExportingImage} aria-hidden={!isExportingImage}>
          {controller.exportLegendEntries.map((entry) => (
            <ExportLegendRow key={entry.key}>
              <ExportLegendSwatch $color={entry.color} />
              <ExportLegendLabel>{entry.label}</ExportLegendLabel>
            </ExportLegendRow>
          ))}
        </ExportLegend>
      )}

      <CursorSummary
        cursorState={controller.cursorControls.state}
        seriesColorMap={controller.cursorControls.seriesColorMap}
        distanceInfo={controller.cursorControls.distanceInfo}
      />

      {controller.axisControls.editor && (
        <AxisScaleModal
          editor={controller.axisControls.editor}
          onChange={controller.axisControls.handleEditorChange}
          onAuto={controller.axisControls.handleEditorAuto}
          onClose={controller.axisControls.closeEditor}
          onApply={controller.axisControls.handleEditorApply}
        />
      )}
    </Card>
  );
};
