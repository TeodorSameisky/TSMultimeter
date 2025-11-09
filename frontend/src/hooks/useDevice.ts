import { useState, useEffect, useCallback, useRef } from 'react';

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
};

type PortsResponse = {
  success: boolean;
  ports?: string[] | null;
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

const UNIT_DISPLAY_MAP: Record<string, string> = {
  None: 'Unknown',
  VoltDc: 'VDC',
  VoltAc: 'VAC',
  VoltAcPlusDc: 'VAC+DC',
  Volt: 'V',
  AmpDc: 'ADC',
  AmpAc: 'AAC',
  AmpAcPlusDc: 'AAC+DC',
  Amp: 'A',
  Ohm: 'Ω',
  Siemens: 'S',
  Hertz: 'Hz',
  Second: 's',
  Farad: 'F',
  Celsius: '°C',
  Fahrenheit: '°F',
  Percent: '%',
  DecibelM: 'dBm',
  DecibelV: 'dBV',
  Decibel: 'dB',
  CrestFactor: 'CF',
};

const normaliseUnit = (unit?: string | null): string => {
  if (!unit) {
    return 'Unknown';
  }
  const trimmed = unit.trim();
  if (trimmed.length === 0) {
    return 'Unknown';
  }
  return UNIT_DISPLAY_MAP[trimmed] ?? UNIT_DISPLAY_MAP[trimmed.replace(/\s+/g, '')] ?? trimmed;
};

type MeasurementHistory = Record<string, MeasurementSample[]>;

const API_BASE = 'http://127.0.0.1:8080';
const HISTORY_LIMIT = 5000;
const POLL_INTERVAL_MS = 500;

export const useDevices = () => {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availablePorts, setAvailablePorts] = useState<string[]>([]);
  const [measurementHistory, setMeasurementHistory] = useState<MeasurementHistory>({});
  const pollingHandles = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const inFlightRequests = useRef(new Set<string>());

  const normaliseDevice = (device: RawDeviceInfo): DeviceInfo => ({
    id: String(device.id ?? 'unknown-device'),
    connected: Boolean(device.connected),
    deviceType: device.device_type ?? 'Unknown',
    model: device.info?.model ?? 'Unknown',
    serialNumber: device.info?.serial_number ?? 'N/A',
    softwareVersion: device.info?.software_version ?? 'N/A',
  });

  const updateDeviceStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/status`);
      const result: DevicesResponse = await response.json();
      if (result.success) {
        const parsedDevices = (result.devices ?? []).map(normaliseDevice);
        setDevices(parsedDevices);
      }
    } catch (error) {
      console.error('Failed to get device status:', error);
      setDevices([]);
    }
  }, []);

  const fetchAvailablePorts = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/ports`);
      const result: PortsResponse = await response.json();
      if (result.success) {
        setAvailablePorts(result.ports ?? []);
      }
    } catch (error) {
      console.error('Failed to load serial ports:', error);
    }
  }, []);

  const connectDevice = useCallback(async (deviceType: string, port?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ device_type: deviceType, port }),
      });
        const result: ConnectResponse = await response.json();
      if (!result.success || !result.device) {
        throw new Error(result.error ?? 'Failed to connect to device');
      }
        const device = normaliseDevice(result.device);
        return {
          deviceId: device.id,
          device,
      };
    } finally {
      await updateDeviceStatus();
      setIsLoading(false);
    }
  }, [updateDeviceStatus]);

  const disconnectDevice = useCallback(async (deviceId: string) => {
    try {
      const response = await fetch(`${API_BASE}/disconnect/${deviceId}`, {
        method: 'POST',
      });
      const result: DisconnectResponse = await response.json();
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to disconnect device');
      }
      setMeasurementHistory((prev) => {
        const { [deviceId]: _removed, ...rest } = prev;
        return rest;
      });
      return result.message ?? 'Device disconnected';
    } finally {
      await updateDeviceStatus();
    }
  }, [updateDeviceStatus]);

  const getMeasurement = useCallback(async (deviceId: string) => {
    const response = await fetch(`${API_BASE}/measurement/${deviceId}`);
    const result: MeasurementApiResponse = await response.json();
    if (!result.success) {
      throw new Error(result.error ?? 'Device measurement request failed');
    }

    const measurement: MeasurementResponse = result.data;
    const deviceMeta = devices.find((device) => device.id === deviceId);
    const timestamp = measurement.timestamp ? Date.parse(measurement.timestamp) : Date.now();
    const unit = normaliseUnit(measurement.unit);

    setMeasurementHistory((prev) => {
      const history = prev[deviceId] ?? [];
      const nextSample: MeasurementSample = {
        deviceId,
        deviceType: deviceMeta?.deviceType ?? 'Unknown',
        deviceLabel: deviceMeta ? `${deviceMeta.model} (${deviceMeta.deviceType})` : deviceId,
        value: Number(measurement.value ?? 0),
        unit,
        timestamp: Number.isNaN(timestamp) ? Date.now() : timestamp,
        ...(measurement.state ? { state: measurement.state } : {}),
        ...(measurement.attribute ? { attribute: measurement.attribute } : {}),
      };

  const lastSample = history.length > 0 ? history[history.length - 1] : undefined;
  const unitChanged = lastSample ? lastSample.unit !== nextSample.unit : false;
      const seedHistory = unitChanged ? [] : history;

      const updatedHistory = [...seedHistory, nextSample];
      const trimmed = updatedHistory.length > HISTORY_LIMIT
        ? updatedHistory.slice(updatedHistory.length - HISTORY_LIMIT)
        : updatedHistory;

      return {
        ...prev,
        [deviceId]: trimmed,
      };
    });

    return measurement;
  }, [devices]);

  const clearMeasurementHistory = useCallback((deviceId?: string) => {
    if (!deviceId) {
      setMeasurementHistory({});
      return;
    }

    setMeasurementHistory((prev) => {
      const { [deviceId]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const pollDeviceOnce = useCallback(async (deviceId: string) => {
    if (inFlightRequests.current.has(deviceId)) {
      return;
    }
    inFlightRequests.current.add(deviceId);
    try {
      await getMeasurement(deviceId);
    } catch (error) {
      console.error(`Failed to poll measurement for ${deviceId}`, error);
    } finally {
      inFlightRequests.current.delete(deviceId);
    }
  }, [getMeasurement]);

  const startPollingDevice = useCallback((deviceId: string) => {
    if (pollingHandles.current[deviceId]) {
      return;
    }
    void pollDeviceOnce(deviceId);
    pollingHandles.current[deviceId] = setInterval(() => {
      void pollDeviceOnce(deviceId);
    }, POLL_INTERVAL_MS);
  }, [pollDeviceOnce]);

  const stopPollingDevice = useCallback((deviceId: string) => {
    const handle = pollingHandles.current[deviceId];
    if (handle) {
      clearInterval(handle);
      delete pollingHandles.current[deviceId];
    }
    inFlightRequests.current.delete(deviceId);
  }, []);

  useEffect(() => {
    const connectedIds = new Set(devices.filter((device) => device.connected).map((device) => device.id));
    connectedIds.forEach((deviceId) => startPollingDevice(deviceId));
    Object.keys(pollingHandles.current).forEach((deviceId) => {
      if (!connectedIds.has(deviceId)) {
        stopPollingDevice(deviceId);
      }
    });
  }, [devices, startPollingDevice, stopPollingDevice]);

  useEffect(() => () => {
    Object.keys(pollingHandles.current).forEach((deviceId) => {
      clearInterval(pollingHandles.current[deviceId]);
    });
    pollingHandles.current = {};
    inFlightRequests.current.clear();
  }, []);

  // Update status on mount and when window regains focus
  useEffect(() => {
    updateDeviceStatus();
    fetchAvailablePorts();

    const handleFocus = () => {
      updateDeviceStatus();
      fetchAvailablePorts();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [updateDeviceStatus, fetchAvailablePorts]);

  return {
    devices,
    isLoading,
    connectDevice,
    disconnectDevice,
    getMeasurement,
    updateDeviceStatus,
    availablePorts,
    refreshPorts: fetchAvailablePorts,
    measurementHistory,
    clearMeasurementHistory,
  };
};

// Legacy hook for backward compatibility (single device)
export const useDevice = () => {
  const {
    devices,
    connectDevice,
    disconnectDevice,
    getMeasurement,
    updateDeviceStatus,
    measurementHistory,
    clearMeasurementHistory,
  } = useDevices();

  const deviceStatus = devices.length > 0 ? devices[0] : { connected: false };
  const isConnected = devices.length > 0 && devices[0]?.connected;

  const legacyConnectDevice = useCallback(async (deviceType: string, port?: string) => {
    const result = await connectDevice(deviceType, port);
    return `Connected ${result.device.deviceType} as ${result.deviceId}`;
  }, [connectDevice]);

  const legacyDisconnectDevice = useCallback(async () => {
    if (devices.length > 0 && devices[0]) {
      const result = await disconnectDevice(devices[0].id);
      return result;
    }
    throw new Error('No device connected');
  }, [devices, disconnectDevice]);

  const legacyGetMeasurement = useCallback(async () => {
    if (devices.length > 0 && devices[0]) {
      return await getMeasurement(devices[0].id);
    }
    throw new Error('No device connected');
  }, [devices, getMeasurement]);

  return {
    deviceStatus,
    isConnected,
    connectDevice: legacyConnectDevice,
    disconnectDevice: legacyDisconnectDevice,
    getMeasurement: legacyGetMeasurement,
    updateDeviceStatus,
    measurementHistory,
    clearMeasurementHistory,
  };
};