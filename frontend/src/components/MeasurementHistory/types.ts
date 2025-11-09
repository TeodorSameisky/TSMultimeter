import type { MeasurementSample } from '../../hooks/useDevice';

export type AxisEditorState = {
  unit: string;
  min: string;
  max: string;
  tickCount: string;
  error?: string;
};

export type AxisScaleSetting = {
  min?: number;
  max?: number;
  tickCount?: number;
  locked?: boolean;
};

export type AxisScaleSettings = Record<string, AxisScaleSetting>;

export type ZoomSelectionState = {
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
};

export type ZoomFlashState = ZoomSelectionState & {
  fading: boolean;
};

export interface SeriesSample extends MeasurementSample {
  relativeTimestamp: number;
  precision?: number;
}

export interface CursorSeriesEntry {
  key: string;
  sample: SeriesSample;
}

export interface CursorSnapshot {
  anchorKey: string;
  anchor: SeriesSample;
  series: CursorSeriesEntry[];
}

export interface CursorState {
  primary?: CursorSnapshot;
  secondary?: CursorSnapshot;
}

export interface MeasurementSeries {
  key: string;
  unit: string;
  deviceId: string;
  label: string;
  values: SeriesSample[];
}

export interface ChannelStyle {
  alias?: string;
  color?: string;
  enabled?: boolean;
  precision?: number;
}

export type ChannelStyleMap = Record<string, ChannelStyle>;

export type AxisTickBaseProps = {
  x: number;
  y: number;
  payload: {
    value: number | string;
  };
};

export type AxisTickComponentProps = AxisTickBaseProps & {
  unit: string;
  color: string;
  onDoubleClick: (unit: string) => void;
  formattedValue?: string;
};

export type ZoomOverlayProps = {
  left: number;
  width: number;
  top: number;
  height: number;
};

export type ChartSeriesPayload = {
  dataKey?: string | number;
  name?: string | number;
  payload?: ChartDatum;
};

export type ChartPointerEvent = {
  chartX?: number | null;
  chartY?: number | null;
  chartWidth?: number | null;
  chartHeight?: number | null;
  activeLabel?: number | string;
  isTooltipActive?: boolean;
  activePayload?: ChartSeriesPayload[];
};

export type PointerRatios = {
  x: number;
  y: number;
};

export type CursorDistanceInfo = {
  deltaTime: number;
  deltaSeconds: number;
  deltaValues: number;
  precision?: number;
};

export type ChartDatum = {
  relativeTimestamp: number;
  timestamp: number;
  timestampLabel: string;
} & Record<string, unknown>;

export interface MeasurementHistoryProps {
  history: Record<string, MeasurementSample[]>;
  channelStyles?: ChannelStyleMap;
  onClearHistory?: (deviceId?: string) => void;
}
