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

export type AboutPanelProps = {
  open: boolean;
};

/**
 * Static about panel describing the application stack and guiding principles.
 * Separating the markup keeps the App container concise and focused on control
 * flow.
 */
export const AboutPanel: React.FC<AboutPanelProps> = ({ open }) => (
  <SidePanel $position="left" $open={open}>
    <PanelHeader>
      <PanelTitle>About</PanelTitle>
    </PanelHeader>

    <PanelBody>
      <PanelSection>
        <PanelSectionTitle>TSMultimeter</PanelSectionTitle>
        <PanelText>
          Desktop companion for TSMultimeter hardware that pairs a Rust backend with a React/Electron UI to stream live
          measurements, log sessions, and craft derived math channels without touching command-line tooling.
        </PanelText>
      </PanelSection>
      <PanelSection>
        <PanelSectionTitle>Core ideas</PanelSectionTitle>
        <PanelList>
          <PanelListItem>Real-time device polling with automatic channel discovery and colour assignment.</PanelListItem>
          <PanelListItem>Mock multimeter pipeline for UI development without hardware.</PanelListItem>
          <PanelListItem>Math traces that reuse the same history pipeline as physical channels.</PanelListItem>
        </PanelList>
      </PanelSection>
      <PanelSection>
        <PanelSectionTitle>Stack</PanelSectionTitle>
        <PanelText>
          Backend: Rust (Warp, serialport) · Frontend: TypeScript, React, styled-components, Recharts · Desktop shell: Electron.
        </PanelText>
      </PanelSection>
    </PanelBody>
  </SidePanel>
);
