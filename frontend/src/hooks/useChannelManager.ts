import { useEffect, useMemo, useState } from 'react';
import type { DeviceInfo } from '../types/deviceData.ts';
import type {
  ChannelConfig,
  DeviceChannelConfig,
  MathChannelConfig,
} from '../types/channel.ts';
import { isDeviceChannel, isMathChannel } from '../types/channel.ts';
import { pickChannelColor } from '../utils/channelColors.ts';

export type ChannelStyles = Record<string, {
  alias: string;
  color: string;
  enabled: boolean;
  precision?: number;
}>;

export type ChannelManagerResult = {
  channelConfigs: ChannelConfig[];
  setChannelConfigs: React.Dispatch<React.SetStateAction<ChannelConfig[]>>;
  deviceChannels: DeviceChannelConfig[];
  mathChannels: MathChannelConfig[];
  channelStyles: ChannelStyles;
  deviceChannelById: Map<string, DeviceChannelConfig>;
};

/**
 * Centralises channel state management so the App component can focus on
 * orchestration rather than repeatedly deriving device and math channel lists.
 * The hook mirrors the previous behaviour of keeping device channels aligned
 * with the currently connected hardware while preserving existing metadata such
 * as colours, aliases, and precision overrides.
 */
export const useChannelManager = (devices: DeviceInfo[]): ChannelManagerResult => {
  const [channelConfigs, setChannelConfigs] = useState<ChannelConfig[]>([]);

  const deviceChannels = useMemo(
    () => channelConfigs.filter(isDeviceChannel),
    [channelConfigs],
  );

  const mathChannels = useMemo(
    () => channelConfigs.filter(isMathChannel),
    [channelConfigs],
  );

  useEffect(() => {
    setChannelConfigs((prev) => {
      const connectedDevices = devices.filter((device) => device.connected);
      const prevDeviceChannels = prev.filter(isDeviceChannel);
      const prevMathChannels = prev.filter(isMathChannel);

      if (connectedDevices.length === 0) {
        return prevMathChannels;
      }

      const usedColors = new Set(prevMathChannels.map((entry) => entry.color));
      const prevByDevice = new Map(prevDeviceChannels.map((entry) => [entry.deviceId, entry]));
      let mutated = prevDeviceChannels.length !== connectedDevices.length;

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
        const precision = typeof existing?.precision === 'number' ? existing.precision : undefined;

        if (
          existing
          && existing.alias === alias
          && existing.color === color
          && existing.enabled === enabled
          && existing.id === id
          && existing.unit === unit
          && existing.precision === precision
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
          ...(typeof precision === 'number' ? { precision } : {}),
        } satisfies DeviceChannelConfig;
      });

      if (!mutated && prevMathChannels.length === prev.length - prevDeviceChannels.length) {
        const sameOrder = nextDeviceChannels.every((channel, index) => channel === prevDeviceChannels[index]);
        if (sameOrder) {
          return prev;
        }
      }

      return [...nextDeviceChannels, ...prevMathChannels];
    });
  }, [devices]);

  const channelStyles = useMemo<ChannelStyles>(
    () => channelConfigs.reduce<ChannelStyles>((acc, channel) => {
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

  const deviceChannelById = useMemo(
    () => new Map(deviceChannels.map((channel) => [channel.id, channel])),
    [deviceChannels],
  );

  return {
    channelConfigs,
    setChannelConfigs,
    deviceChannels,
    mathChannels,
    channelStyles,
    deviceChannelById,
  } satisfies ChannelManagerResult;
};
