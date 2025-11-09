import React from 'react';
import { formatMeasurementDisplay } from '../../utils/formatNumber.ts';
import { CursorInfo } from './styled';
import type { CursorSnapshot, CursorState, CursorDistanceInfo } from './types';

export type CursorSummaryProps = {
  cursorState: CursorState;
  renderCursorSnapshot: (label: string, snapshot: CursorSnapshot) => React.ReactNode;
  distanceInfo: CursorDistanceInfo | null;
};

/**
 * Renders the active cursor snapshots and, when available, the delta information
 * between them. The component stays presentation focused while the container
 * controls how snapshots are built and updated.
 */
export const CursorSummary: React.FC<CursorSummaryProps> = ({
  cursorState,
  renderCursorSnapshot,
  distanceInfo,
}) => {
  if (!cursorState.primary) {
    return null;
  }

  return (
    <CursorInfo>
      {renderCursorSnapshot('Cursor A', cursorState.primary)}
      {cursorState.secondary && renderCursorSnapshot('Cursor B', cursorState.secondary)}
      {cursorState.secondary && distanceInfo && cursorState.primary && (
        <div>
          <strong>Δ</strong>
          <div>{distanceInfo.deltaSeconds.toFixed(4)} s</div>
          <div>
            {(() => {
              const unit = cursorState.primary?.anchor.unit;
              const display = formatMeasurementDisplay(distanceInfo.deltaValues, unit, distanceInfo.precision);
              return display.combined;
            })()}
          </div>
        </div>
      )}
    </CursorInfo>
  );
};
