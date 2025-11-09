const formatRawValue = (value: number, precision?: number): string => {
  if (!Number.isFinite(value)) {
    return '---';
  }

  if (typeof precision === 'number' && Number.isFinite(precision)) {
    const normalized = Math.max(0, Math.min(10, Math.round(precision)));
    return value.toFixed(normalized);
  }

  const abs = Math.abs(value);
  if (abs === 0) {
    return '0';
  }
  if (abs >= 1000) {
    return value.toFixed(1);
  }
  if (abs >= 1) {
    return value.toFixed(3);
  }
  return value.toExponential(3);
};

export const formatMeasurementValue = (value: number, precision?: number): string => formatRawValue(value, precision);

type UnitCategory = 'voltage' | 'current' | 'resistance' | 'frequency' | 'capacitance' | 'conductance';

type UnitScalingMeta = {
  category: UnitCategory;
  descriptor?: string;
};

const UNIT_SCALING_META: Record<string, UnitScalingMeta> = {
  V: { category: 'voltage' },
  VDC: { category: 'voltage', descriptor: 'DC' },
  VAC: { category: 'voltage', descriptor: 'AC' },
  'VAC+DC': { category: 'voltage', descriptor: 'AC+DC' },
  A: { category: 'current' },
  ADC: { category: 'current', descriptor: 'DC' },
  AAC: { category: 'current', descriptor: 'AC' },
  'AAC+DC': { category: 'current', descriptor: 'AC+DC' },
  Ω: { category: 'resistance' },
  Hz: { category: 'frequency' },
  F: { category: 'capacitance' },
  S: { category: 'conductance' },
};

type ScalingStep = {
  threshold: number;
  unit: string;
  multiplier: number;
};

const createStep = (threshold: number, unit: string, multiplier: number): ScalingStep => ({ threshold, unit, multiplier });

const UNIT_SCALING_TABLES: Record<UnitCategory, ScalingStep[]> = {
  voltage: [
    createStep(1e9, 'GV', 1e-9),
    createStep(1e6, 'MV', 1e-6),
    createStep(1e3, 'kV', 1e-3),
    createStep(1, 'V', 1),
    createStep(1e-3, 'mV', 1e3),
    createStep(1e-6, 'µV', 1e6),
    createStep(1e-9, 'nV', 1e9),
  ],
  current: [
    createStep(1e6, 'MA', 1e-6),
    createStep(1e3, 'kA', 1e-3),
    createStep(1, 'A', 1),
    createStep(1e-3, 'mA', 1e3),
    createStep(1e-6, 'µA', 1e6),
    createStep(1e-9, 'nA', 1e9),
  ],
  resistance: [
    createStep(1e6, 'MΩ', 1e-6),
    createStep(1e3, 'kΩ', 1e-3),
    createStep(1, 'Ω', 1),
    createStep(1e-3, 'mΩ', 1e3),
    createStep(1e-6, 'µΩ', 1e6),
  ],
  frequency: [
    createStep(1e9, 'GHz', 1e-9),
    createStep(1e6, 'MHz', 1e-6),
    createStep(1e3, 'kHz', 1e-3),
    createStep(1, 'Hz', 1),
    createStep(1e-3, 'mHz', 1e3),
    createStep(1e-6, 'µHz', 1e6),
  ],
  capacitance: [
    createStep(1, 'F', 1),
    createStep(1e-3, 'mF', 1e3),
    createStep(1e-6, 'µF', 1e6),
    createStep(1e-9, 'nF', 1e9),
    createStep(1e-12, 'pF', 1e12),
  ],
  conductance: [
    createStep(1, 'S', 1),
    createStep(1e-3, 'mS', 1e3),
    createStep(1e-6, 'µS', 1e6),
    createStep(1e-9, 'nS', 1e9),
  ],
};

type ScaledMeasurement = {
  value: number;
  unit: string;
};

const combineUnit = (unit: string, descriptor?: string): string => (descriptor ? `${unit} ${descriptor}` : unit);

const scaleMeasurement = (value: number, unit: string): ScaledMeasurement => {
  if (!Number.isFinite(value) || value === 0) {
    return { value, unit };
  }

  const metadata = UNIT_SCALING_META[unit];
  if (!metadata) {
    return { value, unit };
  }

  const steps = UNIT_SCALING_TABLES[metadata.category];
  if (!steps || steps.length === 0) {
    return {
      value,
      unit: combineUnit(unit, metadata.descriptor),
    };
  }
  const abs = Math.abs(value);

  for (const step of steps) {
    if (abs >= step.threshold) {
      return {
        value: value * step.multiplier,
        unit: combineUnit(step.unit, metadata.descriptor),
      };
    }
  }

  const smallestStep = steps[steps.length - 1];
  if (!smallestStep) {
    return {
      value,
      unit: combineUnit(unit, metadata.descriptor),
    };
  }
  return {
    value: value * smallestStep.multiplier,
    unit: combineUnit(smallestStep.unit, metadata.descriptor),
  };
};

export const formatMeasurementDisplay = (
  value: number,
  unit: string | undefined,
  precision?: number,
): { valueText: string; unitText: string; combined: string } => {
  if (!unit) {
    const valueText = formatRawValue(value, precision);
    return {
      valueText,
      unitText: '',
      combined: valueText,
    };
  }

  const scaled = scaleMeasurement(value, unit);
  const valueText = formatRawValue(scaled.value, precision);
  const unitText = scaled.unit;
  const combined = unitText ? `${valueText} ${unitText}` : valueText;
  return { valueText, unitText, combined };
};
