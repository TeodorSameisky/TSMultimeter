export type MeasurementKind = 'min' | 'max' | 'mean';

export type MeasurementConfig = {
  id: string;
  channelId: string;
  kind: MeasurementKind;
};

export type MeasurementFormState = {
  channelId: string;
  kind: MeasurementKind;
};

export const MEASUREMENT_KIND_LABELS: Record<MeasurementKind, string> = {
  min: 'Minimum',
  max: 'Maximum',
  mean: 'Mean',
};
