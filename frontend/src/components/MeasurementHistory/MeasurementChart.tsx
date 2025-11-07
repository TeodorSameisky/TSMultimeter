import React, { useCallback, useRef } from 'react';
import type { Formatter } from 'recharts/types/component/DefaultTooltipContent';
import {
  ChartContainer,
  ChartStage,
  NoDataMessage,
  ZoomOverlayLayer,
  ZoomSelectionBox,
} from './styled';
import type {
  ChannelStyleMap,
  ChartPointerEvent,
  ChartDatum,
  MeasurementSeries,
  ZoomFlashState,
  ZoomOverlayProps,
  ZoomSelectionState,
} from './types';
import { AXIS_STROKE_COLOR, DEFAULT_AXIS_COLOR } from './constants';
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  Tooltip,
  CartesianGrid,
  Line,
} from 'recharts';

export type MeasurementChartProps = {
  chartData: ChartDatum[];
  viewDomain: [number, number] | undefined;
  onChartClick: (event: ChartPointerEvent | null) => void;
  onMouseDown: (event: ChartPointerEvent | null) => void;
  onMouseMove: (event: ChartPointerEvent | null) => void;
  onMouseUp: (event: ChartPointerEvent | null) => void;
  onMouseLeave: () => void;
  yAxes: React.ReactNode[];
  series: MeasurementSeries[];
  channelStyles?: ChannelStyleMap;
  referenceLines: React.ReactNode[];
  zoomOverlayProps: ZoomOverlayProps | null;
  zoomSelection: ZoomSelectionState | null;
  zoomFlash: ZoomFlashState | null;
  tooltipFormatter: Formatter<number, string>;
  labelFormatter: (value: number) => string;
  xTicks?: number[];
};

export const MeasurementChart: React.FC<MeasurementChartProps> = ({
  chartData,
  viewDomain,
  onChartClick,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  yAxes,
  series,
  channelStyles,
  referenceLines,
  zoomOverlayProps,
  zoomSelection,
  zoomFlash,
  tooltipFormatter,
  labelFormatter,
  xTicks,
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const xTicksProps = xTicks && xTicks.length > 0 ? { ticks: xTicks as Array<string | number> } : undefined;

  const buildPointerEvent = useCallback(
    (state: ChartPointerEvent | null | undefined, nativeEvent?: MouseEvent | TouchEvent): ChartPointerEvent | null => {
      if (!state) {
        return null;
      }

      const bounds = stageRef.current?.getBoundingClientRect();
      const width = typeof state.chartWidth === 'number' ? state.chartWidth : bounds?.width ?? null;
      const height = typeof state.chartHeight === 'number' ? state.chartHeight : bounds?.height ?? null;

      let chartX = typeof state.chartX === 'number' ? state.chartX : null;
      let chartY = typeof state.chartY === 'number' ? state.chartY : null;

      if ((chartX === null || chartY === null) && bounds && nativeEvent) {
        if ('clientX' in nativeEvent && typeof nativeEvent.clientX === 'number' && typeof nativeEvent.clientY === 'number') {
          chartX = nativeEvent.clientX - bounds.left;
          chartY = nativeEvent.clientY - bounds.top;
        } else if ('changedTouches' in nativeEvent && nativeEvent.changedTouches.length > 0) {
          const touch = nativeEvent.changedTouches[0];
          if (touch) {
            chartX = touch.clientX - bounds.left;
            chartY = touch.clientY - bounds.top;
          }
        }
      }

      return {
        ...state,
        chartX,
        chartY,
        chartWidth: width,
        chartHeight: height,
      };
    },
    [],
  );

  const handleInternalClick = useCallback(
    (state: unknown, nativeEvent?: MouseEvent | TouchEvent) => {
      onChartClick(buildPointerEvent(state as ChartPointerEvent | null, nativeEvent));
    },
    [buildPointerEvent, onChartClick],
  );

  const handleInternalMouseDown = useCallback(
    (state: unknown, nativeEvent?: MouseEvent | TouchEvent) => {
      onMouseDown(buildPointerEvent(state as ChartPointerEvent | null, nativeEvent));
    },
    [buildPointerEvent, onMouseDown],
  );

  const handleInternalMouseMove = useCallback(
    (state: unknown, nativeEvent?: MouseEvent | TouchEvent) => {
      onMouseMove(buildPointerEvent(state as ChartPointerEvent | null, nativeEvent));
    },
    [buildPointerEvent, onMouseMove],
  );

  const handleInternalMouseUp = useCallback(
    (state: unknown, nativeEvent?: MouseEvent | TouchEvent) => {
      onMouseUp(buildPointerEvent(state as ChartPointerEvent | null, nativeEvent));
    },
    [buildPointerEvent, onMouseUp],
  );

  const handleInternalMouseLeave = useCallback(() => {
    onMouseLeave();
  }, [onMouseLeave]);

  return (
    <ChartContainer>
      {chartData.length === 0 ? (
        <NoDataMessage>
          Start capturing measurements to see live traces.
        </NoDataMessage>
      ) : (
        <ChartStage ref={stageRef}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              syncId="measurement-scope"
              onClick={handleInternalClick}
              onMouseDown={handleInternalMouseDown}
              onMouseMove={handleInternalMouseMove}
              onMouseUp={handleInternalMouseUp}
              onMouseLeave={handleInternalMouseLeave}
            >
              <CartesianGrid strokeDasharray="4 4" stroke="#ecf0f1" />
              <XAxis
                dataKey="relativeTimestamp"
                tickFormatter={(value: number) => `${(value / 1000).toFixed(3)} s`}
                type="number"
                domain={viewDomain ?? ['auto', 'auto']}
                tick={{ fontSize: 12, fill: AXIS_STROKE_COLOR }}
                stroke={AXIS_STROKE_COLOR}
                axisLine={{ stroke: AXIS_STROKE_COLOR, strokeWidth: 1 }}
                tickLine={false}
                allowDataOverflow
                {...xTicksProps}
              />
              {yAxes}
              <Tooltip formatter={tooltipFormatter} labelFormatter={labelFormatter} />
              {series.map(({ key, unit, deviceId }) => {
                const channel = channelStyles?.[deviceId];
                if (channel?.enabled === false) {
                  return null;
                }
                const color = channel?.color ?? DEFAULT_AXIS_COLOR;
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    yAxisId={unit}
                    isAnimationActive={false}
                    connectNulls
                  />
                );
              })}
              {referenceLines}
            </ComposedChart>
          </ResponsiveContainer>
          {zoomOverlayProps && zoomOverlayProps.width > 0 && (zoomSelection || zoomFlash) ? (
            <ZoomOverlayLayer>
              <ZoomSelectionBox
                $left={zoomOverlayProps.left}
                $width={zoomOverlayProps.width}
                $top={zoomOverlayProps.top}
                $height={zoomOverlayProps.height}
                $animate={Boolean(!zoomSelection && zoomFlash)}
                $fading={Boolean(!zoomSelection && zoomFlash?.fading)}
              />
            </ZoomOverlayLayer>
          ) : null}
        </ChartStage>
      )}
    </ChartContainer>
  );
};
