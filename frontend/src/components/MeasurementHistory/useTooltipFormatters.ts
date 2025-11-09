import { useCallback } from 'react';
import type { Formatter } from 'recharts/types/component/DefaultTooltipContent';
import { formatMeasurementDisplay } from '../../utils/formatNumber.ts';
import { formatRelativeTime } from './utils.ts';
import { META_PREFIX } from './constants.ts';
import type { ChartDatum, SeriesSample } from './types.ts';

type TooltipFormatterPayload = {
  payload?: ChartDatum;
};

type UseTooltipFormattersResult = {
  tooltipFormatter: Formatter<number, string>;
  labelFormatter: (value: number) => string;
};

export const useTooltipFormatters = (): UseTooltipFormattersResult => {
  const tooltipFormatter = useCallback<Formatter<number, string>>((value, name, payload) => {
    const key = String(name);
    const entry = (payload as TooltipFormatterPayload | undefined)?.payload;
    const meta = entry?.[`${META_PREFIX}${key}`] as (SeriesSample & { tooltipLabel?: string }) | undefined;

    if (typeof value === 'number') {
      const display = formatMeasurementDisplay(value, meta?.unit, meta?.precision);
      return [display.combined, meta?.tooltipLabel ?? key];
    }

    return [value, meta?.tooltipLabel ?? key];
  }, []);

  const labelFormatter = useCallback((value: number) => formatRelativeTime(value), []);

  return { tooltipFormatter, labelFormatter } satisfies UseTooltipFormattersResult;
};
