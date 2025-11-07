import { memo, useMemo } from 'react';
import type { FC, FormEvent } from 'react';
import type {
  ChannelConfig,
  ChannelSettingsDraft,
  DeviceChannelConfig,
} from '../../types/channel.ts';
import { buildMathVariableLegend } from '../../utils/mathChannelLegend.ts';
import { createExpressionPreview, toVariableColorMap } from '../../utils/mathExpressions.ts';
import {
  ChannelSettingsActionButton,
  ChannelSettingsActions,
  ChannelSettingsError,
  ChannelSettingsPanel,
} from '../ChannelSettings/styled.ts';
import { ChannelSettingsCommonFields } from '../ChannelSettings/ChannelSettingsCommonFields.tsx';
import { MathChannelSettings } from '../MathChannel/MathChannelSettings.tsx';

type ChannelSettingsCardProps = {
  channel: ChannelConfig;
  draft: ChannelSettingsDraft;
  error: string | null;
  deviceChannelById: Map<string, DeviceChannelConfig>;
  mathSettingsHelpChannelId: string | null;
  onToggleMathHelp: (channelId: string) => void;
  onSettingsFieldChange: (
    field: 'alias' | 'color' | 'unit' | 'expression' | 'precision',
    value: string,
  ) => void;
  onSettingsCancel: () => void;
  onSettingsSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const ChannelSettingsCardComponent: FC<ChannelSettingsCardProps> = ({
  channel,
  draft,
  error,
  deviceChannelById,
  mathSettingsHelpChannelId,
  onToggleMathHelp,
  onSettingsFieldChange,
  onSettingsCancel,
  onSettingsSubmit,
}) => {
  const mathHelpPanelId = `math-syntax-${channel.id}`;
  const isMathDraft = draft.kind === 'math';

  const mathSettingsLegend = useMemo(
    () => (isMathDraft ? buildMathVariableLegend(draft.inputs, deviceChannelById) : []),
    [deviceChannelById, draft, isMathDraft],
  );

  const mathSettingsPreview = useMemo(
    () => (
      isMathDraft ? createExpressionPreview(draft.expression, toVariableColorMap(mathSettingsLegend)) : null
    ),
    [draft, isMathDraft, mathSettingsLegend],
  );

  const isMathSettingsHelpVisible = isMathDraft && mathSettingsHelpChannelId === channel.id;

  return (
    <ChannelSettingsPanel onSubmit={onSettingsSubmit}>
      {error && <ChannelSettingsError>{error}</ChannelSettingsError>}
      <ChannelSettingsCommonFields draft={draft} onFieldChange={onSettingsFieldChange} />
      {isMathDraft && (
        <MathChannelSettings
          draft={draft}
          legend={mathSettingsLegend}
          preview={mathSettingsPreview}
          isSyntaxHelpVisible={isMathSettingsHelpVisible}
          syntaxHelpPanelId={mathHelpPanelId}
          onToggleSyntaxHelp={() => onToggleMathHelp(channel.id)}
          onChangeField={onSettingsFieldChange}
        />
      )}
      <ChannelSettingsActions>
        <ChannelSettingsActionButton type="button" onClick={onSettingsCancel}>
          Cancel
        </ChannelSettingsActionButton>
        <ChannelSettingsActionButton type="submit" $variant="primary">
          Save
        </ChannelSettingsActionButton>
      </ChannelSettingsActions>
    </ChannelSettingsPanel>
  );
};

export const ChannelSettingsCard = memo(ChannelSettingsCardComponent);
