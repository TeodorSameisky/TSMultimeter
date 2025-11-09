import { memo } from 'react';
import type { FormEvent } from 'react';
import type { DeviceChannelConfig, MathChannelFormState, MathVariableLegendItem } from '../../types/channel.ts';
import {
  FieldLabelRow,
  HelpToggleButton,
  MathInputList,
  MathInputRow,
  MathPreviewError,
  MathPreviewSurface,
  VariableBadge,
  SourceChannelLabel,
} from './styled.ts';
import {
  ErrorNote,
  FormGroup,
  GhostButton,
  Input,
  ModalActions,
  ModalTitle,
  PrimaryButton,
  TextArea,
} from '../common/ModalPrimitives.ts';
import { MathSyntaxHelp } from './MathSyntaxHelp.tsx';

type MathExpressionPreview = {
  html: string;
  error: string | null;
  latex: string | null;
};

type MathChannelWizardProps = {
  deviceChannels: DeviceChannelConfig[];
  mathForm: MathChannelFormState;
  legend: MathVariableLegendItem[];
  preview: MathExpressionPreview;
  errorMessage: string | null;
  isSyntaxHelpVisible: boolean;
  syntaxHelpPanelId: string;
  onToggleSyntaxHelp: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onChangeField: (field: 'alias' | 'unit' | 'expression', value: string) => void;
};

const MathChannelWizardComponent: React.FC<MathChannelWizardProps> = ({
  deviceChannels,
  mathForm,
  legend,
  preview,
  errorMessage,
  isSyntaxHelpVisible,
  syntaxHelpPanelId,
  onToggleSyntaxHelp,
  onSubmit,
  onClose,
  onChangeField,
}) => (
  <>
    <ModalTitle>Create a math channel</ModalTitle>
    <form onSubmit={onSubmit}>
      {errorMessage && <ErrorNote>{errorMessage}</ErrorNote>}

      <FormGroup>
        Channel name
        <Input
          value={mathForm.alias}
          onChange={(event) => onChangeField('alias', event.target.value)}
          maxLength={40}
          placeholder="e.g. Vdrop"
        />
      </FormGroup>

      <FormGroup>
        Output unit
        <Input
          value={mathForm.unit}
          onChange={(event) => onChangeField('unit', event.target.value)}
          maxLength={12}
          placeholder="e.g. V"
        />
      </FormGroup>

      <FormGroup>
        <FieldLabelRow>
          <span>Expression</span>
          <HelpToggleButton
            type="button"
            onClick={onToggleSyntaxHelp}
            aria-label="Toggle math syntax help"
            aria-expanded={isSyntaxHelpVisible}
            aria-controls={syntaxHelpPanelId}
            $active={isSyntaxHelpVisible}
          >
            ?
          </HelpToggleButton>
        </FieldLabelRow>
        <TextArea
          value={mathForm.expression}
          onChange={(event) => onChangeField('expression', event.target.value)}
          placeholder="Example: a - b"
        />
        {preview.error ? (
          <MathPreviewError>{preview.error}</MathPreviewError>
        ) : preview.html ? (
          <MathPreviewSurface dangerouslySetInnerHTML={{ __html: preview.html }} />
        ) : null}
        {isSyntaxHelpVisible && <MathSyntaxHelp id={syntaxHelpPanelId} />}
      </FormGroup>

      <FormGroup>
        Source channels
        <MathInputList>
          {mathForm.inputs.map((input) => {
            const legendMeta = legend.find((item) => item.variable === input.variable);
            const fallbackChannel = deviceChannels.find((channel) => channel.id === input.channelId);
            const aliasLabel = legendMeta?.alias ?? fallbackChannel?.alias ?? 'Channel unavailable';
            const badgeProps: { $color?: string } = legendMeta?.color ? { $color: legendMeta.color } : {};
            return (
              <MathInputRow key={input.key}>
                <VariableBadge {...badgeProps}>{input.variable}</VariableBadge>
                <SourceChannelLabel>{aliasLabel}</SourceChannelLabel>
              </MathInputRow>
            );
          })}
        </MathInputList>
      </FormGroup>

      <ModalActions>
        <GhostButton type="button" onClick={onClose}>
          Cancel
        </GhostButton>
        <PrimaryButton type="submit" disabled={deviceChannels.length === 0}>
          Create channel
        </PrimaryButton>
      </ModalActions>
    </form>
  </>
);

export const MathChannelWizard = memo(MathChannelWizardComponent);
