import { memo } from 'react';
import styled from 'styled-components';
import type { MathVariableLegendItem, ChannelSettingsDraft } from '../../types/channel.ts';
import {
  FieldLabelRow,
  HelpToggleButton,
  MathInputList,
  MathInputRow,
  MathPreviewError,
  MathPreviewSurface,
  VariableBadge,
} from './styled.ts';
import { ChannelSettingsField, ChannelTextInput } from '../ChannelSettings/styled.ts';
import { TextArea } from '../common/ModalPrimitives.ts';
import { MathSyntaxHelp } from './MathSyntaxHelp.tsx';

type MathChannelSettingsDraft = Extract<ChannelSettingsDraft, { kind: 'math' }>;

type MathExpressionPreview = {
  html: string;
  error: string | null;
};

type MathChannelSettingsProps = {
  draft: MathChannelSettingsDraft;
  legend: MathVariableLegendItem[];
  preview: MathExpressionPreview | null;
  isSyntaxHelpVisible: boolean;
  syntaxHelpPanelId: string;
  onToggleSyntaxHelp: () => void;
  onChangeField: (field: 'unit' | 'expression', value: string) => void;
};

const MathChannelSettingsComponent: React.FC<MathChannelSettingsProps> = ({
  draft,
  legend,
  preview,
  isSyntaxHelpVisible,
  syntaxHelpPanelId,
  onToggleSyntaxHelp,
  onChangeField,
}) => (
  <>
    <InlineField>
      <span>Output unit</span>
      <UnitInput
        value={draft.unit}
        maxLength={12}
        onChange={(event) => onChangeField('unit', event.target.value)}
        placeholder="e.g. V"
      />
    </InlineField>
    <ExpressionField>
      <ExpressionHeader>
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
      </ExpressionHeader>
      <ExpressionArea
        value={draft.expression}
        onChange={(event) => onChangeField('expression', event.target.value)}
        placeholder="Example: a - b"
      />
      {preview?.error ? (
        <MathPreviewError>{preview.error}</MathPreviewError>
      ) : preview?.html ? (
        <MathPreviewSurface dangerouslySetInnerHTML={{ __html: preview.html }} />
      ) : null}
      {isSyntaxHelpVisible && <MathSyntaxHelp id={syntaxHelpPanelId} />}
    </ExpressionField>
    <SourceField>
      <span>Source channels</span>
      {legend.length === 0 ? (
        <SourceEmptyNote>Sources are predefined when creating a math channel.</SourceEmptyNote>
      ) : (
        <MathInputList>
          {legend.map((item) => (
            <MathInputRow key={item.variable}>
              <VariableBadge $color={item.color}>{item.variable}</VariableBadge>
              <LegendAlias>{item.alias}</LegendAlias>
            </MathInputRow>
          ))}
        </MathInputList>
      )}
    </SourceField>
  </>
);

export const MathChannelSettings = memo(MathChannelSettingsComponent);

const InlineField = styled(ChannelSettingsField)`
  flex-direction: row;
  align-items: center;
  gap: 0.55rem;

  > span {
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(183, 200, 232, 0.85);
  }
`;

const UnitInput = styled(ChannelTextInput)`
  width: 110px;
  padding: 0.35rem 0.55rem;
  font-size: 0.84rem;
`;

const ExpressionField = styled(ChannelSettingsField)`
  gap: 0.3rem;
`;

const ExpressionHeader = styled(FieldLabelRow)`
  align-items: center;

  span {
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(183, 200, 232, 0.85);
  }
`;

const ExpressionArea = styled(TextArea)`
  min-height: 72px;
  font-size: 0.88rem;
  padding: 0.5rem 0.6rem;
`;

const SourceField = styled(ChannelSettingsField)`
  gap: 0.3rem;

  > span {
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(183, 200, 232, 0.85);
  }
`;

const SourceEmptyNote = styled.small`
  color: #9fb4d7;
  font-size: 0.75rem;
`;

const LegendAlias = styled.span`
  font-weight: 600;
  color: #eef4ff;
  font-size: 0.87rem;
`;
