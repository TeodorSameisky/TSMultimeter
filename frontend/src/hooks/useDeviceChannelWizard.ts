import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { ChannelConfig, ChannelWizardFormState, DeviceChannelConfig } from '../types/channel.ts';
import { isDeviceChannel } from '../types/channel.ts';
import type { DeviceTypeOption, DeviceTypeOptionValue } from '../types/devices.ts';
import { pickChannelColor } from '../utils/channelColors.ts';

type ConnectDeviceResult = {
  deviceId: string;
  device: {
    model: string;
    deviceType: string;
  };
};

type ConnectDeviceFn = (deviceType: string, port?: string) => Promise<ConnectDeviceResult>;

type UseDeviceChannelWizardInput = {
  deviceTypeOptions: readonly DeviceTypeOption[];
  developerModeEnabled: boolean;
  availablePorts: string[];
  refreshPorts: () => Promise<void> | void;
  connectDevice: ConnectDeviceFn;
  setChannelConfigs: React.Dispatch<React.SetStateAction<ChannelConfig[]>>;
};

type DeviceChannelWizardResult = {
  isOpen: boolean;
  form: ChannelWizardFormState;
  isLinking: boolean;
  error: string | null;
  open: (existingChannelCount: number) => void;
  close: () => void;
  changeDeviceType: (deviceType: DeviceTypeOptionValue) => void;
  changePort: (port: string) => void;
  changeAlias: (alias: string) => void;
  submit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

const resolveFallbackDeviceType = (options: readonly DeviceTypeOption[]): DeviceTypeOptionValue => (
  (options[0]?.value ?? 'Fluke289') as DeviceTypeOptionValue
);

const createDefaultForm = (deviceType: DeviceTypeOptionValue): ChannelWizardFormState => ({
  deviceType,
  port: '',
  alias: '',
});

export const useDeviceChannelWizard = (
  input: UseDeviceChannelWizardInput,
): DeviceChannelWizardResult => {
  const {
    deviceTypeOptions,
    developerModeEnabled,
    availablePorts,
    refreshPorts,
    connectDevice,
    setChannelConfigs,
  } = input;

  const fallbackDeviceType = useMemo(
    () => resolveFallbackDeviceType(deviceTypeOptions),
    [deviceTypeOptions],
  );

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<ChannelWizardFormState>(() => createDefaultForm(fallbackDeviceType));
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setForm(createDefaultForm(fallbackDeviceType));
    setError(null);
  }, [fallbackDeviceType]);

  const close = useCallback(() => {
    setIsOpen(false);
    resetForm();
  }, [resetForm]);

  const open = useCallback((existingChannelCount: number) => {
    setForm({
      ...createDefaultForm(fallbackDeviceType),
      alias: `Channel ${existingChannelCount + 1}`,
    });
    setError(null);
    setIsOpen(true);
    void refreshPorts();
  }, [fallbackDeviceType, refreshPorts]);

  const changeDeviceType = useCallback((deviceType: DeviceTypeOptionValue) => {
    setForm((prev) => ({
      ...prev,
      deviceType,
    }));
  }, []);

  const changePort = useCallback((port: string) => {
    setForm((prev) => ({
      ...prev,
      port,
    }));
  }, []);

  const changeAlias = useCallback((alias: string) => {
    setForm((prev) => ({
      ...prev,
      alias,
    }));
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (form.deviceType === 'Mock') {
      if (form.port !== '') {
        setForm((prev) => ({ ...prev, port: '' }));
      }
      return;
    }
    if (availablePorts.length > 0 && !availablePorts.includes(form.port)) {
      const nextPort = availablePorts[0] ?? '';
      if (form.port !== nextPort) {
        setForm((prev) => ({ ...prev, port: nextPort }));
      }
    }
  }, [availablePorts, form.deviceType, form.port, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (form.deviceType !== 'Mock') {
      void refreshPorts();
    }
  }, [form.deviceType, isOpen, refreshPorts]);

  useEffect(() => {
    setForm((prev) => {
      const allowed = new Set(deviceTypeOptions.map((option) => option.value));
      if (allowed.has(prev.deviceType) && (developerModeEnabled || prev.deviceType !== 'Mock')) {
        return prev;
      }
      const fallback = allowed.size > 0 ? fallbackDeviceType : prev.deviceType;
      if (fallback === prev.deviceType) {
        return prev;
      }
      return {
        ...prev,
        deviceType: fallback,
        port: '',
      } satisfies ChannelWizardFormState;
    });
  }, [deviceTypeOptions, developerModeEnabled, fallbackDeviceType]);

  const submit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLinking) {
      return;
    }

    setError(null);
    const isMockSelection = form.deviceType === 'Mock';
    if (isMockSelection && !developerModeEnabled) {
      setError('Enable developer features to use the mock device.');
      return;
    }
    if (!isMockSelection && !form.port) {
      setError('Please select a serial port for this device.');
      return;
    }

    try {
      setIsLinking(true);
      const result = await connectDevice(form.deviceType, isMockSelection ? undefined : form.port);
      const alias = form.alias.trim() || result.device.model || 'Channel';

      setChannelConfigs((prev) => {
        const next = [...prev];
        const existingIndex = next.findIndex(
          (entry) => isDeviceChannel(entry) && entry.deviceId === result.deviceId,
        );

        if (existingIndex !== -1) {
          const existing = next[existingIndex];
          if (existing && isDeviceChannel(existing)) {
            next[existingIndex] = {
              ...existing,
              alias,
              enabled: true,
            } satisfies DeviceChannelConfig;
          }
          return next;
        }

        const usedColors = new Set(next.map((entry) => entry.color));
        const color = pickChannelColor(usedColors);

        next.push({
          id: result.deviceId,
          type: 'device',
          deviceId: result.deviceId,
          alias,
          color,
          enabled: true,
        });

        return next;
      });

      close();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message || 'Failed to connect device.');
    } finally {
      setIsLinking(false);
    }
  }, [close, connectDevice, developerModeEnabled, form.alias, form.deviceType, form.port, isLinking, setChannelConfigs]);

  return {
    isOpen,
    form,
    isLinking,
    error,
    open,
    close,
    changeDeviceType,
    changePort,
    changeAlias,
    submit,
  };
};
