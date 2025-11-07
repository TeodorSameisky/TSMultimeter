import type { ChannelConfig, ChannelSettingsDraft, DeviceChannelConfig, MathChannelConfig } from '../types/channel.ts';
import { isDeviceChannel, isMathChannel } from '../types/channel.ts';
import { cloneMathInputSelections } from '../utils/mathChannelDefaults.ts';

const createDeviceDraft = (channel: DeviceChannelConfig): ChannelSettingsDraft => ({
  kind: 'device',
  id: channel.id,
  alias: channel.alias,
  color: channel.color,
  ...(typeof channel.precision === 'number' ? { precision: channel.precision } : {}),
});

const createMathDraft = (channel: MathChannelConfig): ChannelSettingsDraft => ({
  kind: 'math',
  id: channel.id,
  alias: channel.alias,
  color: channel.color,
  unit: channel.unit,
  expression: channel.expression,
  inputs: cloneMathInputSelections(channel.inputs),
  ...(typeof channel.precision === 'number' ? { precision: channel.precision } : {}),
});

export type ChannelSettingsAction =
  | { type: 'reset' }
  | { type: 'toggle-open'; channel: ChannelConfig }
  | { type: 'update-common-field'; field: 'alias' | 'color'; value: string }
  | { type: 'update-precision'; precision?: number }
  | { type: 'update-math-field'; field: 'unit' | 'expression'; value: string };

const omitPrecision = (draft: ChannelSettingsDraft): ChannelSettingsDraft => {
  if (typeof draft.precision === 'undefined') {
    return draft;
  }
  if (draft.kind === 'math') {
    const { precision: _drop, ...rest } = draft;
    return rest as ChannelSettingsDraft;
  }
  const { precision: _drop, ...rest } = draft;
  return rest as ChannelSettingsDraft;
};

export const channelSettingsReducer = (
  state: ChannelSettingsDraft | null,
  action: ChannelSettingsAction,
): ChannelSettingsDraft | null => {
  switch (action.type) {
    case 'reset':
      return null;
    case 'toggle-open': {
      const { channel } = action;
      if (state?.id === channel.id) {
        return null;
      }
      if (isDeviceChannel(channel)) {
        return createDeviceDraft(channel);
      }
      if (isMathChannel(channel)) {
        return createMathDraft(channel);
      }
      return state;
    }
    case 'update-common-field': {
      if (!state) {
        return state;
      }
      return {
        ...state,
        [action.field]: action.value,
      } as ChannelSettingsDraft;
    }
    case 'update-precision': {
      if (!state) {
        return state;
      }
      if (typeof action.precision === 'number') {
        if (state.precision === action.precision) {
          return state;
        }
        return {
          ...state,
          precision: action.precision,
        } as ChannelSettingsDraft;
      }
      if (typeof state.precision === 'undefined') {
        return state;
      }
      return omitPrecision(state);
    }
    case 'update-math-field': {
      if (!state || state.kind !== 'math') {
        return state;
      }
      if (state[action.field] === action.value) {
        return state;
      }
      return {
        ...state,
        [action.field]: action.value,
      } as ChannelSettingsDraft;
    }
    default:
      return state;
  }
};
