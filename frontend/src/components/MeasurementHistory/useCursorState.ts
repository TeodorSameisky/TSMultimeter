import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MeasurementHistoryProps } from './types.ts';
import type { CursorState, MeasurementSeries } from './types.ts';
import { DEFAULT_AXIS_COLOR } from './constants.ts';

type CursorTraceOption = {
  key: string;
  label: string;
  color: string;
};

type UseCursorStateArgs = {
  series: MeasurementSeries[];
  resolvedChannelStyles: NonNullable<MeasurementHistoryProps['channelStyles']>;
};

export type CursorTraceHint = { dataKey: string; deviceId?: string } | undefined;

export type UseCursorStateResult = {
  cursorState: CursorState;
  setCursorState: React.Dispatch<React.SetStateAction<CursorState>>;
  resetCursors: () => void;
  cursorTraceKey: string;
  isAutoCursorTrace: boolean;
  cursorTraceDeviceId: string | undefined;
  cursorTraceOptions: CursorTraceOption[];
  currentTraceColor: string;
  handleCursorTraceChange: (value: string) => void;
  seriesColorMap: Map<string, string>;
  cursorTraceHint: CursorTraceHint;
};

export const useCursorState = ({
  series,
  resolvedChannelStyles,
}: UseCursorStateArgs): UseCursorStateResult => {
  const [cursorState, setCursorState] = useState<CursorState>({});
  const [cursorTraceKey, setCursorTraceKey] = useState<string>('auto');

  const isAutoCursorTrace = cursorTraceKey === 'auto';

  const seriesColorMap = useMemo(() => {
    const map = new Map<string, string>();
    series.forEach(({ key, deviceId }) => {
      const style = resolvedChannelStyles[deviceId];
      map.set(key, style?.color ?? DEFAULT_AXIS_COLOR);
    });
    return map;
  }, [resolvedChannelStyles, series]);

  const cursorTraceDeviceId = useMemo(() => {
    if (isAutoCursorTrace) {
      return undefined;
    }
    return series.find((entry) => entry.key === cursorTraceKey)?.deviceId;
  }, [cursorTraceKey, isAutoCursorTrace, series]);

  const cursorTraceOptions = useMemo<CursorTraceOption[]>(
    () => series.map((entry) => ({
      key: entry.key,
      label: `${entry.label} (${entry.unit})`,
      color: seriesColorMap.get(entry.key) ?? DEFAULT_AXIS_COLOR,
    })),
    [series, seriesColorMap],
  );

  const cursorTraceHint = useMemo<CursorTraceHint>(() => {
    if (isAutoCursorTrace) {
      return undefined;
    }
    if (cursorTraceDeviceId) {
      return { dataKey: cursorTraceKey, deviceId: cursorTraceDeviceId };
    }
    return { dataKey: cursorTraceKey };
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
  }, [cursorTraceKey, isAutoCursorTrace, series]);

  useEffect(() => {
    setCursorState({});
  }, [cursorTraceKey]);

  const handleCursorTraceChange = useCallback((value: string) => {
    setCursorTraceKey(value);
  }, []);

  const resetCursors = useCallback(() => {
    setCursorState({});
  }, []);

  return {
    cursorState,
    setCursorState,
    resetCursors,
    cursorTraceKey,
    isAutoCursorTrace,
    cursorTraceDeviceId,
    cursorTraceOptions,
    currentTraceColor,
    handleCursorTraceChange,
    seriesColorMap,
    cursorTraceHint,
  } satisfies UseCursorStateResult;
};
