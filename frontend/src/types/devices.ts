export const DEVICE_TYPE_OPTIONS = [
  { value: 'Mock', label: 'Mock Device (Development)' },
  { value: 'Fluke289', label: 'Fluke 289' },
  { value: 'Fluke287', label: 'Fluke 287' },
] as const;

export type DeviceTypeOption = typeof DEVICE_TYPE_OPTIONS[number];
export type DeviceTypeOptionValue = DeviceTypeOption['value'];
