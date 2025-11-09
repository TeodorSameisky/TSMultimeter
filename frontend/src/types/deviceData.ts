export interface DeviceInfo {
  id: string;
  connected: boolean;
  deviceType: string;
  model: string;
  serialNumber: string;
  softwareVersion: string;
}

export interface MeasurementResponse {
  value: number;
  unit: string;
  state?: string;
  attribute?: string;
  timestamp?: string;
}

export interface MeasurementSample {
  deviceId: string;
  deviceType: string;
  deviceLabel: string;
  value: number;
  unit: string;
  state?: string;
  attribute?: string;
  timestamp: number;
}
