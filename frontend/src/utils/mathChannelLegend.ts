import type {
  DeviceChannelConfig,
  MathChannelInput,
  MathVariableLegendItem,
} from '../types/channel.ts';

export const buildMathVariableLegend = (
  inputs: MathChannelInput[],
  deviceChannels: ReadonlyMap<string, DeviceChannelConfig>,
): MathVariableLegendItem[] => inputs
  .map((input) => {
    const channel = deviceChannels.get(input.channelId);
    if (!channel) {
      return null;
    }
    return {
      variable: input.variable,
      alias: channel.alias,
      color: channel.color,
    } satisfies MathVariableLegendItem;
  })
  .filter((item): item is MathVariableLegendItem => item !== null)
  .sort((a, b) => a.variable.localeCompare(b.variable));
