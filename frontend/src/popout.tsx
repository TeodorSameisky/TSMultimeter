import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import styled from 'styled-components';
import { evaluateMathExpression } from './utils/mathExpressions';
import { getDeviceMeasurement } from './api/deviceClient';
import { formatMeasurementDisplay } from './utils/formatNumber';
import type { PopoutInputDescriptor } from './types/popout';

const POLL_INTERVAL_MS = 750;

const Frame = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f1014;
  padding: 1.25rem;
  box-sizing: border-box;
  cursor: move;
  -webkit-app-region: drag;
  user-select: none;
`;

const Card = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 14px;
  background: rgba(15, 16, 24, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.55);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 1.4rem;
  box-sizing: border-box;
  pointer-events: auto;
  -webkit-app-region: drag;
`;

const Alias = styled.div`
  font-size: 0.85rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.75);
  text-align: center;
`;

const ValueText = styled.div<{ accent: string }>`
  font-size: 3.2rem;
  line-height: 1;
  font-weight: 700;
  color: ${({ accent }) => accent};
  text-align: center;
`;

const UnitText = styled.div`
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.82);
  text-align: center;
`;

const StatusText = styled.div`
  min-height: 1rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
`;

type RuntimeConfig = {
  channelId: string;
  channelName: string;
  channelType: 'device' | 'math';
  color: string;
  precision?: number;
  unit?: string;
  deviceId?: string;
  expression?: string;
  inputs: PopoutInputDescriptor[];
};

const parsePrecision = (raw: string | null): number | undefined => {
  if (!raw) {
    return undefined;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return parsed;
};

const parseInputs = (raw: string | null): PopoutInputDescriptor[] => {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as PopoutInputDescriptor[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((entry): entry is PopoutInputDescriptor => (
        entry !== null
        && typeof entry === 'object'
        && typeof entry.channelId === 'string'
        && typeof entry.variable === 'string'
      ))
      .map((entry) => ({ channelId: entry.channelId, variable: entry.variable }));
  } catch {
    return [];
  }
};

const useRuntimeConfig = (): RuntimeConfig => useMemo(() => {
  const params = new URLSearchParams(window.location.search);

  const channelId = params.get('channelId') ?? '';
  const resolvedName = params.get('channelName');
  const channelName = (resolvedName ?? channelId) || 'Channel';
  const channelType = params.get('channelType') === 'math' ? 'math' : 'device';
  const color = params.get('color') ?? '#4fb5ff';
  const precision = parsePrecision(params.get('precision'));
  const unit = params.get('unit') ?? undefined;
  const deviceId = params.get('deviceId') ?? undefined;
  const expression = params.get('expression') ?? undefined;
  const inputs = parseInputs(params.get('inputs'));

  const descriptor: RuntimeConfig = {
    channelId,
    channelName,
    channelType,
    color,
    inputs,
  };

  if (precision !== undefined) {
    descriptor.precision = precision;
  }
  if (unit) {
    descriptor.unit = unit;
  }
  if (deviceId) {
    descriptor.deviceId = deviceId;
  }
  if (expression) {
    descriptor.expression = expression;
  }

  return descriptor;
}, []);

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const Popout: React.FC = () => {
  const config = useRuntimeConfig();
  const [valueText, setValueText] = useState('—');
  const [unitText, setUnitText] = useState(config.unit ?? '');
  const [status, setStatus] = useState<string | null>('Connecting…');

  useEffect(() => {
    let cancelled = false;

    const pollDeviceChannel = async (deviceId: string) => {
      const measurement = await getDeviceMeasurement(deviceId);
      const resolvedValue = toFiniteNumber(measurement?.value);

      if (resolvedValue === null) {
        setValueText('—');
        setUnitText(config.unit ?? measurement?.unit ?? '');
        setStatus('Waiting for reading…');
        return;
      }

      const resolvedUnit = config.unit ?? measurement?.unit ?? '';
      const formatted = formatMeasurementDisplay(resolvedValue, resolvedUnit, config.precision);
      setValueText(formatted.valueText);
      setUnitText(formatted.unitText || resolvedUnit);
      setStatus(null);
    };

    const pollMathChannel = async () => {
      if (!config.expression || config.inputs.length === 0) {
        setValueText('—');
        setUnitText(config.unit ?? '');
        setStatus('Awaiting channel inputs…');
        return;
      }

      const inputMeasurements = await Promise.all(config.inputs.map(async (input) => {
        try {
          const measurement = await getDeviceMeasurement(input.channelId);
          return {
            variable: input.variable,
            value: toFiniteNumber(measurement?.value),
          };
        } catch {
          return { variable: input.variable, value: null };
        }
      }));

      const variableMap: Record<string, number> = {};
      inputMeasurements.forEach(({ variable, value }) => {
        if (typeof value === 'number') {
          variableMap[variable] = value;
        }
      });

      if (Object.keys(variableMap).length === 0) {
        setValueText('—');
        setUnitText(config.unit ?? '');
        setStatus('Waiting for source readings…');
        return;
      }

      const result = evaluateMathExpression(config.expression, variableMap);
      if (result === null || !Number.isFinite(result)) {
        setValueText('—');
        setUnitText(config.unit ?? '');
        setStatus('Expression not ready');
        return;
      }

      const formatted = formatMeasurementDisplay(result, config.unit, config.precision);
      setValueText(formatted.valueText);
      setUnitText(formatted.unitText || config.unit || '');
      setStatus(null);
    };

    const poll = async () => {
      try {
        if (config.channelType === 'device') {
          const deviceId = config.deviceId ?? config.channelId;
          if (!deviceId) {
            setValueText('—');
            setUnitText(config.unit ?? '');
            setStatus('No device id provided');
            return;
          }
          await pollDeviceChannel(deviceId);
        } else {
          await pollMathChannel();
        }
      } catch {
        setValueText('—');
        setUnitText(config.unit ?? '');
        setStatus('Unable to reach backend');
      }
    };

    void poll();
    const handle = window.setInterval(() => {
      if (!cancelled) {
        void poll();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [config]);

  return (
    <Frame>
      <Card>
        <Alias>{config.channelName}</Alias>
        <ValueText accent={config.color}>{valueText}</ValueText>
        {unitText ? <UnitText>{unitText}</UnitText> : null}
        <StatusText>{status ?? ''}</StatusText>
      </Card>
    </Frame>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popout />);
}
