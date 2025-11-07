import katex from 'katex';

type VariableColorMeta = {
  color: string;
};

export type VariableColorLegendEntry = {
  variable: string;
  color: string;
};

export const MATH_FUNCTION_NAMES = [
  'abs',
  'acos',
  'acosh',
  'asin',
  'asinh',
  'atan',
  'atan2',
  'atanh',
  'cbrt',
  'ceil',
  'clz32',
  'cos',
  'cosh',
  'exp',
  'expm1',
  'floor',
  'fround',
  'hypot',
  'imul',
  'log',
  'log1p',
  'log2',
  'log10',
  'max',
  'min',
  'pow',
  'round',
  'sign',
  'sin',
  'sinh',
  'sqrt',
  'tan',
  'tanh',
  'trunc',
] as const;

export const MATH_CONSTANT_NAMES = [
  'E',
  'LN2',
  'LN10',
  'LOG2E',
  'LOG10E',
  'PI',
  'SQRT1_2',
  'SQRT2',
] as const;

export const MATH_FUNCTION_LABEL = MATH_FUNCTION_NAMES.join(', ');
export const MATH_CONSTANT_LABEL = MATH_CONSTANT_NAMES.join(', ');

export const MATH_VARIABLES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

export const toVariableColorMap = (legend: VariableColorLegendEntry[]) => new Map<string, VariableColorMeta>(
  legend.map((item) => [item.variable, { color: item.color }]),
);

const escapeForKatexText = (value: string): string => value
  .replace(/\\/g, '\\textbackslash{}')
  .replace(/([{}$&#_^%])/g, '\\$1')
  .replace(/\n/g, ' ');

const wrapMonospace = (value: string): string => (
  value.length > 0 ? `\\texttt{${escapeForKatexText(value)}}` : ''
);

const formatExpressionSegment = (segment: string): string => {
  if (segment.length === 0) {
    return '';
  }

  let output = '';
  let buffer = '';

  const flushBuffer = () => {
    if (buffer.length > 0) {
      output += wrapMonospace(buffer);
      buffer = '';
    }
  };

  for (let index = 0; index < segment.length; index += 1) {
    const char = segment[index];
    if (char === '*') {
      if (segment[index + 1] === '*') {
        buffer += '**';
        index += 1;
      } else {
        flushBuffer();
        output += '\\,\\cdot\\,';
      }
      continue;
    }

    buffer += char;
  }

  flushBuffer();
  return output;
};

const toTextWithColoredVariables = (
  expression: string,
  variableColors: Map<string, VariableColorMeta>,
): string => {
  const identifierPattern = /[A-Za-z_]\w*/g;
  let result = '';
  let lastIndex = 0;

  let match = identifierPattern.exec(expression);
  while (match) {
    const [token] = match;
    const start = match.index;
    if (start > lastIndex) {
      const segment = expression.slice(lastIndex, start);
      result += formatExpressionSegment(segment);
    }

    const colorMeta = variableColors.get(token);
    if (colorMeta) {
      const escapedToken = escapeForKatexText(token);
      result += `\\textcolor{${colorMeta.color}}{\\texttt{${escapedToken}}}`;
    } else {
      result += wrapMonospace(token);
    }

    lastIndex = start + token.length;
    match = identifierPattern.exec(expression);
  }

  if (lastIndex < expression.length) {
    const segment = expression.slice(lastIndex);
    result += formatExpressionSegment(segment);
  }

  return result;
};

export const createExpressionPreview = (
  expression: string,
  variableColors: Map<string, VariableColorMeta>,
): { html: string; error: string | null } => {
  const trimmed = expression.trim();
  if (trimmed.length === 0) {
    return { html: '', error: null };
  }

  try {
    const colouredText = toTextWithColoredVariables(trimmed, variableColors);
    const source = colouredText.length > 0 ? colouredText : '\\texttt{ }';
    const html = katex.renderToString(source, { throwOnError: false });
    return { html, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to render formula preview';
    return { html: '', error: message };
  }
};

const ALLOWED_MATH_IDENTIFIERS = new Set<string>([
  'Math',
  ...MATH_FUNCTION_NAMES,
  ...MATH_CONSTANT_NAMES,
]);

export const evaluateMathExpression = (
  expression: string,
  variables: Record<string, number>,
): number | null => {
  if (!expression.trim()) {
    return null;
  }

  const identifiers = expression.match(/\b[A-Za-z_]\w*\b/g) ?? [];
  const allowedVariables = new Set(Object.keys(variables));
  for (const identifier of identifiers) {
    if (allowedVariables.has(identifier)) {
      continue;
    }
    if (!ALLOWED_MATH_IDENTIFIERS.has(identifier)) {
      return null;
    }
  }

  try {
    const variableKeys = Object.keys(variables);
    const destructured = ['Math', ...variableKeys].join(', ');
    const evaluator = new Function(
      'vars',
      `"use strict"; const { ${destructured} } = vars; return (${expression});`,
    ) as (scope: Record<string, unknown>) => number;

    const scope = { Math, ...variables } as Record<string, unknown>;
    const result = evaluator(scope);
    if (typeof result !== 'number' || !Number.isFinite(result)) {
      return null;
    }
    return result;
  } catch {
    return null;
  }
};

export type { VariableColorMeta };
