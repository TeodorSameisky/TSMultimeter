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
        <PanelSectionTitle>Troubleshooting</PanelSectionTitle>
        <PanelList>
          <PanelListItem>For connecting to Fluke 287 and 289, the FTDI Driver is needed. It can be found at <a href="https://ftdichip.com/drivers/" target="_blank" rel="noopener noreferrer" style={{ color: '#ffffff' }}>https://ftdichip.com/drivers/</a>.</PanelListItem>
        </PanelList>
      </PanelSection>
      <PanelSection>
        <PanelSectionTitle>Support</PanelSectionTitle>
        <PanelText>
          For feature requests or if you found bugs, please open an issue in <a href="https://github.com/TeodorSameisky/TSMultimeter" target="_blank" rel="noopener noreferrer" style={{ color: '#ffffff' }}>the repository</a>.
        </PanelText>
      </PanelSection>
    </PanelBody>
  </SidePanel>
);
