import { useMemo } from 'react';
import { YAxis, Label } from 'recharts';
import { formatMeasurementValue } from '../../utils/formatNumber.ts';
import { AxisTick } from './AxisTick';
import { AXIS_TICK_TARGET, AXIS_STROKE_COLOR } from './constants';
import { buildEquidistantTicks } from './utils';
import type { AxisScaleSettings, AxisTickBaseProps } from './types';

type UseYAxisCollectionOptions = {
  units: Array<[string, string]>;
  axisScales: AxisScaleSettings;
  axisDomainsByUnit: Map<string, { min: number; max: number }>;
  axisPrecisionByUnit: Map<string, number>;
  openAxisScale: (unit: string) => void;
  toggleAxisLock: (unit: string) => void;
  isExporting: boolean;
};

export const useYAxisCollection = ({
  units,
  axisScales,
  axisDomainsByUnit,
  axisPrecisionByUnit,
  openAxisScale,
  toggleAxisLock,
  isExporting,
}: UseYAxisCollectionOptions) => useMemo(() => (
  units.map(([unit]) => {
    const scaleSetting = axisScales[unit];
    const normalizeDomain = (min: number, max: number): [number, number] | null => {
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

    const stats = axisDomainsByUnit.get(unit);

    let numericDomain: [number, number] | null = null;

    if (scaleSetting) {
      numericDomain = normalizeDomain(scaleSetting.min, scaleSetting.max);
    }

    if (!numericDomain && stats) {
      const padding = stats.min === stats.max
        ? (Math.abs(stats.min) * 0.1 || 1)
        : ((stats.max - stats.min) * 0.1);
      const paddedMin = stats.min - padding;
      const paddedMax = stats.max + padding;
      numericDomain = normalizeDomain(paddedMin, paddedMax);
    }

    const domain: [number | 'auto', number | 'auto'] = numericDomain
      ? numericDomain
      : ['auto', 'auto'];

    const tickValues = numericDomain
      ? buildEquidistantTicks(numericDomain[0], numericDomain[1], AXIS_TICK_TARGET)
      : undefined;

  const precision = axisPrecisionByUnit.get(unit);
    const ticksProp = tickValues && tickValues.length > 0
      ? { ticks: tickValues as Array<string | number> }
      : null;
    const tickRenderer = (tickProps: AxisTickBaseProps) => {
      const rawValue = tickProps.payload?.value;
      const formatted = typeof rawValue === 'number'
        ? formatMeasurementValue(rawValue, precision)
        : (rawValue == null ? '' : String(rawValue));
      return (
        <AxisTick
          {...tickProps}
          unit={unit}
          color={AXIS_STROKE_COLOR}
          onDoubleClick={openAxisScale}
          formattedValue={formatted}
        />
      );
    };

    return (
      <YAxis
        key={unit}
    yAxisId={unit}
    orientation="left"
  stroke={AXIS_STROKE_COLOR}
        allowDecimals
    tickLine={false}
  axisLine={{ stroke: AXIS_STROKE_COLOR, strokeWidth: 1 }}
        tick={tickRenderer}
  width={72}
        padding={{ top: 28, bottom: 0 }}
        domain={domain}
        {...(ticksProp ?? undefined)}
      >
        <Label
          content={({ viewBox }) => {
            if (!viewBox) {
              return null;
            }
            const {
              x = 0,
              y = 0,
              width = 0,
            } = viewBox as { x?: number; y?: number; width?: number };
            const labelX = x + width / 2;
            const labelY = y + 10;
            const isLocked = Boolean(scaleSetting?.locked);
            const symbol = isLocked ? '🔒' : '🔓';
              const textContent = isExporting ? unit : `${symbol} ${unit}`;
            return (
              <text
                x={labelX}
                y={labelY}
                fill={AXIS_STROKE_COLOR}
                fontSize={12}
                textAnchor="middle"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleAxisLock(unit);
                }}
              >
                <title>{isLocked ? 'Click to unlock axis' : 'Click to lock axis'}</title>
                  {textContent}
              </text>
            );
          }}
        />
      </YAxis>
    );
  })
), [axisDomainsByUnit, axisPrecisionByUnit, axisScales, isExporting, openAxisScale, toggleAxisLock, units]);
