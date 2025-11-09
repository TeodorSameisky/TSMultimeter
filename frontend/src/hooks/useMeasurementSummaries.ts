import { useCallback, useMemo, useState } from 'react';
import type { DeviceInfo, MeasurementSample } from '../types/deviceData.ts';
import type { MeasurementConfig, MeasurementKind, MeasurementFormState } from '../types/measurement.ts';
import type { MeasurementSummary } from '../components/Measurements/MeasurementPanel.tsx';
import type { ChannelStyleMap } from '../components/MeasurementHistory/types';
import { createId } from '../utils/createId.ts';

const computeStatistic = (kind: MeasurementKind, samples: MeasurementSample[]): number | null => {
  if (samples.length === 0) {
    return null;
  }

  const values = samples
    .map((sample) => sample.value)
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    return null;
  }

  switch (kind) {
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    case 'mean': {
      const sum = values.reduce((acc, value) => acc + value, 0);
      return sum / values.length;
    }
    default:
      return values[values.length - 1] ?? null;
  }
};

const resolveUnit = (samples: MeasurementSample[]): string | undefined => {
  for (let index = samples.length - 1; index >= 0; index -= 1) {
    const unit = samples[index]?.unit?.trim();
    if (unit) {
      return unit;
    }
  }
  return undefined;
};

const createDefaultMeasurementForm = (): MeasurementFormState => ({
  channelId: '',
  kind: 'min',
});

export type MeasurementSummaryInput = {
  measurementHistory: Record<string, MeasurementSample[]>;
  channelStyles: ChannelStyleMap;
  devices: DeviceInfo[];
};

export const useMeasurementSummaries = (input: MeasurementSummaryInput) => {
  const [measurementConfigs, setMeasurementConfigs] = useState<MeasurementConfig[]>([]);
  const [measurementForm, setMeasurementForm] = useState<MeasurementFormState>(() => createDefaultMeasurementForm());

  const measurementSummaries = useMemo<MeasurementSummary[]>(() => (
    measurementConfigs.map((config) => {
  const samples = input.measurementHistory[config.channelId] ?? [];
      const value = computeStatistic(config.kind, samples);
  const channelState = input.channelStyles[config.channelId];
      const accent = channelState?.color ?? '#6ca0ff';
  const fallbackAlias = input.devices.find((device) => device.id === config.channelId)?.model ?? config.channelId;
  const channelAlias = channelState?.alias ?? fallbackAlias;
      const summary: MeasurementSummary = {
        config,
        value,
        sampleCount: samples.length,
        accent,
        channelAlias,
      };
      const unit = resolveUnit(samples);
      if (unit) {
        summary.unit = unit;
      }
      return summary;
    })
  ), [measurementConfigs, input.measurementHistory, input.channelStyles, input.devices]);

  const updateMeasurementForm = useCallback((field: keyof MeasurementFormState, value: string) => {
    setMeasurementForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const prepareMeasurementForm = useCallback((initialChannelId: string | undefined) => {
    const preferredDevice = input.devices.find((device) => device.connected) ?? input.devices[0] ?? null;
    const channelId = initialChannelId ?? preferredDevice?.id ?? '';
    setMeasurementForm({
      ...createDefaultMeasurementForm(),
      channelId,
    });
  }, [input.devices]);

  const resetMeasurementForm = useCallback(() => {
    setMeasurementForm(createDefaultMeasurementForm());
  }, []);

  const submitMeasurement = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!measurementForm.channelId) {
      return false;
    }
    setMeasurementConfigs((prev) => [
      ...prev,
      {
        id: createId(),
        channelId: measurementForm.channelId,
        kind: measurementForm.kind,
      },
    ]);
    setMeasurementForm(createDefaultMeasurementForm());
    return true;
  }, [measurementForm]);

  const removeMeasurement = useCallback((id: string) => {
    setMeasurementConfigs((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  return {
    measurementSummaries,
    measurementForm,
    updateMeasurementForm,
    prepareMeasurementForm,
    resetMeasurementForm,
  submitMeasurement,
    removeMeasurement,
  } as const;
};
