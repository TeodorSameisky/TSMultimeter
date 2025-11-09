import React from 'react';
import {
  SidePanel,
  PanelHeader,
  PanelTitle,
  PanelBody,
  PanelSection,
  PanelSectionTitle,
  SettingRow,
  SettingInfo,
  SettingLabel,
  SettingDescription,
  SettingToggle,
  ToggleThumb,
} from '../AppLayout/styled.ts';

export type SettingsPanelProps = {
  open: boolean;
  developerModeEnabled: boolean;
  onToggleDeveloperMode: () => void;
};

/**
 * Hosts user preferences such as the developer mode toggle. The panel keeps the
 * presentation declarative while the parent component owns the behavioural
 * state and callbacks.
 */
export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  open,
  developerModeEnabled,
  onToggleDeveloperMode,
}) => (
  <SidePanel $position="left" $open={open}>
    <PanelHeader>
      <PanelTitle>Settings</PanelTitle>
    </PanelHeader>

    <PanelBody>
      <PanelSection>
        <PanelSectionTitle>Preferences</PanelSectionTitle>
        <SettingRow>
          <SettingInfo>
            <SettingLabel>Developer features</SettingLabel>
            <SettingDescription>
              Expose the mock device and experimental tooling for local development sessions.
            </SettingDescription>
          </SettingInfo>
          <SettingToggle
            type="button"
            $active={developerModeEnabled}
            onClick={onToggleDeveloperMode}
            aria-pressed={developerModeEnabled}
            aria-label={developerModeEnabled ? 'Disable developer features' : 'Enable developer features'}
          >
            <ToggleThumb $active={developerModeEnabled} />
          </SettingToggle>
        </SettingRow>
      </PanelSection>
    </PanelBody>
  </SidePanel>
);
