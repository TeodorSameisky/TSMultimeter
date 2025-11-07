export const formatMeasurementValue = (value: number, precision?: number): string => {
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
