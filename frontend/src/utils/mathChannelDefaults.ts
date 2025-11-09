import type { DeviceChannelConfig, MathChannelFormInputState, MathChannelFormState, MathChannelInput } from '../types/channel.ts';
import type { MeasurementSample } from '../types/deviceData.ts';
import { MATH_VARIABLES } from './mathExpressions.ts';
import { createId } from './createId.ts';

export const DEFAULT_MATH_ALIAS_PREFIX = 'Math';

export const buildDefaultMathAlias = (existingCount: number, prefix: string = DEFAULT_MATH_ALIAS_PREFIX): string =>
  `${prefix} ${existingCount + 1}`;

export const createInitialMathInputs = (deviceChannels: DeviceChannelConfig[]): MathChannelFormInputState[] => {
  const variables = Array.from(MATH_VARIABLES);
  const selectableChannels = deviceChannels.slice(0, variables.length);

  return selectableChannels.map((channel, index) => ({
    key: createId(),
    channelId: channel.id,
    variable: variables[index] ?? 'a',
  }));
};

export const buildDefaultMathExpression = (inputs: Array<{ variable: string }>): string => {
  if (inputs.length >= 2) {
    return `${inputs[0]?.variable ?? 'a'} + ${inputs[1]?.variable ?? 'b'}`;
  }
  if (inputs.length === 1) {
    return inputs[0]?.variable ?? 'a';
  }
  return '';
};

export type MathInputSelection = MathChannelInput;

const hasAvailableMathVariable = (inputs: MathInputSelection[]) =>
  MATH_VARIABLES.some((variable) => !inputs.some((input) => input.variable === variable));

export const canAddMathInput = <T extends MathInputSelection>(
  inputs: T[],
  deviceChannels: DeviceChannelConfig[],
) => {
  if (inputs.length >= MATH_VARIABLES.length) {
    return false;
  }
  if (!hasAvailableMathVariable(inputs)) {
    return false;
  }
  if (inputs.length >= deviceChannels.length) {
    return false;
  }
  const selectedIds = new Set(inputs.map((input) => input.channelId).filter((id) => id.length > 0));
  return deviceChannels.some((channel) => !selectedIds.has(channel.id)) || selectedIds.size < deviceChannels.length;
};

const selectNextMathVariable = (inputs: MathInputSelection[]): string | null =>
  MATH_VARIABLES.find((variable) => !inputs.some((input) => input.variable === variable)) ?? null;

const findFallbackChannel = (
  inputs: MathInputSelection[],
  deviceChannels: DeviceChannelConfig[],
): DeviceChannelConfig | undefined => {
  const selectedIds = new Set(inputs.map((input) => input.channelId).filter((id) => id.length > 0));
  return deviceChannels.find((channel) => !selectedIds.has(channel.id));
};

const createNextMathInputSelection = (
  inputs: MathInputSelection[],
  deviceChannels: DeviceChannelConfig[],
): MathInputSelection | null => {
  if (!canAddMathInput(inputs, deviceChannels)) {
    return null;
  }
  const variable = selectNextMathVariable(inputs);
  if (!variable) {
    return null;
  }
  const fallbackChannel = findFallbackChannel(inputs, deviceChannels);
  return {
    channelId: fallbackChannel?.id ?? '',
    variable,
  } satisfies MathInputSelection;
};

export const createNextMathFormInput = (
  inputs: MathChannelFormInputState[],
  deviceChannels: DeviceChannelConfig[],
): MathChannelFormInputState | null => {
  const nextSelection = createNextMathInputSelection(inputs, deviceChannels);
  if (!nextSelection) {
    return null;
  }
  return {
    key: createId(),
    ...nextSelection,
  } satisfies MathChannelFormInputState;
};

export const createNextMathConfigInput = (
  inputs: MathInputSelection[],
  deviceChannels: DeviceChannelConfig[],
): MathChannelInput | null => createNextMathInputSelection(inputs, deviceChannels);

export const cloneMathInputSelections = (inputs: MathInputSelection[]): MathInputSelection[] =>
  inputs.map((input) => ({ ...input }));

export const resolveDefaultMathUnit = (
  inputs: MathChannelFormInputState[],
  deviceChannels: ReadonlyMap<string, DeviceChannelConfig>,
  latestSampleByChannel: Record<string, MeasurementSample | undefined>,
): string => {
  if (inputs.length === 0) {
    return '';
  }
  const [firstInput] = inputs;
  if (!firstInput) {
    return '';
  }
  const source = deviceChannels.get(firstInput.channelId);
  if (!source) {
    return '';
  }
  const sample = latestSampleByChannel[source.deviceId] ?? latestSampleByChannel[source.id];
  return sample?.unit ?? '';
};

export const createInitialMathFormState = (
  deviceChannels: DeviceChannelConfig[],
  latestSampleByChannel: Record<string, MeasurementSample | undefined>,
  mathChannelCount: number,
): MathChannelFormState => {
  const inputs = createInitialMathInputs(deviceChannels);
  const alias = buildDefaultMathAlias(mathChannelCount);
  const expression = buildDefaultMathExpression(inputs);
  const deviceChannelMap = new Map(deviceChannels.map((channel) => [channel.id, channel] as const));
  const unit = resolveDefaultMathUnit(inputs, deviceChannelMap, latestSampleByChannel);

  return {
    alias,
    unit,
    expression,
    inputs,
  } satisfies MathChannelFormState;
};
