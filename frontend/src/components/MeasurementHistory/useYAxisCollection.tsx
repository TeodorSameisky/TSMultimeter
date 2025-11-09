import { useMemo } from 'react';
import { YAxis, Label } from 'recharts';
import { formatMeasurementValue } from '../../utils/formatNumber.ts';
import { AxisTick } from './AxisTick';
import { AXIS_STROKE_COLOR } from './constants';
import { resolveAxisDomain, resolveTickTarget, resolveTickValues } from './axisUtils.ts';
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
    const stats = axisDomainsByUnit.get(unit);

    const numericDomain = resolveAxisDomain(scaleSetting, stats);

    const domain: [number | 'auto', number | 'auto'] = numericDomain ?? ['auto', 'auto'];

    const tickTarget = resolveTickTarget(scaleSetting?.tickCount);
    const tickValues = resolveTickValues(numericDomain, tickTarget);

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
        allowDataOverflow
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
