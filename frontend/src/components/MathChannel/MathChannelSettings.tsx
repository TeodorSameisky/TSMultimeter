import { memo, useCallback, useEffect, useState } from 'react';
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
  latex: string | null;
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
}) => {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  useEffect(() => {
    setCopyState('idle');
  }, [preview?.latex]);

  useEffect(() => {
    if (copyState === 'idle') {
      return;
    }
    const timer = window.setTimeout(() => {
      setCopyState('idle');
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  const handleCopyLatex = useCallback(async () => {
    if (!preview?.latex || preview.latex.trim().length === 0) {
      return;
    }
    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(preview.latex);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  }, [preview?.latex]);

  const copyLabel = copyState === 'copied'
    ? 'Copied'
    : copyState === 'error'
      ? 'Copy failed'
      : 'Copy LaTeX';

  const isCopyDisabled = !preview?.latex || preview.latex.trim().length === 0;

  return (
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
        {preview && (
          <PreviewToolbar>
            <span>Preview</span>
            <CopyLatexButton
              type="button"
              onClick={handleCopyLatex}
              disabled={isCopyDisabled}
              $status={copyState}
            >
              {copyLabel}
            </CopyLatexButton>
          </PreviewToolbar>
        )}
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
};

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

const PreviewToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.4rem;

  > span {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(183, 200, 232, 0.85);
  }
`;

const CopyLatexButton = styled.button<{ $status: 'idle' | 'copied' | 'error' }>`
  border: 1px solid rgba(120, 158, 228, 0.35);
  background: rgba(26, 42, 72, 0.65);
  color: rgba(220, 231, 255, 0.88);
  padding: 0.25rem 0.55rem;
  border-radius: 8px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;

  ${({ $status }) => $status === 'copied' && `
    border-color: rgba(76, 201, 120, 0.7);
    background: rgba(30, 68, 48, 0.7);
    color: rgba(193, 247, 211, 0.95);
  `}

  ${({ $status }) => $status === 'error' && `
    border-color: rgba(255, 120, 120, 0.7);
    background: rgba(70, 24, 24, 0.7);
    color: rgba(255, 200, 200, 0.95);
  `}

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &:not(:disabled):hover {
    background: rgba(39, 64, 102, 0.75);
  }
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
