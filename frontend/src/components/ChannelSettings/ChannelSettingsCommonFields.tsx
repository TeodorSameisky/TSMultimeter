import { memo } from 'react';
import type { ChannelSettingsDraft } from '../../types/channel.ts';
import { ChannelColorInput, ChannelSettingsField, ChannelTextInput } from './styled.ts';
import { SettingRow, SettingInfo, SettingLabel, SettingDescription, SettingToggle, ToggleThumb } from '../AppLayout/styled.ts';

type CommonField = 'alias' | 'color' | 'precision';

type ChannelSettingsCommonFieldsProps = {
  draft: ChannelSettingsDraft;
  onFieldChange: (field: CommonField, value: string) => void;
  onPopoutChange: (enabled: boolean) => void;
};

const ChannelSettingsCommonFieldsComponent: React.FC<ChannelSettingsCommonFieldsProps> = ({
  draft,
  onFieldChange,
  onPopoutChange,
}) => (
  <>
    <ChannelSettingsField>
      <span>Channel name</span>
      <ChannelTextInput
        value={draft.alias}
        maxLength={40}
        onChange={(event) => onFieldChange('alias', event.target.value)}
        placeholder="Channel label"
      />
    </ChannelSettingsField>
    <ChannelSettingsField>
      <span>Channel colour</span>
      <ChannelColorInput
        type="color"
        value={draft.color}
        onChange={(event) => onFieldChange('color', event.target.value)}
        aria-label="Channel colour"
      />
    </ChannelSettingsField>
    <ChannelSettingsField>
      <span>Decimal places</span>
      <ChannelTextInput
        type="number"
        inputMode="numeric"
        min={0}
        max={9}
        step={1}
        value={draft.precision ?? ''}
        onChange={(event) => onFieldChange('precision', event.target.value)}
        placeholder="Auto"
      />
    </ChannelSettingsField>
    <SettingRow>
      <SettingInfo>
        <SettingLabel>Popout window</SettingLabel>
        <SettingDescription>Show channel value in a floating transparent window</SettingDescription>
      </SettingInfo>
      <SettingToggle
        $active={draft.popoutEnabled ?? false}
        onClick={() => onPopoutChange(!draft.popoutEnabled)}
        aria-label="Toggle popout window"
      >
        <ToggleThumb $active={draft.popoutEnabled ?? false} />
      </SettingToggle>
    </SettingRow>
  </>
);

export const ChannelSettingsCommonFields = memo(ChannelSettingsCommonFieldsComponent);
