import React from 'react';
import {
  SidePanel,
  PanelHeader,
  PanelTitle,
  PanelBody,
  PanelSection,
  PanelSectionTitle,
  PanelText,
  PanelList,
  PanelListItem,
} from '../AppLayout/styled.ts';

export type HelpPanelProps = {
  open: boolean;
};

/**
 * Presents quick-start guidance and troubleshooting tips. The panel is static
 * for now, but living in its own component simplifies future enhancements such
 * as dynamic FAQs or links.
 */
export const HelpPanel: React.FC<HelpPanelProps> = ({ open }) => (
  <SidePanel $position="left" $open={open}>
    <PanelHeader>
      <PanelTitle>Help</PanelTitle>
    </PanelHeader>

    <PanelBody>
      <PanelSection>
        <PanelSectionTitle>Quick start</PanelSectionTitle>
        <PanelList>
          <PanelListItem>Connect a device from the channel tray, or enable developer features to access the mock multimeter for UI exploration.</PanelListItem>
          <PanelListItem>Open channel settings to rename traces, tweak colours, and build math expressions.</PanelListItem>
          <PanelListItem>Use the scope toolbar to export snapshots or reset the rolling history.</PanelListItem>
        </PanelList>
      </PanelSection>
      <PanelSection>
        <PanelSectionTitle>Troubleshooting</PanelSectionTitle>
        <PanelList>
          <PanelListItem>Verify the backend service (Cargo) is running before launching the Electron shell.</PanelListItem>
          <PanelListItem>Refresh available ports if hardware is attached after startup.</PanelListItem>
          <PanelListItem>Check the console output for serial permission errors on first-time setups.</PanelListItem>
        </PanelList>
      </PanelSection>
      <PanelSection>
        <PanelSectionTitle>Need more?</PanelSectionTitle>
        <PanelText>
          Review the repository README or the protocol notes under <code>protocols/</code> for device specifics. File issues or
          questions via GitHub to collaborate with the team.
        </PanelText>
      </PanelSection>
    </PanelBody>
  </SidePanel>
);
