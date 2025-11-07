export const COLORS: readonly string[] = [
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#9b59b6',
  '#f39c12',
  '#1abc9c',
  '#34495e',
  '#d35400',
] as const;

export const UNIT_ORDER: readonly string[] = [
  'VDC',
  'VAC',
  'VAC+DC',
  'V',
  'ADC',
  'AAC',
  'AAC+DC',
  'A',
  'OHM',
  'S',
  'Hz',
  's',
  'F',
  'CEL',
  'FAR',
  '%',
  'dBm',
  'dBV',
  'dB',
  'CF',
  'Unknown',
] as const;

export const MIN_X_ZOOM_SPAN = 5;
export const MIN_Y_RATIO_SPAN = 0.01;

export const DEFAULT_AXIS_COLOR = '#95a5a6';
export const DEFAULT_UNIT = 'Unknown';

export const AXIS_TICK_TARGET = 10;

export const SCOPE_TITLE_STORAGE_KEY = 'measurementScopeTitle';

export const AXIS_STROKE_COLOR = '#333333';
