import type { DeviceTypeOptionValue } from './devices.ts';

export type ChannelBaseConfig = {
  id: string;
  alias: string;
  color: string;
  enabled: boolean;
  unit?: string;
  precision?: number;
};

export type DeviceChannelConfig = ChannelBaseConfig & {
  type: 'device';
  deviceId: string;
};

export type MathChannelInput = {
  channelId: string;
  variable: string;
};

export type MathChannelFormInputState = MathChannelInput & {
  key: string;
};

export type MathChannelConfig = ChannelBaseConfig & {
  type: 'math';
  expression: string;
  inputs: MathChannelInput[];
  unit: string;
};

export type ChannelConfig = DeviceChannelConfig | MathChannelConfig;

export type ChannelSettingsDraft =
  | {
      kind: 'device';
      id: string;
      alias: string;
      color: string;
      precision?: number;
    }
  | {
      kind: 'math';
      id: string;
      alias: string;
      color: string;
      unit: string;
      expression: string;
      inputs: MathChannelInput[];
      precision?: number;
    };

export type ChannelWizardFormState = {
  deviceType: DeviceTypeOptionValue;
  port: string;
  alias: string;
};

export type MathChannelFormState = {
  alias: string;
  unit: string;
  expression: string;
  inputs: MathChannelFormInputState[];
};

export type MathVariableLegendItem = {
  variable: string;
  alias: string;
  color: string;
};

export type MathChannelSubmission = {
  alias: string;
  unit: string;
  expression: string;
  inputs: MathChannelInput[];
};

export const isDeviceChannel = (
  channel: ChannelConfig,
): channel is DeviceChannelConfig => channel.type === 'device';

export const isMathChannel = (
  channel: ChannelConfig,
): channel is MathChannelConfig => channel.type === 'math';
