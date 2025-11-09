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
        <PanelSectionTitle>Version</PanelSectionTitle>
        <PanelText>
          0.1.0
        </PanelText>
      </PanelSection>
      <PanelSection>
        <PanelSectionTitle>Supported Devices</PanelSectionTitle>
        <PanelList>
          <PanelListItem>Fluke 289</PanelListItem>
          <PanelListItem>Fluke 287</PanelListItem>
        </PanelList>
      </PanelSection>
      <PanelSection>
        <PanelSectionTitle>License</PanelSectionTitle>
        <PanelText>
          This project is licensed under the MIT License.
        </PanelText>
      </PanelSection>
      <PanelSection>
        <PanelSectionTitle>Dependencies</PanelSectionTitle>
        <PanelList>
          <PanelListItem><strong>Frontend:</strong></PanelListItem>
          <PanelListItem>@tauri-apps/api - MIT</PanelListItem>
          <PanelListItem>html-to-image - MIT</PanelListItem>
          <PanelListItem>katex - MIT</PanelListItem>
          <PanelListItem>react - MIT</PanelListItem>
          <PanelListItem>react-dom - MIT</PanelListItem>
          <PanelListItem>recharts - MIT</PanelListItem>
          <PanelListItem>styled-components - MIT</PanelListItem>
          <PanelListItem><strong>Backend:</strong></PanelListItem>
          <PanelListItem>serialport - MIT</PanelListItem>
          <PanelListItem>tokio - MIT</PanelListItem>
          <PanelListItem>tauri - MIT</PanelListItem>
          <PanelListItem>anyhow - MIT</PanelListItem>
          <PanelListItem>thiserror - MIT</PanelListItem>
          <PanelListItem>tracing - MIT</PanelListItem>
          <PanelListItem>tracing-subscriber - MIT</PanelListItem>
          <PanelListItem>serde - MIT</PanelListItem>
          <PanelListItem>serde_json - MIT</PanelListItem>
          <PanelListItem>rand - MIT</PanelListItem>
          <PanelListItem>async-trait - MIT</PanelListItem>
          <PanelListItem>chrono - MIT</PanelListItem>
          <PanelListItem>warp - MIT</PanelListItem>
        </PanelList>
      </PanelSection>
    </PanelBody>
  </SidePanel>
);
