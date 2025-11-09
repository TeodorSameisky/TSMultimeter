import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useState, useCallback } from 'react';
import type {
  ChartDatum,
  ChartPointerEvent,
  CursorState,
  MeasurementHistoryProps,
  SeriesSample,
} from './types.ts';
import { useCursorInteractions } from './useCursorInteractions.ts';

type HistoryStyles = NonNullable<MeasurementHistoryProps['channelStyles']>;

const buildSample = (overrides: Partial<SeriesSample>): SeriesSample => ({
  deviceId: 'device_001',
  deviceType: 'mock',
  deviceLabel: 'Channel 1',
  value: 1,
  unit: 'V',
  timestamp: 1,
  relativeTimestamp: 1,
  ...overrides,
});

const buildChartDatum = (sample: SeriesSample): ChartDatum => ({
  relativeTimestamp: sample.relativeTimestamp,
  timestamp: sample.timestamp,
  timestampLabel: String(sample.timestamp),
  [`meta:${sample.unit}|${sample.deviceId}`]: sample,
});

const buildPointerEvent = (sample: SeriesSample, payload: ChartDatum): ChartPointerEvent => ({
  chartX: 50,
  chartY: 10,
  chartWidth: 100,
  chartHeight: 50,
  activeLabel: sample.relativeTimestamp,
  activePayload: [
    {
      dataKey: `${sample.unit}|${sample.deviceId}`,
      payload,
    },
  ],
});

describe('useCursorInteractions', () => {
  it('selects, drags, and resets cursors', () => {
    const firstSample = buildSample({ timestamp: 1, relativeTimestamp: 1, value: 10 });
    const secondSample = buildSample({ timestamp: 2, relativeTimestamp: 2, value: 20 });

  const chartData: ChartDatum[] = [buildChartDatum(firstSample), buildChartDatum(secondSample)];
  const [firstDatum, secondDatum] = chartData;
    const resolvedChannelStyles: HistoryStyles = {};

    const markSkipMock = vi.fn();
    const abortZoomMock = vi.fn();

    const { result } = renderHook(() => {
      const [cursorState, setCursorState] = useState<CursorState>({});
      const resetCursors = useCallback(() => setCursorState({}), []);

      const interactions = useCursorInteractions({
        chartData,
        activeDomain: [0, 5],
        cursorState,
        setCursorState,
        cursorTraceHint: undefined,
        cursorTraceKey: 'auto',
        isAutoCursorTrace: true,
        resolvedChannelStyles,
        resetCursors,
        markClickSkipped: markSkipMock,
        abortZoomSelection: abortZoomMock,
      });

      return { interactions, cursorState };
    });

  const initialEvent = buildPointerEvent(firstSample, firstDatum!);

    act(() => {
      result.current.interactions.handleChartClick(initialEvent);
    });

    expect(result.current.cursorState.primary?.anchor.relativeTimestamp).toBe(1);
    expect(result.current.cursorState.secondary).toBeUndefined();

    let dragStarted = false;
    act(() => {
      dragStarted = result.current.interactions.handleChartMouseDown(initialEvent);
    });

    expect(dragStarted).toBe(true);
    expect(markSkipMock).toHaveBeenCalled();

  const dragEvent = buildPointerEvent(secondSample, secondDatum!);
    act(() => {
      result.current.interactions.handleChartMouseMove(dragEvent);
    });

    expect(result.current.cursorState.primary?.anchor.relativeTimestamp).toBe(2);

    act(() => {
      result.current.interactions.handleChartMouseUp(dragEvent);
    });

    act(() => {
      result.current.interactions.handleResetCursors();
    });

    expect(result.current.cursorState).toEqual({});
  });
});
