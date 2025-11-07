import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import 'katex/dist/katex.min.css';
import styled, { css } from 'styled-components';
import { MeasurementHistory } from './components/MeasurementHistory';
import { MathChannelWizardDialog } from './components/MathChannelWizard/MathChannelWizardDialog.tsx';
import { MeasurementWizard } from './components/MeasurementWizard/MeasurementWizard.tsx';
import { ModalBackdrop, ModalCard } from './components/common/ModalPrimitives.ts';
import { useDevices } from './hooks/useDevice.ts';
import type { MeasurementSample } from './hooks/useDevice.ts';
import { useMathChannelHistory } from './hooks/useMathChannelHistory.ts';
import { formatMeasurementValue } from './utils/formatNumber.ts';
import { evaluateMathExpression } from './utils/mathExpressions.ts';
import { createId } from './utils/createId.ts';
import type {
  ChannelConfig,
  ChannelSettingsDraft,
  ChannelWizardFormState,
  DeviceChannelConfig,
  MathChannelConfig,
  MathChannelSubmission,
} from './types/channel.ts';
import { isDeviceChannel, isMathChannel } from './types/channel.ts';
import type { MeasurementConfig, MeasurementFormState, MeasurementKind } from './types/measurement.ts';
import { MEASUREMENT_KIND_LABELS } from './types/measurement.ts';
import { ChannelWizard } from './components/ChannelWizard/ChannelWizard.tsx';
import { ChannelStrip } from './components/ChannelStrip/ChannelStrip.tsx';
import { buildDefaultMathAlias } from './utils/mathChannelDefaults.ts';
import { channelSettingsReducer } from './state/channelSettingsReducer.ts';
import { DEVICE_TYPE_OPTIONS, type DeviceTypeOption, type DeviceTypeOptionValue } from './types/devices.ts';

type MeasurementSummary = {
  config: MeasurementConfig;
  value: number | null;
  unit?: string;
  sampleCount: number;
  accent: string;
  channelAlias: string;
};

const CHANNEL_COLOR_PALETTE = [
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#9b59b6',
  '#f39c12',
  '#1abc9c',
  '#d35400',
  '#34495e',
  '#8e44ad',
  '#16a085',
];

const pickChannelColor = (usedColors: Set<string>, preferred?: string) => {
  if (preferred && !usedColors.has(preferred)) {
    usedColors.add(preferred);
    return preferred;
  }
  for (const color of CHANNEL_COLOR_PALETTE) {
    if (!usedColors.has(color)) {
      usedColors.add(color);
      return color;
    }
  }
  const fallback = CHANNEL_COLOR_PALETTE[usedColors.size % CHANNEL_COLOR_PALETTE.length]
    ?? CHANNEL_COLOR_PALETTE[0]
    ?? '#95a5a6';
  usedColors.add(fallback);
  return fallback;
};

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

const DEVELOPER_MODE_STORAGE_KEY = 'tsmultimeter:developer-mode';

const createDefaultChannelForm = (deviceType: DeviceTypeOptionValue = 'Fluke289'): ChannelWizardFormState => ({
  deviceType,
  port: '',
  alias: '',
});

const createDefaultMeasurementForm = (): MeasurementFormState => ({
  deviceId: '',
  kind: 'min',
});

const AppShell = styled.div`
  position: relative;
  display: flex;
  align-items: stretch;
  height: 100vh;
  background: #0c121a;
  color: #e5edf8;
  font-family: 'Segoe UI', 'Roboto', sans-serif;
  overflow: hidden;
`;

const EdgeTabRail = styled.div<{ $position: 'left' | 'right' }>`
  width: 56px;
  background: #0a0f17;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 1.5rem 0;
  gap: 1rem;
  z-index: 4;

  ${({ $position }) => ($position === 'left'
    ? css`
        border-right: 1px solid rgba(255, 255, 255, 0.06);
      `
    : css`
        border-left: 1px solid rgba(255, 255, 255, 0.06);
      `)}
`;

const EdgeTabButton = styled.button<{ $active: boolean }>`
  width: 40px;
  height: 160px;
  border-radius: 20px;
  border: 1px solid transparent;
  background: ${({ $active }) => ($active
    ? 'linear-gradient(135deg, rgba(55, 134, 255, 0.9), rgba(105, 168, 255, 0.95))'
    : 'rgba(255, 255, 255, 0.04)')};
  color: ${({ $active }) => ($active ? '#ffffff' : '#7d8aa1')};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-weight: 600;
  font-size: 0.8rem;
  letter-spacing: 0.14em;
  padding: 0.75rem 0.35rem;
  transition: all 0.25s ease;

  &:hover {
    color: #ffffff;
    background: ${({ $active }) => ($active
      ? 'linear-gradient(135deg, rgba(55, 134, 255, 1), rgba(105, 168, 255, 1))'
      : 'rgba(55, 134, 255, 0.2)')};
  }

  &:active {
    transform: translateY(1px);
  }
`;

const CentralStage = styled.div<{ $leftPanelOpen: boolean; $rightPanelOpen: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.75rem 3rem;
  background: radial-gradient(circle at 25% -10%, rgba(41, 66, 112, 0.5), transparent 55%),
    radial-gradient(circle at 80% 0%, rgba(36, 78, 184, 0.35), rgba(12, 18, 26, 0.9) 65%),
    linear-gradient(180deg, rgba(9, 14, 22, 0.92) 0%, rgba(9, 14, 22, 0.98) 100%);
  position: relative;
  overflow: hidden;
  margin-left: ${({ $leftPanelOpen }) => ($leftPanelOpen ? '360px' : '0')};
  margin-right: ${({ $rightPanelOpen }) => ($rightPanelOpen ? '360px' : '0')};
  transition: margin 0.32s ease;
`;

const StageHeader = styled.header`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`;

const StageTitle = styled.h1`
  margin: 0;
  font-size: 1.6rem;
  font-weight: 600;
  color: #f5f8ff;
`;

const StageSubtitle = styled.p`
  margin: 0;
  color: #8b96aa;
  font-size: 0.95rem;
`;

const ScopeCanvas = styled.section`
  flex: 1;
  min-height: 0;
  background: rgba(13, 20, 30, 0.6);
  border-radius: 18px;
  padding: 1.2rem 1.5rem 1.5rem;
  box-shadow: 0 28px 60px rgba(3, 10, 24, 0.55);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
`;

const ScopeContent = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

const ScopeHistoryContainer = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;


const SidePanel = styled.aside<{ $position: 'left' | 'right'; $open: boolean }>`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 360px;
  background: rgba(11, 18, 28, 0.98);
  backdrop-filter: blur(18px);
  padding: 1.5rem 1.75rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  z-index: 12;
  pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
  transition: transform 0.32s ease;

  ${({ $position, $open }) => ($position === 'left'
    ? css`
        left: 0;
        border-right: 1px solid rgba(255, 255, 255, 0.06);
        box-shadow: 18px 0 45px rgba(0, 0, 0, 0.45);
        transform: translateX(${ $open ? '56px' : '-100%' });
      `
    : css`
        right: 0;
        border-left: 1px solid rgba(255, 255, 255, 0.06);
        box-shadow: -18px 0 45px rgba(0, 0, 0, 0.45);
        transform: translateX(${ $open ? '-56px' : '100%' });
      `)}
`;

const PanelHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const PanelHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const PanelTitle = styled.h2`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #f2f7ff;
`;

const ToolbarButton = styled.button`
  border: none;
  border-radius: 999px;
  background: rgba(55, 134, 255, 0.85);
  color: #fff;
  font-weight: 600;
  font-size: 0.8rem;
  padding: 0.35rem 0.8rem;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(55, 134, 255, 1);
  }
`;

const PanelBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const PanelSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const PanelSectionTitle = styled.h3`
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #8ea0bd;
`;

const PanelText = styled.p`
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.5;
  color: #9fb4d7;
`;

const PanelList = styled.ul`
  margin: 0;
  padding-left: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #9fb4d7;
`;

const PanelListItem = styled.li`
  line-height: 1.5;
`;

const EmptyNote = styled.div`
  border-radius: 12px;
  border: 1px dashed rgba(255, 255, 255, 0.12);
  background: rgba(14, 22, 34, 0.7);
  color: #8fa0be;
  padding: 1rem;
  font-size: 0.85rem;
  text-align: center;
`;

const SettingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  padding: 0.9rem 1.1rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
`;

const SettingInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const SettingLabel = styled.span`
  font-weight: 600;
  color: #f4f8ff;
`;

const SettingDescription = styled.span`
  font-size: 0.8rem;
  line-height: 1.4;
  color: #8faad0;
`;

const SettingToggle = styled.button<{ $active: boolean }>`
  position: relative;
  width: 54px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid ${({ $active }) => ($active ? 'rgba(86, 156, 255, 0.85)' : 'rgba(255, 255, 255, 0.2)')};
  background: ${({ $active }) => ($active
    ? 'linear-gradient(135deg, rgba(70, 145, 255, 0.95), rgba(112, 184, 255, 0.95))'
    : 'rgba(10, 16, 24, 0.85)')};
  cursor: pointer;
  padding: 0;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;

  &:focus-visible {
    outline: 2px solid rgba(120, 182, 255, 0.95);
    outline-offset: 3px;
  }
`;

const ToggleThumb = styled.span<{ $active: boolean }>`
  position: absolute;
  top: 4px;
  left: ${({ $active }) => ($active ? 'calc(100% - 22px)' : '4px')};
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.25);
  transition: left 0.2s ease;
`;

const MeasurementList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
`;

const MeasurementItem = styled.div<{ $accent: string }>`
  border-radius: 12px;
  border: 1px solid ${({ $accent }) => `${$accent}3f`};
  background: ${({ $accent }) => `linear-gradient(145deg, rgba(12, 18, 30, 0.82), rgba(12, 18, 30, 0.92)), linear-gradient(145deg, ${$accent}1f, rgba(255, 255, 255, 0.03))`};
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  box-shadow: 0 16px 32px rgba(5, 10, 18, 0.35);
`;

const MeasurementHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const MeasurementName = styled.span`
  font-weight: 600;
  font-size: 0.95rem;
  color: #f1f6ff;
`;

const MeasurementBadge = styled.span<{ $accent: string }>`
  border-radius: 999px;
  padding: 0.15rem 0.6rem;
  font-size: 0.72rem;
  font-weight: 600;
  background: ${({ $accent }) => `${$accent}33`};
  color: ${({ $accent }) => `${$accent}dd`};
  letter-spacing: 0.05em;
`;

const MeasurementValue = styled.div<{ $accent: string }>`
  display: inline-flex;
  align-items: baseline;
  gap: 0.4rem;
  font-family: 'Roboto Mono', 'SFMono-Regular', monospace;

  .value {
    font-size: 1.5rem;
    font-weight: 700;
    color: ${({ $accent }) => $accent};
    text-shadow: ${({ $accent }) => `0 0 22px ${$accent}55`};
  }

  .unit {
    font-size: 0.9rem;
    font-weight: 600;
    color: rgba(223, 233, 255, 0.8);
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
`;

const MeasurementActions = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const RemoveMeasurementButton = styled.button<{ $accent: string }>`
  border: none;
  border-radius: 999px;
  background: ${({ $accent }) => `${$accent}22`};
  color: ${({ $accent }) => `${$accent}dd`};
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.3rem 0.7rem;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;

  &:hover {
    background: ${({ $accent }) => `${$accent}33`};
    color: ${({ $accent }) => `${$accent}ff`};
  }
`;



function App() {
  const {
    devices,
    connectDevice,
    disconnectDevice,
    isLoading,
    availablePorts,
    refreshPorts,
    measurementHistory,
    clearMeasurementHistory,
  } = useDevices();

  const [developerModeEnabled, setDeveloperModeEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.localStorage.getItem(DEVELOPER_MODE_STORAGE_KEY) === 'true';
  });

  const deviceTypeOptions = useMemo<readonly DeviceTypeOption[]>(() => (
    developerModeEnabled
      ? DEVICE_TYPE_OPTIONS
      : DEVICE_TYPE_OPTIONS.filter((option) => option.value !== 'Mock')
  ), [developerModeEnabled]);

  const [activeLeftPanel, setActiveLeftPanel] = useState<'settings' | 'about' | 'help' | null>(null);
  const [measurementsOpen, setMeasurementsOpen] = useState(false);
  const [channelConfigs, setChannelConfigs] = useState<ChannelConfig[]>([]);
  const [measurementConfigs, setMeasurementConfigs] = useState<MeasurementConfig[]>([]);
  const [channelWizardOpen, setChannelWizardOpen] = useState(false);
  const [measurementWizardOpen, setMeasurementWizardOpen] = useState(false);
  const [channelForm, setChannelForm] = useState<ChannelWizardFormState>(() => (
    createDefaultChannelForm((deviceTypeOptions[0]?.value ?? 'Fluke289') as DeviceTypeOptionValue)
  ));
  const [channelError, setChannelError] = useState<string | null>(null);
  const [isLinkingChannel, setIsLinkingChannel] = useState(false);
  const [measurementForm, setMeasurementForm] = useState<MeasurementFormState>(() => createDefaultMeasurementForm());
  const [channelSettingsDraft, dispatchChannelSettings] = useReducer(channelSettingsReducer, null as ChannelSettingsDraft | null);
  const [channelSettingsError, setChannelSettingsError] = useState<string | null>(null);
  const [mathChannelWizardOpen, setMathChannelWizardOpen] = useState(false);
  const [mathSettingsHelpChannelId, setMathSettingsHelpChannelId] = useState<string | null>(null);

  const resetChannelWizardState = useCallback(() => {
    const fallbackType = (deviceTypeOptions[0]?.value ?? 'Fluke289') as DeviceTypeOptionValue;
    setChannelForm(createDefaultChannelForm(fallbackType));
    setChannelError(null);
  }, [deviceTypeOptions, setChannelError]);

  const closeChannelWizard = useCallback(() => {
    setChannelWizardOpen(false);
    resetChannelWizardState();
  }, [resetChannelWizardState, setChannelWizardOpen]);

  const resetMeasurementWizardState = useCallback(() => {
    setMeasurementForm(createDefaultMeasurementForm());
  }, [setMeasurementForm]);

  const closeMeasurementWizard = useCallback(() => {
    setMeasurementWizardOpen(false);
    resetMeasurementWizardState();
  }, [resetMeasurementWizardState, setMeasurementWizardOpen]);

  const deviceChannels = useMemo(() => channelConfigs.filter(isDeviceChannel), [channelConfigs]);
  const mathChannels = useMemo(() => channelConfigs.filter(isMathChannel), [channelConfigs]);
  const [mathHistory, setMathHistory] = useMathChannelHistory(deviceChannels, mathChannels, measurementHistory);
  const deviceChannelById = useMemo(
    () => new Map(deviceChannels.map((channel) => [channel.id, channel])),
    [deviceChannels],
  );

  const combinedMeasurementHistory = useMemo(() => {
    if (Object.keys(mathHistory).length === 0) {
      return measurementHistory;
    }
    return {
      ...measurementHistory,
      ...mathHistory,
    };
  }, [measurementHistory, mathHistory]);

  const latestSampleByChannel = useMemo(() => {
    const entries: Record<string, MeasurementSample | undefined> = {};
    Object.entries(combinedMeasurementHistory).forEach(([channelId, samples]) => {
      if (samples.length > 0) {
        entries[channelId] = samples[samples.length - 1];
      }
    });
    return entries;
  }, [combinedMeasurementHistory]);

  const channelReadings = useMemo(
    () => channelConfigs.map((channel) => {
      const sampleKey = isDeviceChannel(channel) ? channel.deviceId : channel.id;
      const sample = latestSampleByChannel[sampleKey];
      return { channel, sample };
    }),
    [channelConfigs, latestSampleByChannel],
  );

  useEffect(() => {
    setChannelForm((prev) => {
      const allowed = new Set(deviceTypeOptions.map((option) => option.value));
      const firstValue = (deviceTypeOptions[0]?.value ?? 'Fluke289') as DeviceTypeOptionValue;
      if (allowed.has(prev.deviceType as DeviceTypeOptionValue) && (developerModeEnabled || prev.deviceType !== 'Mock')) {
        return prev;
      }
      const nextDeviceType = allowed.size > 0 ? firstValue : prev.deviceType as DeviceTypeOptionValue;
      if (nextDeviceType === prev.deviceType) {
        return prev;
      }
      return {
        ...prev,
        deviceType: nextDeviceType,
        port: '',
      } satisfies ChannelWizardFormState;
    });
  }, [developerModeEnabled, deviceTypeOptions]);

  useEffect(() => {
    setChannelConfigs((prev) => {
      const connectedDevices = devices.filter((device) => device.connected);
      const deviceChannels = prev.filter(isDeviceChannel);
      const mathChannels = prev.filter(isMathChannel);

      if (connectedDevices.length === 0) {
        if (deviceChannels.length === 0) {
          return prev;
        }
        return mathChannels;
      }

  const usedColors = new Set(mathChannels.map((entry) => entry.color));
      const prevByDevice = new Map(deviceChannels.map((entry) => [entry.deviceId, entry]));
      let mutated = deviceChannels.length !== connectedDevices.length;

      const nextDeviceChannels = connectedDevices.map<DeviceChannelConfig>((device) => {
        const existing = prevByDevice.get(device.id);
        if (existing?.color) {
          usedColors.delete(existing.color);
        }
        const color = pickChannelColor(usedColors, existing?.color);
        const alias = existing?.alias ?? `${device.model} (${device.deviceType})`;
        const enabled = existing?.enabled ?? true;
        const id = existing?.id ?? device.id;
        const unit = existing?.unit;

        if (
          existing
          && existing.alias === alias
          && existing.color === color
          && existing.enabled === enabled
          && existing.id === id
        ) {
          return existing;
        }

        mutated = true;

        return {
          id,
          type: 'device',
          deviceId: device.id,
          alias,
          color,
          enabled,
          ...(unit ? { unit } : {}),
        } satisfies DeviceChannelConfig;
      });

      if (!mutated && mathChannels.length === prev.length - deviceChannels.length) {
        const sameOrder = nextDeviceChannels.every((channel, index) => channel === deviceChannels[index]);
        if (sameOrder) {
          return prev;
        }
      }

      return [...nextDeviceChannels, ...mathChannels] satisfies ChannelConfig[];
    });
  }, [devices]);

  const channelStyles = useMemo(
    () => channelConfigs.reduce<Record<string, { alias: string; color: string; enabled: boolean; precision?: number }>>((acc, channel) => {
      const key = isDeviceChannel(channel) ? channel.deviceId : channel.id;
      acc[key] = {
        alias: channel.alias,
        color: channel.color,
        enabled: channel.enabled,
        ...(typeof channel.precision === 'number' ? { precision: channel.precision } : {}),
      };
      return acc;
    }, {}),
    [channelConfigs],
  );


  const measurementSummaries = useMemo<MeasurementSummary[]>(
    () => measurementConfigs.map((config) => {
      const samples = measurementHistory[config.deviceId] ?? [];
      const value = computeStatistic(config.kind, samples);
      const channelState = channelStyles[config.deviceId];
      const accent = channelState?.color ?? '#6ca0ff';
      const fallbackAlias = devices.find((device) => device.id === config.deviceId)?.model ?? config.deviceId;
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
    }),
    [measurementConfigs, measurementHistory, channelStyles, devices],
  );

  const openChannelWizard = () => {
    resetChannelWizardState();
    setChannelForm((prev) => ({
      ...prev,
      alias: `Channel ${channelConfigs.length + 1}`,
    }));
    setChannelWizardOpen(true);
    void refreshPorts();
  };

  const openMeasurementWizard = () => {
    const preferred = devices.find((device) => device.connected) ?? devices[0] ?? null;
    setMeasurementForm({
      ...createDefaultMeasurementForm(),
      deviceId: preferred?.id ?? '',
    });
    setMeasurementWizardOpen(true);
  };

  const openMathChannelWizard = () => {
    setMathChannelWizardOpen(true);
  };

  const handleCreateMathChannel = (submission: MathChannelSubmission) => {
  const alias = submission.alias.trim() || buildDefaultMathAlias(mathChannels.length);
    const usedColors = new Set(channelConfigs.map((entry) => entry.color));
    const color = pickChannelColor(usedColors);
    const id = createId();

    const nextConfig: MathChannelConfig = {
      id,
      type: 'math',
      alias,
      color,
      enabled: true,
      expression: submission.expression,
      inputs: submission.inputs,
      unit: submission.unit,
    };

    setChannelConfigs((prev) => [...prev, nextConfig]);
    setMathHistory((prev) => ({
      ...prev,
      [id]: prev[id] ?? [],
    }));
    setMathChannelWizardOpen(false);
  };

  const handleClearHistory = useCallback((targetId?: string) => {
    if (!targetId) {
      setMathHistory({});
      clearMeasurementHistory();
      return;
    }

    setMathHistory((prev) => {
      if (!(targetId in prev)) {
        return prev;
      }
      const { [targetId]: _removed, ...rest } = prev;
      return rest;
    });
    clearMeasurementHistory(targetId);
  }, [clearMeasurementHistory, setMathHistory]);

  useEffect(() => {
    if (!channelWizardOpen) {
      return;
    }
    if (channelForm.deviceType === 'Mock') {
      if (channelForm.port !== '') {
        setChannelForm((prev) => ({ ...prev, port: '' }));
      }
      return;
    }
    if (availablePorts.length > 0 && !availablePorts.includes(channelForm.port)) {
      const nextPort = availablePorts[0] ?? '';
      if (channelForm.port !== nextPort) {
        setChannelForm((prev) => ({ ...prev, port: nextPort }));
      }
    }
  }, [channelWizardOpen, channelForm.deviceType, channelForm.port, availablePorts]);

  useEffect(() => {
    if (!channelWizardOpen) {
      return;
    }
    if (channelForm.deviceType !== 'Mock') {
      void refreshPorts();
    }
  }, [channelWizardOpen, channelForm.deviceType, refreshPorts]);

  useEffect(() => {
    if (!mathChannelWizardOpen) {
      return;
    }
    if (deviceChannels.length === 0) {
      // Close the wizard when no device channels remain to avoid presenting an unusable dialog.
      setMathChannelWizardOpen(false);
    }
  }, [deviceChannels.length, mathChannelWizardOpen]);

  const handleChannelSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLinkingChannel) {
      return;
    }

    setChannelError(null);

    const isMockSelection = channelForm.deviceType === 'Mock';
    if (isMockSelection && !developerModeEnabled) {
      setChannelError('Enable developer features to use the mock device.');
      return;
    }
    if (!isMockSelection && !channelForm.port) {
      setChannelError('Please select a serial port for this device.');
      return;
    }

    try {
      setIsLinkingChannel(true);
      const result = await connectDevice(channelForm.deviceType, isMockSelection ? undefined : channelForm.port);
      const alias = channelForm.alias.trim() || result.device.model || 'Channel';
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
  closeChannelWizard();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setChannelError(message || 'Failed to connect device.');
    } finally {
      setIsLinkingChannel(false);
    }
  };

  const handleMeasurementSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!measurementForm.deviceId) {
      return;
    }
    setMeasurementConfigs((prev) => [
      ...prev,
      {
        id: createId(),
        deviceId: measurementForm.deviceId,
        kind: measurementForm.kind,
      },
    ]);
    closeMeasurementWizard();
  };

  const handleDisconnectChannel = async (channel: ChannelConfig) => {
    try {
      if (isDeviceChannel(channel)) {
        await disconnectDevice(channel.deviceId);
      }
    } catch (error) {
      if (isDeviceChannel(channel)) {
        console.error(`Failed to disconnect ${channel.deviceId}`, error);
      } else {
        console.error(`Failed to remove math channel ${channel.id}`, error);
      }
    } finally {
      setChannelConfigs((prev) => prev.filter((entry) => entry.id !== channel.id));
      if (channelSettingsDraft?.id === channel.id) {
        dispatchChannelSettings({ type: 'reset' });
      }
      if (isMathChannel(channel)) {
        setMathHistory((prev) => {
          if (!(channel.id in prev)) {
            return prev;
          }
          const { [channel.id]: _removed, ...rest } = prev;
          return rest;
        });
      }
    }
  };

  const handleToggleChannel = (id: string) => {
    setChannelConfigs((prev) => prev.map((entry) => (
      entry.id === id
        ? { ...entry, enabled: !entry.enabled }
        : entry
    )));
  };

  const toggleMathSettingsHelp = (channelId: string) => {
    setMathSettingsHelpChannelId((current) => (current === channelId ? null : channelId));
  };

  const openChannelSettings = (channel: ChannelConfig) => {
    setChannelSettingsError(null);
    setMathSettingsHelpChannelId(null);
    dispatchChannelSettings({ type: 'toggle-open', channel });
  };

  const handleChannelSettingsFieldChange = (
    field: 'alias' | 'color' | 'unit' | 'expression' | 'precision',
    value: string,
  ) => {
    setChannelSettingsError(null);
    if (field === 'precision') {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        dispatchChannelSettings({ type: 'update-precision' });
        return;
      }
      const parsed = Number(trimmed);
      if (Number.isNaN(parsed)) {
        return;
      }
      dispatchChannelSettings({ type: 'update-precision', precision: parsed });
      return;
    }

    if (field === 'unit' || field === 'expression') {
      dispatchChannelSettings({ type: 'update-math-field', field, value });
      return;
    }

    dispatchChannelSettings({ type: 'update-common-field', field, value });
  };

  const handleChannelSettingsCancel = () => {
    dispatchChannelSettings({ type: 'reset' });
    setChannelSettingsError(null);
    setMathSettingsHelpChannelId(null);
  };

  const handleChannelSettingsSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!channelSettingsDraft) {
      return;
    }
    const submitted = channelSettingsDraft;

    if (submitted.kind === 'device') {
      const nextAlias = submitted.alias.trim();
      setChannelConfigs((prev) => prev.map((entry) => {
        if (!isDeviceChannel(entry) || entry.id !== submitted.id) {
          return entry;
        }
        const next = {
          ...entry,
          alias: nextAlias.length > 0 ? nextAlias : entry.alias,
          color: submitted.color,
        } as DeviceChannelConfig & { precision?: number };
        if (typeof submitted.precision === 'number') {
          next.precision = submitted.precision;
        } else {
          delete next.precision;
        }
        return next;
      }));
      dispatchChannelSettings({ type: 'reset' });
      setChannelSettingsError(null);
      setMathSettingsHelpChannelId(null);
      return;
    }

    if (submitted.kind === 'math') {
      const alias = submitted.alias.trim();
      const unit = submitted.unit.trim();
      const expression = submitted.expression.trim();
      const cleanedInputs = submitted.inputs
        .map((input) => ({ channelId: input.channelId.trim(), variable: input.variable }))
        .filter((input) => input.channelId.length > 0);

      if (!unit) {
        setChannelSettingsError('Provide an output unit for this math channel.');
        return;
      }

      if (!expression) {
        setChannelSettingsError('Provide an expression using the listed variables.');
        return;
      }

      if (cleanedInputs.length === 0) {
        setChannelSettingsError('Map at least one source channel.');
        return;
      }

      const uniqueChannels = new Set(cleanedInputs.map((input) => input.channelId));
      if (uniqueChannels.size !== cleanedInputs.length) {
        setChannelSettingsError('Each variable must map to a unique source channel.');
        return;
      }

      const invalidSelection = cleanedInputs.some((input) => !deviceChannelById.has(input.channelId));
      if (invalidSelection) {
        setChannelSettingsError('One or more selected channels are no longer available.');
        return;
      }

      const placeholderVariables: Record<string, number> = {};
      cleanedInputs.forEach((input, index) => {
        placeholderVariables[input.variable] = index + 1;
      });

      if (evaluateMathExpression(expression, placeholderVariables) === null) {
        setChannelSettingsError('Expression is invalid or references unknown variables.');
        return;
      }

      setChannelConfigs((prev) => prev.map((entry) => {
        if (!isMathChannel(entry) || entry.id !== submitted.id) {
          return entry;
        }
        const next = {
          ...entry,
          alias: alias.length > 0 ? alias : entry.alias,
          color: submitted.color,
          unit,
          expression,
          inputs: cleanedInputs,
        } as MathChannelConfig & { precision?: number };
        if (typeof submitted.precision === 'number') {
          next.precision = submitted.precision;
        } else {
          delete next.precision;
        }
        return next;
      }));
      dispatchChannelSettings({ type: 'reset' });
      setChannelSettingsError(null);
      setMathSettingsHelpChannelId(null);
    }
  };

  useEffect(() => {
    if (!channelSettingsDraft) {
      return;
    }
    const exists = channelConfigs.some((entry) => entry.id === channelSettingsDraft.id);
    if (!exists) {
      dispatchChannelSettings({ type: 'reset' });
    }
  }, [channelConfigs, channelSettingsDraft, dispatchChannelSettings]);

  useEffect(() => {
    if (!channelSettingsDraft) {
      setMathSettingsHelpChannelId(null);
    }
  }, [channelSettingsDraft]);

  const handleRemoveMeasurement = (id: string) => {
    setMeasurementConfigs((prev) => prev.filter((entry) => entry.id !== id));
  };

  const leftPanelOpen = activeLeftPanel !== null;

  const handleDeveloperModeToggle = useCallback(() => {
    setDeveloperModeEnabled((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(DEVELOPER_MODE_STORAGE_KEY, next ? 'true' : 'false');
      }
      return next;
    });
  }, []);

  return (
    <AppShell>
      <EdgeTabRail $position="left">
        <EdgeTabButton
          type="button"
          onClick={() => setActiveLeftPanel((panel) => (panel === 'settings' ? null : 'settings'))}
          $active={activeLeftPanel === 'settings'}
          aria-pressed={activeLeftPanel === 'settings'}
        >
          Settings
        </EdgeTabButton>
        <EdgeTabButton
          type="button"
          onClick={() => setActiveLeftPanel((panel) => (panel === 'about' ? null : 'about'))}
          $active={activeLeftPanel === 'about'}
          aria-pressed={activeLeftPanel === 'about'}
        >
          About
        </EdgeTabButton>
        <EdgeTabButton
          type="button"
          onClick={() => setActiveLeftPanel((panel) => (panel === 'help' ? null : 'help'))}
          $active={activeLeftPanel === 'help'}
          aria-pressed={activeLeftPanel === 'help'}
        >
          Help
        </EdgeTabButton>
      </EdgeTabRail>

      <CentralStage $leftPanelOpen={leftPanelOpen} $rightPanelOpen={measurementsOpen}>
        <StageHeader>
          <StageTitle>Measurement Scope</StageTitle>
          <StageSubtitle>
            Visualise traces, keep the scope pinned in the centre, and manage channels in real time.
          </StageSubtitle>
        </StageHeader>

        <ScopeCanvas>
          <ScopeContent>
            <ScopeHistoryContainer>
              <MeasurementHistory
                history={combinedMeasurementHistory}
                channelStyles={channelStyles}
                onClearHistory={handleClearHistory}
              />
            </ScopeHistoryContainer>
          </ScopeContent>

          <ChannelStrip
            channelReadings={channelReadings}
            channelSettingsDraft={channelSettingsDraft}
            channelSettingsError={channelSettingsError}
            deviceChannelById={deviceChannelById}
            mathSettingsHelpChannelId={mathSettingsHelpChannelId}
            isAddDeviceDisabled={isLoading}
            canAddMathChannel={deviceChannels.length > 0}
            onAddDevice={openChannelWizard}
            onAddMath={openMathChannelWizard}
            onOpenChannelSettings={openChannelSettings}
            onDisconnectChannel={(channel: ChannelConfig) => { void handleDisconnectChannel(channel); }}
            onToggleChannel={handleToggleChannel}
            onToggleMathHelp={toggleMathSettingsHelp}
            onSettingsFieldChange={handleChannelSettingsFieldChange}
            onSettingsCancel={handleChannelSettingsCancel}
            onSettingsSubmit={handleChannelSettingsSubmit}
          />
        </ScopeCanvas>
      </CentralStage>

      <EdgeTabRail $position="right">
        <EdgeTabButton
          type="button"
          onClick={() => setMeasurementsOpen((open) => !open)}
          $active={measurementsOpen}
          aria-pressed={measurementsOpen}
        >
          Measurements
        </EdgeTabButton>
      </EdgeTabRail>

      <SidePanel $position="left" $open={activeLeftPanel === 'settings'}>
        <PanelHeader>
          <PanelTitle>Settings</PanelTitle>
        </PanelHeader>

        <PanelBody>
          <PanelSection>
            <PanelSectionTitle>Preferences</PanelSectionTitle>
            <SettingRow>
              <SettingInfo>
                <SettingLabel>Developer features</SettingLabel>
                <SettingDescription>
                  Expose the mock device and experimental tooling for local development sessions.
                </SettingDescription>
              </SettingInfo>
              <SettingToggle
                type="button"
                $active={developerModeEnabled}
                onClick={handleDeveloperModeToggle}
                aria-pressed={developerModeEnabled}
                aria-label={developerModeEnabled ? 'Disable developer features' : 'Enable developer features'}
              >
                <ToggleThumb $active={developerModeEnabled} />
              </SettingToggle>
            </SettingRow>
          </PanelSection>
        </PanelBody>
      </SidePanel>

      <SidePanel $position="left" $open={activeLeftPanel === 'about'}>
        <PanelHeader>
          <PanelTitle>About</PanelTitle>
        </PanelHeader>

        <PanelBody>
          <PanelSection>
            <PanelSectionTitle>TSMultimeter</PanelSectionTitle>
            <PanelText>
              Desktop companion for TSMultimeter hardware that pairs a Rust backend with a React/Electron UI to stream live
              measurements, log sessions, and craft derived math channels without touching command-line tooling.
            </PanelText>
          </PanelSection>
          <PanelSection>
            <PanelSectionTitle>Core ideas</PanelSectionTitle>
            <PanelList>
              <PanelListItem>Real-time device polling with automatic channel discovery and colour assignment.</PanelListItem>
              <PanelListItem>Mock multimeter pipeline for UI development without hardware.</PanelListItem>
              <PanelListItem>Math traces that reuse the same history pipeline as physical channels.</PanelListItem>
            </PanelList>
          </PanelSection>
          <PanelSection>
            <PanelSectionTitle>Stack</PanelSectionTitle>
            <PanelText>
              Backend: Rust (Warp, serialport) · Frontend: TypeScript, React, styled-components, Recharts · Desktop shell: Electron.
            </PanelText>
          </PanelSection>
        </PanelBody>
      </SidePanel>

      <SidePanel $position="left" $open={activeLeftPanel === 'help'}>
        <PanelHeader>
          <PanelTitle>Help</PanelTitle>
        </PanelHeader>

        <PanelBody>
          <PanelSection>
            <PanelSectionTitle>Quick start</PanelSectionTitle>
            <PanelList>
              <PanelListItem>Connect a device from the channel tray, or enable developer features to access the mock multimeter for UI exploration.</PanelListItem>
              <PanelListItem>Open channel settings to rename traces, tweak colours, and build math expressions.</PanelListItem>
              <PanelListItem>Use the scope toolbar to export snapshots or reset the rolling history.</PanelListItem>
            </PanelList>
          </PanelSection>
          <PanelSection>
            <PanelSectionTitle>Troubleshooting</PanelSectionTitle>
            <PanelList>
              <PanelListItem>Verify the backend service (Cargo) is running before launching the Electron shell.</PanelListItem>
              <PanelListItem>Refresh available ports if hardware is attached after startup.</PanelListItem>
              <PanelListItem>Check the console output for serial permission errors on first-time setups.</PanelListItem>
            </PanelList>
          </PanelSection>
          <PanelSection>
            <PanelSectionTitle>Need more?</PanelSectionTitle>
            <PanelText>
              Review the repository README or the protocol notes under <code>protocols/</code> for device specifics. File issues or
              questions via GitHub to collaborate with the team.
            </PanelText>
          </PanelSection>
        </PanelBody>
      </SidePanel>

      <SidePanel $position="right" $open={measurementsOpen}>
        <PanelHeader>
          <PanelTitle>Measurements</PanelTitle>
          <PanelHeaderActions>
            <ToolbarButton type="button" onClick={openMeasurementWizard} disabled={devices.length === 0}>
              + Add
            </ToolbarButton>
          </PanelHeaderActions>
        </PanelHeader>

        <PanelBody>
          <PanelSection>
            <PanelSectionTitle>Tracked Measurements</PanelSectionTitle>
            {measurementSummaries.length === 0 ? (
              <EmptyNote>Pin scope math here. Add measurements to compute statistics per device.</EmptyNote>
            ) : (
              <MeasurementList>
                {measurementSummaries.map((summary) => (
                  <MeasurementItem key={summary.config.id} $accent={summary.accent}>
                    <MeasurementHeader>
                      <MeasurementName>{summary.channelAlias}</MeasurementName>
                      <MeasurementBadge $accent={summary.accent}>
                        {MEASUREMENT_KIND_LABELS[summary.config.kind]}
                      </MeasurementBadge>
                    </MeasurementHeader>
                    <MeasurementValue $accent={summary.accent}>
                      <span className="value">
                        {summary.value === null ? '---' : formatMeasurementValue(summary.value)}
                      </span>
                      <span className="unit">{summary.unit ?? '—'}</span>
                    </MeasurementValue>
                    <MeasurementActions>
                      <RemoveMeasurementButton
                        type="button"
                        $accent={summary.accent}
                        onClick={() => handleRemoveMeasurement(summary.config.id)}
                      >
                        Remove
                      </RemoveMeasurementButton>
                    </MeasurementActions>
                  </MeasurementItem>
                ))}
              </MeasurementList>
            )}
          </PanelSection>
        </PanelBody>
      </SidePanel>

      {channelWizardOpen && (
        <ModalBackdrop>
          <ModalCard>
            <ChannelWizard
              form={channelForm}
              availablePorts={availablePorts}
              isLinking={isLinkingChannel}
              isBusy={isLoading}
              errorMessage={channelError}
              onSubmit={handleChannelSubmit}
              onClose={closeChannelWizard}
              onRefreshPorts={() => {
                void refreshPorts();
              }}
              onChangeDeviceType={(deviceType) => setChannelForm((prev) => ({
                ...prev,
                deviceType,
              }))}
              onChangePort={(port) => setChannelForm((prev) => ({
                ...prev,
                port,
              }))}
              onChangeAlias={(alias) => setChannelForm((prev) => ({
                ...prev,
                alias,
              }))}
              deviceTypeOptions={deviceTypeOptions}
            />
          </ModalCard>
        </ModalBackdrop>
      )}

      {mathChannelWizardOpen && (
        <ModalBackdrop>
          <ModalCard>
            <MathChannelWizardDialog
              deviceChannels={deviceChannels}
              latestSampleByChannel={latestSampleByChannel}
              mathChannelCount={mathChannels.length}
              onSubmit={handleCreateMathChannel}
              onClose={() => setMathChannelWizardOpen(false)}
            />
          </ModalCard>
        </ModalBackdrop>
      )}

      {measurementWizardOpen && (
        <ModalBackdrop>
          <ModalCard>
            <MeasurementWizard
              devices={devices}
              form={measurementForm}
              onSubmit={handleMeasurementSubmit}
              onClose={closeMeasurementWizard}
              onChangeDevice={(deviceId) => setMeasurementForm((prev) => ({
                ...prev,
                deviceId,
              }))}
              onChangeKind={(kind) => setMeasurementForm((prev) => ({
                ...prev,
                kind,
              }))}
            />
          </ModalCard>
        </ModalBackdrop>
      )}
    </AppShell>
  );
}

export default App;