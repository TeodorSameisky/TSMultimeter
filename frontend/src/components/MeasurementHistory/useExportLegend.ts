import { useMemo } from 'react';
import { DEFAULT_AXIS_COLOR } from './constants.ts';
import type { MeasurementHistoryProps, MeasurementSeries } from './types.ts';

type ExportLegendEntry = {
  key: string;
  color: string;
  label: string;
};

type UseExportLegendArgs = {
  series: MeasurementSeries[];
  channelStyles: NonNullable<MeasurementHistoryProps['channelStyles']>;
};

export const useExportLegend = ({ series, channelStyles }: UseExportLegendArgs): ExportLegendEntry[] => useMemo(
  () => series
    .map(({ key, label, unit, deviceId }) => {
      const style = channelStyles[deviceId];
      if (style?.enabled === false) {
        return null;
      }
      const color = style?.color ?? DEFAULT_AXIS_COLOR;
      const resolvedLabel = unit ? `${label} (${unit})` : label;
      return { key, color, label: resolvedLabel } satisfies ExportLegendEntry;
    })
    .filter((entry): entry is ExportLegendEntry => Boolean(entry)),
  [channelStyles, series],
);
