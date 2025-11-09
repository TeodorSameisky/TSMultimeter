import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type {
  DeviceChannelConfig,
  MathChannelFormState,
  MathChannelInput,
  MathVariableLegendItem,
  MathChannelSubmission,
} from '../../types/channel.ts';
import type { MeasurementSample } from '../../types/deviceData.ts';
import { MathChannelWizard } from '../MathChannel/MathChannelWizard.tsx';
import {
  createExpressionPreview,
  evaluateMathExpression,
  toVariableColorMap,
} from '../../utils/mathExpressions.ts';
import { buildMathVariableLegend } from '../../utils/mathChannelLegend.ts';
import {
  buildDefaultMathAlias,
  createInitialMathFormState,
  createNextMathFormInput,
} from '../../utils/mathChannelDefaults.ts';
import { MATH_VARIABLES } from '../../utils/mathExpressions.ts';

const SYNTAX_HELP_ID = 'math-syntax-wizard';

type MathChannelWizardDialogProps = {
  deviceChannels: DeviceChannelConfig[];
  latestSampleByChannel: Record<string, MeasurementSample | undefined>;
  mathChannelCount: number;
  onSubmit: (submission: MathChannelSubmission) => void;
  onClose: () => void;
};

const MathChannelWizardDialogComponent: React.FC<MathChannelWizardDialogProps> = ({
  deviceChannels,
  latestSampleByChannel,
  mathChannelCount,
  onSubmit,
  onClose,
}) => {
  const deviceChannelMap = useMemo(
    () => new Map(deviceChannels.map((channel) => [channel.id, channel] as const)),
    [deviceChannels],
  );

  const [mathForm, setMathForm] = useState<MathChannelFormState>(() =>
    createInitialMathFormState(deviceChannels, latestSampleByChannel, mathChannelCount),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    deviceChannels.length === 0 ? 'Connect at least one device channel first.' : null,
  );
  const [isSyntaxHelpVisible, setSyntaxHelpVisible] = useState(false);

  const legend = useMemo<MathVariableLegendItem[]>(() => {
    const inputs: MathChannelInput[] = mathForm.inputs.map((input) => ({
      channelId: input.channelId,
      variable: input.variable,
    }));
    return buildMathVariableLegend(inputs, deviceChannelMap);
  }, [deviceChannelMap, mathForm.inputs]);

  const preview = useMemo(
    () => createExpressionPreview(mathForm.expression, toVariableColorMap(legend)),
    [legend, mathForm.expression],
  );

  useEffect(() => {
    if (deviceChannels.length === 0) {
      setErrorMessage('Connect at least one device channel first.');
      return;
    }
    setErrorMessage((prev) => (prev === 'Connect at least one device channel first.' ? null : prev));
  }, [deviceChannels.length]);

  useEffect(() => {
    setMathForm((prev) => {
      if (deviceChannels.length === 0) {
        if (prev.inputs.length === 0) {
          return prev;
        }
        return {
          ...prev,
          inputs: [],
        } satisfies MathChannelFormState;
      }

      const targetLength = Math.min(deviceChannels.length, MATH_VARIABLES.length);
      const availableChannels = deviceChannels.slice(0, targetLength);

      let nextInputs = prev.inputs;
      let mutated = false;

      if (nextInputs.length > targetLength) {
        nextInputs = nextInputs.slice(0, targetLength);
        mutated = true;
      }

      while (nextInputs.length < targetLength) {
        const nextInput = createNextMathFormInput(nextInputs, availableChannels);
        if (!nextInput) {
          break;
        }
        nextInputs = [...nextInputs, nextInput];
        mutated = true;
      }

      const reassignedInputs = nextInputs.map((input, index) => {
        const mappedId = availableChannels[index]?.id ?? '';
        if (input.channelId === mappedId) {
          return input;
        }
        mutated = true;
        return {
          ...input,
          channelId: mappedId,
        } satisfies MathChannelFormState['inputs'][number];
      });

      if (!mutated) {
        return prev;
      }

      return {
        ...prev,
        inputs: reassignedInputs,
      } satisfies MathChannelFormState;
    });
  }, [deviceChannels]);

  const handleToggleSyntaxHelp = useCallback(() => {
    setSyntaxHelpVisible((visible) => !visible);
  }, []);

  const handleChangeField = useCallback((field: 'alias' | 'unit' | 'expression', value: string) => {
    setMathForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setErrorMessage(null);
  }, []);

  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (deviceChannels.length === 0) {
      setErrorMessage('Connect at least one device channel first.');
      return;
    }

    const alias = mathForm.alias.trim() || buildDefaultMathAlias(mathChannelCount);
    const unit = mathForm.unit.trim();
    const expression = mathForm.expression.trim();
    const normalizedInputs = mathForm.inputs.map((input) => ({ channelId: input.channelId.trim(), variable: input.variable }));

    if (normalizedInputs.length === 0) {
      setErrorMessage('Add at least one source channel.');
      return;
    }

    const hasMissingChannel = normalizedInputs.some((input) => input.channelId.length === 0);
    if (hasMissingChannel) {
      setErrorMessage('One or more mapped channels are unavailable. Remove the variable or reconnect the source device.');
      return;
    }

    const selectedInputs = normalizedInputs;

    if (!unit) {
      setErrorMessage('Provide an output unit for the math channel.');
      return;
    }

    if (!expression) {
      setErrorMessage('Provide an expression using the listed variables.');
      return;
    }

    const uniqueChannels = new Set(selectedInputs.map((input) => input.channelId));
    if (uniqueChannels.size !== selectedInputs.length) {
      setErrorMessage('Each variable must map to a unique source channel.');
      return;
    }

    const placeholderVariables: Record<string, number> = {};
    selectedInputs.forEach((input) => {
      placeholderVariables[input.variable] = 1;
    });

    if (evaluateMathExpression(expression, placeholderVariables) === null) {
      setErrorMessage('Expression is invalid or references unknown variables.');
      return;
    }

    onSubmit({
      alias,
      unit,
      expression,
      inputs: selectedInputs,
    });
    setSyntaxHelpVisible(false);
    setErrorMessage(null);
  }, [deviceChannels.length, mathChannelCount, mathForm, onSubmit]);

  const handleClose = useCallback(() => {
    setErrorMessage(null);
    setSyntaxHelpVisible(false);
    onClose();
  }, [onClose]);

  return (
    <MathChannelWizard
      deviceChannels={deviceChannels}
      mathForm={mathForm}
      legend={legend}
      preview={preview}
      errorMessage={errorMessage}
      isSyntaxHelpVisible={isSyntaxHelpVisible}
      syntaxHelpPanelId={SYNTAX_HELP_ID}
      onToggleSyntaxHelp={handleToggleSyntaxHelp}
      onSubmit={handleSubmit}
      onClose={handleClose}
      onChangeField={handleChangeField}
    />
  );
};

export const MathChannelWizardDialog = MathChannelWizardDialogComponent;
