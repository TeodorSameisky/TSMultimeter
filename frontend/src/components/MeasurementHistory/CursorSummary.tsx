import React from 'react';
import { formatMeasurementDisplay } from '../../utils/formatNumber.ts';
import {
  CursorCard,
  CursorHeading,
  CursorInfo,
  CursorSeriesAlias,
  CursorSeriesLabel,
  CursorSeriesList,
  CursorSeriesRow,
  CursorSeriesSwatch,
  CursorTime,
} from './styled';
import { CursorSnapshotList } from './CursorSnapshotList';
import type { CursorState, CursorDistanceInfo } from './types';

export type CursorSummaryProps = {
  cursorState: CursorState;
  seriesColorMap: Map<string, string>;
  distanceInfo: CursorDistanceInfo | null;
};

/**
 * Renders the active cursor snapshots and, when available, the delta information
 * between them. The component stays presentation focused while the container
 * controls how snapshots are built and updated.
 */
export const CursorSummary: React.FC<CursorSummaryProps> = ({ cursorState, seriesColorMap, distanceInfo }) => {
  if (!cursorState.primary) {
    return null;
  }

  const entries = [
    cursorState.primary ? { label: 'Cursor A', snapshot: cursorState.primary } : null,
    cursorState.secondary ? { label: 'Cursor B', snapshot: cursorState.secondary } : null,
  ].filter(Boolean) as Array<{ label: string; snapshot: NonNullable<typeof cursorState.primary> }>;

  return (
    <CursorInfo>
      <CursorSnapshotList entries={entries} seriesColorMap={seriesColorMap} />
      {cursorState.secondary && distanceInfo && distanceInfo.series.length > 0 && (
        <CursorCard>
          <CursorHeading>
            <strong>Δ</strong>
            <CursorTime>{distanceInfo.deltaSeconds.toFixed(4)} s</CursorTime>
          </CursorHeading>
          <CursorSeriesList>
            {distanceInfo.series.map((entry) => {
              const color = seriesColorMap.get(entry.key) ?? '#95a5a6';
              const display = formatMeasurementDisplay(entry.delta, entry.unit, entry.precision);
              return (
                <CursorSeriesRow key={`delta-${entry.key}`}>
                  <CursorSeriesLabel>
                    <CursorSeriesSwatch $color={color} />
                    <CursorSeriesAlias title={display.combined}>
                      {display.combined}
                    </CursorSeriesAlias>
                  </CursorSeriesLabel>
                </CursorSeriesRow>
              );
            })}
          </CursorSeriesList>
        </CursorCard>
      )}
    </CursorInfo>
  );
};
