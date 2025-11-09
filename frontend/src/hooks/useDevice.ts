import { useCallback, useEffect, useRef, useState } from 'react';
import type { DeviceInfo, MeasurementResponse, MeasurementSample } from '../types/deviceData.ts';
import {
  connectToDevice,
  disconnectFromDevice,
  getAvailablePorts,
  getDeviceMeasurement,
  getDeviceStatus,
} from '../api/deviceClient.ts';

export type { DeviceInfo, MeasurementResponse, MeasurementSample } from '../types/deviceData.ts';

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

const HISTORY_LIMIT = 5000;
const POLL_INTERVAL_MS = 500;

const createMeasurementSample = (
  deviceId: string,
  measurement: MeasurementResponse,
  deviceMeta?: DeviceInfo,
): MeasurementSample => {
  const timestampMs = measurement.timestamp ? Date.parse(measurement.timestamp) : Date.now();
  const sample: MeasurementSample = {
    deviceId,
    deviceType: deviceMeta?.deviceType ?? 'Unknown',
    deviceLabel: deviceMeta ? `${deviceMeta.model} (${deviceMeta.deviceType})` : deviceId,
    value: Number(measurement.value ?? 0),
    unit: normaliseUnit(measurement.unit),
    timestamp: Number.isNaN(timestampMs) ? Date.now() : timestampMs,
  };

  if (measurement.state) {
    sample.state = measurement.state;
  }
  if (measurement.attribute) {
    sample.attribute = measurement.attribute;
  }

  return sample;
};

const appendSampleToHistory = (
  historyMap: MeasurementHistory,
  sample: MeasurementSample,
): MeasurementHistory => {
  const existingHistory = historyMap[sample.deviceId] ?? [];
  const lastSample = existingHistory.length > 0 ? existingHistory[existingHistory.length - 1] : undefined;
  const hasUnitChanged = lastSample ? lastSample.unit !== sample.unit : false;
  // Reset history when the unit changes to avoid mixing incompatible samples.
  const seedHistory = hasUnitChanged ? [] : existingHistory;
  const updatedHistory = [...seedHistory, sample];
  const trimmedHistory = updatedHistory.length > HISTORY_LIMIT
    ? updatedHistory.slice(updatedHistory.length - HISTORY_LIMIT)
    : updatedHistory;

  return {
    ...historyMap,
    [sample.deviceId]: trimmedHistory,
  };
};

export const useDevices = () => {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availablePorts, setAvailablePorts] = useState<string[]>([]);
  const [measurementHistory, setMeasurementHistory] = useState<MeasurementHistory>({});
  const pollingHandles = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const inFlightRequests = useRef(new Set<string>());

  const updateDeviceStatus = useCallback(async () => {
    try {
      const status = await getDeviceStatus();
      setDevices(status);
    } catch (error) {
      console.error('Failed to get device status:', error);
      setDevices([]);
    }
  }, []);

  const fetchAvailablePorts = useCallback(async () => {
    try {
      const ports = await getAvailablePorts();
      setAvailablePorts(ports);
    } catch (error) {
      console.error('Failed to load serial ports:', error);
    }
  }, []);

  const connectDevice = useCallback(async (deviceType: string, port?: string) => {
    setIsLoading(true);
    try {
      const device = await connectToDevice(deviceType, port);
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
      const message = await disconnectFromDevice(deviceId);
      setMeasurementHistory((prev) => {
        const { [deviceId]: _removed, ...rest } = prev;
        return rest;
      });
      return message;
    } finally {
      await updateDeviceStatus();
    }
  }, [updateDeviceStatus]);

  const getMeasurement = useCallback(async (deviceId: string) => {
    const measurement = await getDeviceMeasurement(deviceId);
    const deviceMeta = devices.find((device) => device.id === deviceId);

    setMeasurementHistory((prev) => {
      const sample = createMeasurementSample(deviceId, measurement, deviceMeta);
      return appendSampleToHistory(prev, sample);
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
    void updateDeviceStatus();
    void fetchAvailablePorts();

    const handleFocus = () => {
      void updateDeviceStatus();
      void fetchAvailablePorts();
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