import { useMemo } from 'react';
import { computeCursorDistance } from './utils.ts';
import type { CursorState } from './types.ts';

export type CursorDistance = ReturnType<typeof computeCursorDistance>;

export const useCursorDistance = (cursorState: CursorState): CursorDistance => useMemo(
  () => computeCursorDistance(cursorState),
  [cursorState],
);
