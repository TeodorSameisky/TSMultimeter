import { useMemo } from 'react';
import { AXIS_TICK_TARGET } from './constants.ts';
import { buildEquidistantTicks } from './utils.ts';

type Domain = [number, number] | null | undefined;

type MeasurementChartTickProps = { xTicks: number[] } | undefined;
export const useMeasurementTicks = (activeDomain: Domain): MeasurementChartTickProps => useMemo(() => {
  if (!activeDomain) {
    return undefined;
  }
  let [start, end] = activeDomain;
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return undefined;
  }
  if (Math.abs(end - start) < Number.EPSILON) {
    const padding = Math.max(Math.abs(start) * 0.1, 1);
    start -= padding;
    end += padding;
  }
  const ticks = buildEquidistantTicks(start, end, AXIS_TICK_TARGET);
  return ticks.length > 0 ? { xTicks: ticks } : undefined;
}, [activeDomain]);
