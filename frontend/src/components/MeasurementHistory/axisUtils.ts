import { AXIS_TICK_TARGET } from './constants.ts';
import { buildEquidistantTicks } from './utils.ts';
import type { AxisScaleSetting } from './types.ts';

export type DomainStats = {
  min: number;
  max: number;
};

export const normalizeDomain = (min: number, max: number): [number, number] | null => {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return null;
  }
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  if (!Number.isFinite(low) || !Number.isFinite(high)) {
    return null;
  }
  if (Math.abs(high - low) < Number.EPSILON) {
    const padding = Math.max(Math.abs(low) * 0.1, 1);
    return [low - padding, high + padding];
  }
  return [low, high];
};

export const padStatsDomain = (stats: DomainStats): [number, number] => {
  if (stats.min === stats.max) {
    const padding = Math.abs(stats.min) * 0.1 || 1;
    return [stats.min - padding, stats.max + padding];
  }
  const padding = (stats.max - stats.min) * 0.1;
  return [stats.min - padding, stats.max + padding];
};

export const resolveAxisDomain = (
  scaleSetting: AxisScaleSetting | undefined,
  stats: DomainStats | undefined,
): [number, number] | null => {
  if (typeof scaleSetting?.min === 'number' && typeof scaleSetting?.max === 'number') {
    return normalizeDomain(scaleSetting.min, scaleSetting.max);
  }
  if (!stats) {
    return null;
  }
  const [paddedMin, paddedMax] = padStatsDomain(stats);
  return normalizeDomain(paddedMin, paddedMax);
};

export const resolveTickTarget = (tickCount: number | undefined): number => {
  if (typeof tickCount === 'number' && Number.isFinite(tickCount)) {
    const integer = Math.trunc(tickCount);
    if (integer >= 2) {
      return integer;
    }
  }
  return AXIS_TICK_TARGET;
};

export const resolveTickValues = (
  domain: [number, number] | null,
  tickTarget: number,
): number[] | undefined => {
  if (!domain) {
    return undefined;
  }
  const ticks = buildEquidistantTicks(domain[0], domain[1], tickTarget);
  return ticks.length > 0 ? ticks : undefined;
};
