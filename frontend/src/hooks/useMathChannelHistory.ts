import { useEffect, useState } from 'react';
import type { DeviceChannelConfig, MathChannelConfig } from '../types/channel.ts';
import type { MeasurementSample } from './useDevice.ts';
import { evaluateMathExpression } from '../utils/mathExpressions.ts';

export type MathChannelHistory = Record<string, MeasurementSample[]>;

export const MATH_HISTORY_LIMIT = 5000;

const resolveLatestSamples = (
  deviceChannels: DeviceChannelConfig[],
  measurementHistory: Record<string, MeasurementSample[]>,
) => {
  const latestSamplesByChannel = new Map<string, MeasurementSample | undefined>();
  deviceChannels.forEach((channel) => {
    const samples = measurementHistory[channel.deviceId] ?? [];
    latestSamplesByChannel.set(channel.id, samples[samples.length - 1]);
  });
  return latestSamplesByChannel;
};

export const useMathChannelHistory = (
  deviceChannels: DeviceChannelConfig[],
  mathChannels: MathChannelConfig[],
  measurementHistory: Record<string, MeasurementSample[]>,
): readonly [MathChannelHistory, React.Dispatch<React.SetStateAction<MathChannelHistory>>] => {
  const [mathHistory, setMathHistory] = useState<MathChannelHistory>({});

  useEffect(() => {
    if (mathChannels.length === 0) {
      setMathHistory((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }

    const deviceChannelById = new Map(deviceChannels.map((channel) => [channel.id, channel] as const));
    const latestSamplesByChannel = resolveLatestSamples(deviceChannels, measurementHistory);
    const evaluations = new Map<string, { value: number; timestamp: number }>();

    mathChannels.forEach((channel) => {
      if (channel.inputs.length === 0) {
        return;
      }

      const variables: Record<string, number> = {};
      const timestamps: number[] = [];

      for (const input of channel.inputs) {
        const sourceChannel = deviceChannelById.get(input.channelId);
        if (!sourceChannel) {
          return;
        }
        const sample = latestSamplesByChannel.get(sourceChannel.id);
        if (!sample) {
          return;
        }

        variables[input.variable] = sample.value;
        timestamps.push(sample.timestamp);
      }

      if (Object.keys(variables).length !== channel.inputs.length) {
        return;
      }

      const value = evaluateMathExpression(channel.expression, variables);
      if (value === null) {
        return;
      }

      const timestamp = timestamps.length > 0 ? Math.max(...timestamps) : Date.now();
      evaluations.set(channel.id, { value, timestamp });
    });

    setMathHistory((prev) => {
      const next: MathChannelHistory = {};
      let mutated = mathChannels.length !== Object.keys(prev).length;

      mathChannels.forEach((channel) => {
        const history = prev[channel.id] ?? [];
        const evaluation = evaluations.get(channel.id);

        if (!evaluation) {
          if (history.length > 0) {
            const lastSampleForChannel = history[history.length - 1];
            if (!lastSampleForChannel) {
              next[channel.id] = history;
              return;
            }
            if (
              lastSampleForChannel.deviceLabel !== channel.alias
              || lastSampleForChannel.unit !== channel.unit
            ) {
              const updatedHistory = history.map((sample) => ({
                ...sample,
                deviceLabel: channel.alias,
                unit: channel.unit,
              }));
              next[channel.id] = updatedHistory;
              mutated = true;
              return;
            }
          }
          next[channel.id] = history;
          return;
        }

        const lastSample = history[history.length - 1];
        if (lastSample && lastSample.timestamp === evaluation.timestamp) {
          if (
            lastSample.value !== evaluation.value
            || lastSample.unit !== channel.unit
            || lastSample.deviceLabel !== channel.alias
          ) {
            next[channel.id] = [
              ...history.slice(0, -1),
              {
                ...lastSample,
                value: evaluation.value,
                unit: channel.unit,
                deviceLabel: channel.alias,
              },
            ];
            mutated = true;
          } else {
            next[channel.id] = history;
          }
          return;
        }

        const nextSample: MeasurementSample = {
          deviceId: channel.id,
          deviceType: 'Math',
          deviceLabel: channel.alias,
          value: evaluation.value,
          unit: channel.unit,
          timestamp: evaluation.timestamp,
        };

        const updatedHistory = [...history, nextSample];
        const trimmed = updatedHistory.length > MATH_HISTORY_LIMIT
          ? updatedHistory.slice(updatedHistory.length - MATH_HISTORY_LIMIT)
          : updatedHistory;

        next[channel.id] = trimmed;
        if (trimmed !== history) {
          mutated = true;
        }
      });

      mathChannels.forEach((channel) => {
        if (!next[channel.id]) {
          next[channel.id] = prev[channel.id] ?? [];
        }
      });

      if (!mutated) {
        for (const channel of mathChannels) {
          if (next[channel.id] !== prev[channel.id]) {
            mutated = true;
            break;
          }
        }
      }

      if (!mutated) {
        return prev;
      }

      return next;
    });
  }, [deviceChannels, mathChannels, measurementHistory]);

  return [mathHistory, setMathHistory] as const;
};
