import React from 'react';
import { formatMeasurementDisplay } from '../../utils/formatNumber.ts';
import { formatRelativeTime } from './utils.ts';
import {
  CursorCard,
  CursorHeading,
  CursorSeriesAlias,
  CursorSeriesLabel,
  CursorSeriesList,
  CursorSeriesRow,
  CursorSeriesSwatch,
  CursorTime,
} from './styled.ts';
import type { CursorSnapshot } from './types.ts';

type CursorSnapshotEntry = {
  label: string;
  snapshot: CursorSnapshot;
};

type CursorSnapshotListProps = {
  entries: CursorSnapshotEntry[];
  seriesColorMap: Map<string, string>;
};

export const CursorSnapshotList: React.FC<CursorSnapshotListProps> = ({ entries, seriesColorMap }) => (
  <>
    {entries.map(({ label, snapshot }) => {
      const { anchor, anchorKey, series } = snapshot;
      return (
        <CursorCard key={label}>
          <CursorHeading>
            <strong>{label}</strong>
            <CursorTime>{formatRelativeTime(anchor.relativeTimestamp)}</CursorTime>
          </CursorHeading>
          <CursorSeriesList>
            {series.map(({ key, sample }) => {
              const color = seriesColorMap.get(key) ?? '#95a5a6';
              const display = formatMeasurementDisplay(sample.value, sample.unit, sample.precision);
              return (
                <CursorSeriesRow
                  key={`${label}-${key}`}
                  $highlight={key === anchorKey}
                >
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
      );
    })}
  </>
);
