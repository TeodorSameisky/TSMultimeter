import { useMemo } from 'react';
import type { CursorState } from './types.ts';

export type CursorReferenceLine = {
  id: string;
  x: number;
  stroke: string;
  unitId?: string;
  label: 'A' | 'B';
  timestamp: number;
};

type UseCursorReferenceLinesArgs = {
  cursorState: CursorState;
  seriesColorMap: Map<string, string>;
  units: Array<[string, string]>;
};

type UseCursorReferenceLinesResult = CursorReferenceLine[];

const FALLBACK_COLOR = '#e74c3c';

export const useCursorReferenceLines = ({
  cursorState,
  seriesColorMap,
  units,
}: UseCursorReferenceLinesArgs): UseCursorReferenceLinesResult => useMemo(() => {
  const entries: UseCursorReferenceLinesResult = [];

  if (cursorState.primary) {
    const anchor = cursorState.primary.anchor;
    const stroke = seriesColorMap.get(cursorState.primary.anchorKey) ?? FALLBACK_COLOR;
    entries.push({
      id: `cursor-A-${anchor.timestamp}`,
      x: anchor.relativeTimestamp,
      stroke,
      unitId: anchor.unit ?? units[0]?.[0],
      label: 'A',
      timestamp: anchor.timestamp,
    });
  }

  if (cursorState.secondary) {
    const anchor = cursorState.secondary.anchor;
    const stroke = seriesColorMap.get(cursorState.secondary.anchorKey) ?? FALLBACK_COLOR;
    entries.push({
      id: `cursor-B-${anchor.timestamp}`,
      x: anchor.relativeTimestamp,
      stroke,
      unitId: anchor.unit ?? units[0]?.[0],
      label: 'B',
      timestamp: anchor.timestamp,
    });
  }

  return entries;
}, [cursorState.primary, cursorState.secondary, seriesColorMap, units]);
