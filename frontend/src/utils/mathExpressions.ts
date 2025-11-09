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

const normalizeExponentOperator = (expression: string): string => expression.replace(/\^/g, '**');

const convertDoubleStarToCaret = (expression: string): string => expression.replace(/\*\*/g, '^');

const attachMathNamespace = (expression: string): string => {
  const functionPattern = new RegExp(`(^|[^\\w.])(${MATH_FUNCTION_NAMES.join('|')})\\s*(?=\\()`, 'g');
  const constantPattern = new RegExp(`(^|[^\\w.])(${MATH_CONSTANT_NAMES.join('|')})(?![\\w.])`, 'g');

  const withFunctions = expression.replace(functionPattern, (_match, prefix: string, fnName: string) => {
    return `${prefix ?? ''}Math.${fnName}`;
  });

  return withFunctions.replace(constantPattern, (_match, prefix: string, constantName: string) => {
    return `${prefix ?? ''}Math.${constantName}`;
  });
};

type BinaryOperator = '+' | '-' | '*' | '/' | '^';

type ExpressionToken =
  | { type: 'number'; value: string }
  | { type: 'variable'; value: string }
  | { type: 'operator'; value: BinaryOperator }
  | { type: 'paren'; value: '(' | ')' }
  | { type: 'comma' }
  | { type: 'function'; value: string }
  | { type: 'constant'; value: string };

type ExpressionNode =
  | { type: 'number'; value: string }
  | { type: 'variable'; value: string }
  | { type: 'constant'; value: string }
  | { type: 'unary'; operator: '+' | '-'; argument: ExpressionNode }
  | { type: 'binary'; operator: BinaryOperator; left: ExpressionNode; right: ExpressionNode }
  | { type: 'function'; name: string; args: ExpressionNode[] };

const BINARY_PRECEDENCE: Record<BinaryOperator, number> = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
  '^': 3,
};

const CONSTANT_LATEX_MAP: Record<string, string> = {
  PI: '\\pi',
  E: '\\mathrm{e}',
  LN2: '\\ln 2',
  LN10: '\\ln 10',
  LOG2E: '\\log_{2}\\mathrm{e}',
  LOG10E: '\\log_{10}\\mathrm{e}',
  SQRT2: '\\sqrt{2}',
  SQRT1_2: '\\frac{1}{\\sqrt{2}}',
};

const SIMPLE_FUNCTION_LATEX_MAP: Record<string, string> = {
  sin: '\\sin',
  cos: '\\cos',
  tan: '\\tan',
  asin: '\\arcsin',
  acos: '\\arccos',
  atan: '\\arctan',
  sinh: '\\sinh',
  cosh: '\\cosh',
  tanh: '\\tanh',
  asinh: '\\operatorname{arsinh}',
  acosh: '\\operatorname{arcosh}',
  atanh: '\\operatorname{artanh}',
  exp: '\\exp',
  log: '\\ln',
  log10: '\\log_{10}',
  log2: '\\log_{2}',
  log1p: '\\operatorname{log1p}',
  floor: '\\lfloor',
  ceil: '\\lceil',
  round: '\\operatorname{round}',
  trunc: '\\operatorname{trunc}',
  sign: '\\operatorname{sign}',
  sqrt: '\\sqrt',
  cbrt: '\\sqrt[3]',
  abs: '\\operatorname{abs}',
  hypot: '\\operatorname{hypot}',
  max: '\\max',
  min: '\\min',
  fround: '\\operatorname{fround}',
  imul: '\\operatorname{imul}',
  clz32: '\\operatorname{clz32}',
  atan2: '\\operatorname{atan2}',
  pow: '\\operatorname{pow}',
  expm1: '\\operatorname{expm1}',
};

const FUNCTION_NAMES_USING_PARENTHESES = new Set<string>([
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'sinh',
  'cosh',
  'tanh',
  'asinh',
  'acosh',
  'atanh',
  'exp',
  'log',
  'log10',
  'log2',
  'log1p',
  'floor',
  'ceil',
  'round',
  'trunc',
  'sign',
  'abs',
  'hypot',
  'max',
  'min',
  'fround',
  'imul',
  'clz32',
  'atan2',
  'pow',
  'expm1',
]);

const escapeIdentifierForLatex = (value: string): string => value.length > 0
  ? value
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/([{}$&#_^%])/g, '\\$1')
  : '';

const formatVariableLatex = (variable: string, variableColors: Map<string, VariableColorMeta>): string => {
  const color = variableColors.get(variable)?.color;
  const base = `\\texttt{${escapeIdentifierForLatex(variable)}}`;
  if (!color) {
    return base;
  }
  return `\\textcolor{${color}}{${base}}`;
};

const formatConstantLatex = (constant: string): string => {
  const mapped = CONSTANT_LATEX_MAP[constant];
  if (mapped) {
    return mapped;
  }
  return `\\mathrm{${escapeIdentifierForLatex(constant)}}`;
};

const tokenizeExpressionForLatex = (expression: string): ExpressionToken[] => {
  const tokens: ExpressionToken[] = [];
  const length = expression.length;
  let index = 0;

  const isIdentifierStart = (char: string) => /[A-Za-z_]/.test(char);
  const isIdentifierPart = (char: string) => /[A-Za-z0-9_]/.test(char);

  while (index < length) {
    const char = expression[index] ?? '';

    if (char === ' ' || char === '\n' || char === '\t' || char === '\r') {
      index += 1;
      continue;
    }

    if (char === '*' && (expression[index + 1] ?? '') === '*') {
      tokens.push({ type: 'operator', value: '^' });
      index += 2;
      continue;
    }

    if ('+-/^'.includes(char)) {
      tokens.push({ type: 'operator', value: char as BinaryOperator });
      index += 1;
      continue;
    }

    if (char === '*') {
      tokens.push({ type: 'operator', value: '*' });
      index += 1;
      continue;
    }

    if (char === '(' || char === ')') {
      tokens.push({ type: 'paren', value: char });
      index += 1;
      continue;
    }

    if (char === ',') {
      tokens.push({ type: 'comma' });
      index += 1;
      continue;
    }

    if (char === '.' || char === '#') {
      // Treat unexpected characters as part of a token to avoid infinite loops.
      tokens.push({ type: 'variable', value: char });
      index += 1;
      continue;
    }

    const nextChar = expression[index + 1] ?? '';
    if ((char >= '0' && char <= '9') || (char === '.' && index + 1 < length && nextChar >= '0' && nextChar <= '9')) {
      let end = index + 1;
      while (end < length && /[0-9.]/.test(expression[end] ?? '')) {
        end += 1;
      }
      tokens.push({ type: 'number', value: expression.slice(index, end) });
      index = end;
      continue;
    }

    if (isIdentifierStart(char)) {
      let end = index + 1;
      while (end < length && isIdentifierPart(expression[end] ?? '')) {
        end += 1;
      }
      const word = expression.slice(index, end);
      index = end;

      if (word === 'Math') {
        let lookahead = index;
        while (lookahead < length && /\s/.test(expression[lookahead] ?? '')) {
          lookahead += 1;
        }
        if (expression[lookahead] === '.') {
          lookahead += 1;
          while (lookahead < length && /\s/.test(expression[lookahead] ?? '')) {
            lookahead += 1;
          }
          if (lookahead < length && isIdentifierStart(expression[lookahead] ?? '')) {
            let memberEnd = lookahead + 1;
            while (memberEnd < length && isIdentifierPart(expression[memberEnd] ?? '')) {
              memberEnd += 1;
            }
            const member = expression.slice(lookahead, memberEnd);
            index = memberEnd;
            if (MATH_FUNCTION_NAMES.includes(member as typeof MATH_FUNCTION_NAMES[number])) {
              tokens.push({ type: 'function', value: member });
              continue;
            }
            if (MATH_CONSTANT_NAMES.includes(member as typeof MATH_CONSTANT_NAMES[number])) {
              tokens.push({ type: 'constant', value: member });
              continue;
            }
            tokens.push({ type: 'variable', value: `Math.${member}` });
            continue;
          }
        }
      }

      tokens.push({ type: 'variable', value: word });
      continue;
    }

    // Fallback: treat any other single character as a variable token.
    tokens.push({ type: 'variable', value: char });
    index += 1;
  }

  return tokens;
};

class ExpressionParser {
  private readonly tokens: ExpressionToken[];

  private index = 0;

  constructor(tokens: ExpressionToken[]) {
    this.tokens = tokens;
  }

  parse(): ExpressionNode | null {
    if (this.tokens.length === 0) {
      return null;
    }
    const node = this.parseExpression();
    return node;
  }

  ensureEnd(): void {
    if (this.index < this.tokens.length) {
      throw new Error('Unexpected token in expression');
    }
  }

  private peek(): ExpressionToken | undefined {
    return this.tokens[this.index];
  }

  private consume(): ExpressionToken | undefined {
    const token = this.tokens[this.index];
    if (token) {
      this.index += 1;
    }
    return token;
  }

  private parseExpression(): ExpressionNode {
    let node = this.parseTerm();
    while (true) {
      const token = this.peek();
      if (!token || token.type !== 'operator' || (token.value !== '+' && token.value !== '-')) {
        break;
      }
      this.consume();
      const right = this.parseTerm();
      node = { type: 'binary', operator: token.value, left: node, right };
    }
    return node;
  }

  private parseTerm(): ExpressionNode {
    let node = this.parseFactor();
    while (true) {
      const token = this.peek();
      if (!token || token.type !== 'operator' || (token.value !== '*' && token.value !== '/')) {
        break;
      }
      this.consume();
      const right = this.parseFactor();
      node = { type: 'binary', operator: token.value, left: node, right };
    }
    return node;
  }

  private parseFactor(): ExpressionNode {
    let node = this.parsePower();
    return node;
  }

  private parsePower(): ExpressionNode {
    let node = this.parseUnary();
    const token = this.peek();
    if (token && token.type === 'operator' && token.value === '^') {
      this.consume();
      const right = this.parsePower();
      node = { type: 'binary', operator: '^', left: node, right };
    }
    return node;
  }

  private parseUnary(): ExpressionNode {
    const token = this.peek();
    if (token && token.type === 'operator' && (token.value === '+' || token.value === '-')) {
      this.consume();
      const argument = this.parseUnary();
      return { type: 'unary', operator: token.value, argument };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ExpressionNode {
    const token = this.consume();
    if (!token) {
      throw new Error('Unexpected end of expression');
    }

    if (token.type === 'number') {
      return { type: 'number', value: token.value };
    }

    if (token.type === 'variable') {
      return { type: 'variable', value: token.value };
    }

    if (token.type === 'constant') {
      return { type: 'constant', value: token.value };
    }

    if (token.type === 'function') {
      const next = this.consume();
      if (!next || next.type !== 'paren' || next.value !== '(') {
        throw new Error(`Function ${token.value} must be followed by ()`);
      }
      const args: ExpressionNode[] = [];
      const nextToken = this.peek();
      if (!nextToken || nextToken.type !== 'paren' || nextToken.value !== ')') {
        while (true) {
          args.push(this.parseExpression());
          const delimiter = this.peek();
          if (delimiter && delimiter.type === 'comma') {
            this.consume();
            continue;
          }
          break;
        }
      }
      const closing = this.consume();
      if (!closing || closing.type !== 'paren' || closing.value !== ')') {
        throw new Error(`Function ${token.value} is missing closing parenthesis`);
      }
      return { type: 'function', name: token.value, args };
    }

    if (token.type === 'paren' && token.value === '(') {
      const expr = this.parseExpression();
      const closing = this.consume();
      if (!closing || closing.type !== 'paren' || closing.value !== ')') {
        throw new Error('Unexpected end of group');
      }
      return expr;
    }

    throw new Error('Unable to parse expression token');
  }
}

const getNodePrecedence = (node: ExpressionNode): number => {
  if (node.type === 'binary') {
    return BINARY_PRECEDENCE[node.operator];
  }
  if (node.type === 'unary') {
    return 4;
  }
  return 5;
};

const shouldWrapChild = (
  child: ExpressionNode,
  parentPrecedence: number,
  parentOperator: BinaryOperator | string | undefined,
  position: 'left' | 'right' | 'none',
): boolean => {
  if (!parentOperator || parentOperator === '/') {
    return false;
  }
  const childPrecedence = getNodePrecedence(child);
  if (parentOperator === '^') {
    if (position === 'left') {
      return child.type === 'binary' || child.type === 'unary';
    }
    if (position === 'right') {
      return child.type === 'binary' || child.type === 'unary';
    }
  }
  if (childPrecedence < parentPrecedence) {
    return true;
  }
  if (parentOperator === '-' && position === 'right' && child.type === 'binary' && (child.operator === '+' || child.operator === '-')) {
    return true;
  }
  if (parentOperator === '*' && child.type === 'binary' && (child.operator === '+' || child.operator === '-')) {
    return true;
  }
  return false;
};

const wrapWithParens = (content: string): string => `\\left(${content}\\right)`;

const renderFunctionLatex = (name: string, args: ExpressionNode[], variableColors: Map<string, VariableColorMeta>): string => {
  if (name === 'sqrt') {
    const inner = args[0] ? renderExpressionNode(args[0], variableColors, 0, undefined, 'none') : '';
    return `\\sqrt{${inner}}`;
  }
  if (name === 'cbrt') {
    const inner = args[0] ? renderExpressionNode(args[0], variableColors, 0, undefined, 'none') : '';
    return `\\sqrt[3]{${inner}}`;
  }
  if (name === 'abs') {
    const inner = args[0] ? renderExpressionNode(args[0], variableColors, 0, undefined, 'none') : '';
    return `\\left|${inner}\\right|`;
  }
  if (name === 'pow' && args.length === 2) {
    const baseArg = args[0]!;
    const exponentArg = args[1]!;
    const base = renderExpressionNode(baseArg, variableColors, BINARY_PRECEDENCE['^'], '^', 'left');
    const exponent = renderExpressionNode(exponentArg, variableColors, BINARY_PRECEDENCE['^'], '^', 'right');
    return `${base}^{${exponent}}`;
  }
  if (name === 'log') {
    const inner = args[0] ? renderExpressionNode(args[0], variableColors, 0, undefined, 'none') : '';
    return `\\ln\\left(${inner}\\right)`;
  }
  if (name === 'log10') {
    const inner = args[0] ? renderExpressionNode(args[0], variableColors, 0, undefined, 'none') : '';
    return `\\log_{10}\\left(${inner}\\right)`;
  }
  if (name === 'log2') {
    const inner = args[0] ? renderExpressionNode(args[0], variableColors, 0, undefined, 'none') : '';
    return `\\log_{2}\\left(${inner}\\right)`;
  }
  const mapped = SIMPLE_FUNCTION_LATEX_MAP[name];
  const argLatex = args.map((arg) => renderExpressionNode(arg, variableColors, 0, undefined, 'none'));

  if (!mapped) {
    return `\\operatorname{${escapeIdentifierForLatex(name)}}\\left(${argLatex.join(',\\,')}\\right)`;
  }

  if (!FUNCTION_NAMES_USING_PARENTHESES.has(name)) {
    return `${mapped}(${argLatex.join(',\\,')})`;
  }

  if (name === 'floor' || name === 'ceil') {
    const bracket = name === 'floor' ? ['\\lfloor', '\\rfloor'] : ['\\lceil', '\\rceil'];
    const inner = argLatex[0] ?? '';
    return `${bracket[0]}${inner}${bracket[1]}`;
  }

  if (name === 'round' || name === 'trunc' || name === 'sign' || name === 'fround' || name === 'imul' || name === 'clz32' || name === 'atan2' || name === 'hypot' || name === 'max' || name === 'min' || name === 'expm1') {
    return `${mapped}\\left(${argLatex.join(',\\,')}\\right)`;
  }

  return `${mapped}\\left(${argLatex.join(',\\,')}\\right)`;
};

const renderExpressionNode = (
  node: ExpressionNode,
  variableColors: Map<string, VariableColorMeta>,
  parentPrecedence: number,
  parentOperator: BinaryOperator | string | undefined,
  position: 'left' | 'right' | 'none',
): string => {
  let latex: string;

  switch (node.type) {
    case 'number':
      latex = wrapMonospace(node.value);
      break;
    case 'variable':
      latex = formatVariableLatex(node.value, variableColors);
      break;
    case 'constant':
      latex = formatConstantLatex(node.value);
      break;
    case 'unary': {
      const prec = getNodePrecedence(node);
      const innerLatex = renderExpressionNode(node.argument, variableColors, prec, node.operator, 'right');
      latex = `${node.operator === '+' ? '+' : '-'}${innerLatex}`;
      break;
    }
    case 'binary': {
      if (node.operator === '/') {
        const numerator = renderExpressionNode(node.left, variableColors, 0, undefined, 'none');
        const denominator = renderExpressionNode(node.right, variableColors, 0, undefined, 'none');
        latex = `\\frac{${numerator}}{${denominator}}`;
        break;
      }
      if (node.operator === '^') {
        const base = renderExpressionNode(node.left, variableColors, BINARY_PRECEDENCE['^'], '^', 'left');
        const exponent = renderExpressionNode(node.right, variableColors, BINARY_PRECEDENCE['^'], '^', 'right');
        latex = `${base}^{${exponent}}`;
        break;
      }
      const prec = BINARY_PRECEDENCE[node.operator];
      const left = renderExpressionNode(node.left, variableColors, prec, node.operator, 'left');
      const right = renderExpressionNode(node.right, variableColors, prec, node.operator, 'right');
      const symbol = node.operator === '*' ? '\\cdot' : node.operator;
      latex = `${left} ${symbol} ${right}`;
      break;
    }
    case 'function':
      latex = renderFunctionLatex(node.name, node.args, variableColors);
      break;
    default:
      latex = '';
  }

  if (parentOperator && shouldWrapChild(node, parentPrecedence, parentOperator, position)) {
    latex = wrapWithParens(latex);
  }

  return latex;
};

const expressionToLatex = (expression: string, variableColors: Map<string, VariableColorMeta>): string | null => {
  const namespaced = attachMathNamespace(expression);
  const sanitized = convertDoubleStarToCaret(namespaced);
  const tokens = tokenizeExpressionForLatex(sanitized);
  const parser = new ExpressionParser(tokens);
  const ast = parser.parse();
  if (!ast) {
    return null;
  }
  parser.ensureEnd();
  return renderExpressionNode(ast, variableColors, 0, undefined, 'none');
};

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
): { html: string; error: string | null; latex: string | null } => {
  const trimmed = expression.trim();
  if (trimmed.length === 0) {
    return { html: '', error: null, latex: null };
  }

  try {
    const latex = expressionToLatex(trimmed, variableColors);
    if (latex && latex.length > 0) {
      const latexSource = `y = ${latex}`;
      const html = katex.renderToString(latexSource, { throwOnError: false });
      return { html, error: null, latex: latexSource };
    }
  } catch {
    // Fall back to monospace rendering below.
  }

  try {
  const colouredText = toTextWithColoredVariables(trimmed, variableColors);
  const source = colouredText.length > 0 ? `y = ${colouredText}` : '\\texttt{ }';
    const html = katex.renderToString(source, { throwOnError: false });
    return { html, error: null, latex: source };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to render formula preview';
    return { html: '', error: message, latex: null };
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
  const trimmed = expression.trim();
  if (!trimmed) {
    return null;
  }

  const namespaced = attachMathNamespace(trimmed);
  const normalizedExpression = normalizeExponentOperator(namespaced);

  const identifiers = normalizedExpression.match(/\b[A-Za-z_]\w*\b/g) ?? [];
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
    const destructured = variableKeys.join(', ');
    const declaration = destructured.length > 0
      ? `const { ${destructured} } = vars;`
      : '';
    const evaluator = new Function(
      'vars',
      `"use strict"; ${declaration} return (${normalizedExpression});`,
    ) as (scope: Record<string, unknown>) => number;

    const result = evaluator(variables);
    if (typeof result !== 'number' || !Number.isFinite(result)) {
      return null;
    }
    return result;
  } catch {
    return null;
  }
};

export type { VariableColorMeta };
