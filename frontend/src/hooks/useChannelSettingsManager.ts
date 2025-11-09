import { useCallback, useEffect, useReducer, useState } from 'react';
import type { FormEvent } from 'react';
import type {
  ChannelConfig,
  ChannelSettingsDraft,
  DeviceChannelConfig,
  MathChannelConfig,
} from '../types/channel.ts';
import { isDeviceChannel, isMathChannel } from '../types/channel.ts';
import { channelSettingsReducer } from '../state/channelSettingsReducer.ts';
import { evaluateMathExpression } from '../utils/mathExpressions.ts';

export type ChannelSettingsField = 'alias' | 'color' | 'unit' | 'expression' | 'precision';

export type ChannelSettingsManagerInput = {
  channelConfigs: ChannelConfig[];
  setChannelConfigs: React.Dispatch<React.SetStateAction<ChannelConfig[]>>;
  deviceChannelById: Map<string, DeviceChannelConfig>;
};

export type ChannelSettingsManagerResult = {
  draft: ChannelSettingsDraft | null;
  error: string | null;
  mathHelpChannelId: string | null;
  openSettings: (channel: ChannelConfig) => void;
  toggleMathHelp: (channelId: string) => void;
  updateField: (field: ChannelSettingsField, value: string) => void;
  updatePopout: (enabled: boolean) => void;
  cancel: () => void;
  submit: (event: FormEvent<HTMLFormElement>) => void;
};

export const useChannelSettingsManager = (
  input: ChannelSettingsManagerInput,
): ChannelSettingsManagerResult => {
  const { channelConfigs, setChannelConfigs, deviceChannelById } = input;
  const [draft, dispatch] = useReducer(channelSettingsReducer, null as ChannelSettingsDraft | null);
  const [error, setError] = useState<string | null>(null);
  const [mathHelpChannelId, setMathHelpChannelId] = useState<string | null>(null);

  const openSettings = useCallback((channel: ChannelConfig) => {
    setError(null);
    setMathHelpChannelId(null);
    dispatch({ type: 'toggle-open', channel });
  }, []);

  const toggleMathHelp = useCallback((channelId: string) => {
    setMathHelpChannelId((current) => (current === channelId ? null : channelId));
  }, []);

  const cancel = useCallback(() => {
    dispatch({ type: 'reset' });
    setError(null);
    setMathHelpChannelId(null);
  }, []);

  const updateField = useCallback((field: ChannelSettingsField, value: string) => {
    setError(null);
    if (field === 'precision') {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        dispatch({ type: 'update-precision' });
        return;
      }
      const parsed = Number(trimmed);
      if (Number.isNaN(parsed)) {
        return;
      }
      dispatch({ type: 'update-precision', precision: parsed });
      return;
    }

    if (field === 'unit' || field === 'expression') {
      dispatch({ type: 'update-math-field', field, value });
      return;
    }

    dispatch({ type: 'update-common-field', field, value });
  }, []);

  const updatePopout = useCallback((enabled: boolean) => {
    dispatch({ type: 'update-popout', enabled });
  }, []);

  const submit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft) {
      return;
    }

    if (draft.kind === 'device') {
      const nextAlias = draft.alias.trim();

      setChannelConfigs((prev) => prev.map((entry) => {
        if (!isDeviceChannel(entry) || entry.id !== draft.id) {
          return entry;
        }
        const next = {
          ...entry,
          alias: nextAlias.length > 0 ? nextAlias : entry.alias,
          color: draft.color,
        } as DeviceChannelConfig & { precision?: number; popoutEnabled?: boolean };
        if (typeof draft.precision === 'number') {
          next.precision = draft.precision;
        } else {
          delete next.precision;
        }
        if (draft.popoutEnabled) {
          next.popoutEnabled = draft.popoutEnabled;
        } else {
          delete next.popoutEnabled;
        }
        return next;
      }));

      cancel();
      return;
    }

    if (draft.kind === 'math') {
      const alias = draft.alias.trim();
      const unit = draft.unit.trim();
      const expression = draft.expression.trim();
      const cleanedInputs = draft.inputs
        .map((input) => ({ channelId: input.channelId.trim(), variable: input.variable }))
        .filter((input) => input.channelId.length > 0);

      if (!unit) {
        setError('Provide an output unit for this math channel.');
        return;
      }

      if (!expression) {
        setError('Provide an expression using the listed variables.');
        return;
      }

      if (cleanedInputs.length === 0) {
        setError('Map at least one source channel.');
        return;
      }

      const uniqueChannels = new Set(cleanedInputs.map((input) => input.channelId));
      if (uniqueChannels.size !== cleanedInputs.length) {
        setError('Each variable must map to a unique source channel.');
        return;
      }

      const invalidSelection = cleanedInputs.some((input) => !deviceChannelById.has(input.channelId));
      if (invalidSelection) {
        setError('One or more selected channels are no longer available.');
        return;
      }

      const placeholderVariables: Record<string, number> = {};
      cleanedInputs.forEach((input, index) => {
        placeholderVariables[input.variable] = index + 1;
      });

      if (evaluateMathExpression(expression, placeholderVariables) === null) {
        setError('Expression is invalid or references unknown variables.');
        return;
      }

      setChannelConfigs((prev) => prev.map((entry) => {
        if (!isMathChannel(entry) || entry.id !== draft.id) {
          return entry;
        }
        const next = {
          ...entry,
          alias: alias.length > 0 ? alias : entry.alias,
          color: draft.color,
          unit,
          expression,
          inputs: cleanedInputs,
        } as MathChannelConfig & { precision?: number; popoutEnabled?: boolean };
        if (typeof draft.precision === 'number') {
          next.precision = draft.precision;
        } else {
          delete next.precision;
        }
        if (draft.popoutEnabled) {
          next.popoutEnabled = draft.popoutEnabled;
        } else {
          delete next.popoutEnabled;
        }
        return next;
      }));

      cancel();
    }
  }, [cancel, deviceChannelById, draft, setChannelConfigs]);

  useEffect(() => {
    if (!draft) {
      return;
    }
    const exists = channelConfigs.some((channel) => channel.id === draft.id);
    if (!exists) {
      dispatch({ type: 'reset' });
      setError(null);
      setMathHelpChannelId(null);
    }
  }, [channelConfigs, draft]);

  useEffect(() => {
    if (!draft) {
      setMathHelpChannelId(null);
    }
  }, [draft]);

  return {
    draft,
    error,
    mathHelpChannelId,
    openSettings,
    toggleMathHelp,
    updateField,
    updatePopout,
    cancel,
    submit,
  };
};
