import type { DeviceInfo, MeasurementResponse } from '../types/deviceData.ts';

const API_BASE = 'http://127.0.0.1:8080';

type RawDeviceInfo = {
  id?: string | number;
  connected?: boolean;
  device_type?: string;
  info?: {
    model?: string;
    serial_number?: string;
    software_version?: string;
  } | null;
};

type DevicesResponse = {
  success: boolean;
  devices?: RawDeviceInfo[] | null;
  error?: string;
};

type PortsResponse = {
  success: boolean;
  ports?: string[] | null;
  error?: string;
};

type ConnectResponse = {
  success: boolean;
  device?: RawDeviceInfo | null;
  error?: string;
};

type DisconnectResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

type MeasurementApiResponse = {
  success: boolean;
  data: MeasurementResponse;
  error?: string;
};

const normaliseDevice = (device: RawDeviceInfo): DeviceInfo => ({
  id: String(device.id ?? 'unknown-device'),
  connected: Boolean(device.connected),
  deviceType: device.device_type ?? 'Unknown',
  model: device.info?.model ?? 'Unknown',
  serialNumber: device.info?.serial_number ?? 'N/A',
  softwareVersion: device.info?.software_version ?? 'N/A',
});

const createRequest = (path: string, init?: RequestInit) => fetch(`${API_BASE}${path}`, init);

const parseJson = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Unexpected response payload');
  }
};

const ensureSuccess = (responseSucceeded: boolean, fallbackMessage: string, errorMessage?: string): void => {
  if (responseSucceeded) {
    return;
  }
  throw new Error(errorMessage ?? fallbackMessage);
};

export const getDeviceStatus = async (): Promise<DeviceInfo[]> => {
  const response = await createRequest('/status');
  const payload = await parseJson<DevicesResponse>(response);
  ensureSuccess(payload.success, 'Failed to load device status', payload.error);
  return (payload.devices ?? []).map(normaliseDevice);
};

export const getAvailablePorts = async (): Promise<string[]> => {
  const response = await createRequest('/ports');
  const payload = await parseJson<PortsResponse>(response);
  ensureSuccess(payload.success, 'Failed to load serial ports', payload.error);
  return payload.ports ?? [];
};

export const connectToDevice = async (deviceType: string, port?: string): Promise<DeviceInfo> => {
  const response = await createRequest('/connect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ device_type: deviceType, port }),
  });
  const payload = await parseJson<ConnectResponse>(response);
  ensureSuccess(payload.success && Boolean(payload.device), 'Failed to connect to device', payload.error);
  if (!payload.device) {
    throw new Error('Device payload missing from response');
  }
  return normaliseDevice(payload.device);
};

export const disconnectFromDevice = async (deviceId: string): Promise<string> => {
  const response = await createRequest(`/disconnect/${deviceId}`, {
    method: 'POST',
  });
  const payload = await parseJson<DisconnectResponse>(response);
  ensureSuccess(payload.success, 'Failed to disconnect device', payload.error);
  return payload.message ?? 'Device disconnected';
};

export const getDeviceMeasurement = async (deviceId: string): Promise<MeasurementResponse> => {
  const response = await createRequest(`/measurement/${deviceId}`);
  const payload = await parseJson<MeasurementApiResponse>(response);
  ensureSuccess(payload.success, 'Device measurement request failed', payload.error);
  return payload.data;
};
