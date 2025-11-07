import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type {
  DeviceChannelConfig,
  MathChannelFormState,
  MathChannelInput,
  MathVariableLegendItem,
  MathChannelSubmission,
} from '../../types/channel.ts';
import type { MeasurementSample } from '../../hooks/useDevice.ts';
import { MathChannelWizard } from '../MathChannel/MathChannelWizard.tsx';
import {
  createExpressionPreview,
  evaluateMathExpression,
  toVariableColorMap,
} from '../../utils/mathExpressions.ts';
import { buildMathVariableLegend } from '../../utils/mathChannelLegend.ts';
import {
  buildDefaultMathAlias,
  canAddMathInput,
  createInitialMathFormState,
  createNextMathFormInput,
} from '../../utils/mathChannelDefaults.ts';

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

  const canAddSource = useMemo(
    () => canAddMathInput(mathForm.inputs, deviceChannels),
    [deviceChannels, mathForm.inputs],
  );

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
      const validIds = new Set(deviceChannels.map((channel) => channel.id));
      let mutated = false;
      const filtered = prev.inputs.filter((input) => {
        if (input.channelId.length === 0 || validIds.has(input.channelId)) {
          return true;
        }
        mutated = true;
        return false;
      });
      if (!mutated) {
        return prev;
      }
      return {
        ...prev,
        inputs: filtered,
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

  const handleChangeInputChannel = useCallback((key: string, channelId: string) => {
    setMathForm((prev) => ({
      ...prev,
      inputs: prev.inputs.map((input) => (
        input.key === key
          ? { ...input, channelId }
          : input
      )),
    }));
    setErrorMessage(null);
  }, []);

  const handleAddInput = useCallback(() => {
    setMathForm((prev) => {
      const nextInput = createNextMathFormInput(prev.inputs, deviceChannels);
      if (!nextInput) {
        return prev;
      }
      return {
        ...prev,
        inputs: [...prev.inputs, nextInput],
      } satisfies MathChannelFormState;
    });
    setErrorMessage(null);
  }, [deviceChannels]);

  const handleRemoveInput = useCallback((key: string) => {
    setMathForm((prev) => ({
      ...prev,
      inputs: prev.inputs.filter((input) => input.key !== key),
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
    const selectedInputs = mathForm.inputs
      .map((input) => ({ channelId: input.channelId.trim(), variable: input.variable }))
      .filter((input) => input.channelId.length > 0);

    if (selectedInputs.length === 0) {
      setErrorMessage('Select at least one source channel.');
      return;
    }

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
      canAddSource={canAddSource}
      errorMessage={errorMessage}
      isSyntaxHelpVisible={isSyntaxHelpVisible}
      syntaxHelpPanelId={SYNTAX_HELP_ID}
      onToggleSyntaxHelp={handleToggleSyntaxHelp}
      onSubmit={handleSubmit}
      onClose={handleClose}
      onChangeField={handleChangeField}
      onChangeInputChannel={handleChangeInputChannel}
      onAddInput={handleAddInput}
      onRemoveInput={handleRemoveInput}
    />
  );
};

export const MathChannelWizardDialog = MathChannelWizardDialogComponent;
