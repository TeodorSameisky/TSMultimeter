import React from 'react';
import type { MeasurementConfig } from '../../types/measurement.ts';
import { MEASUREMENT_KIND_LABELS } from '../../types/measurement.ts';
import { formatMeasurementDisplay } from '../../utils/formatNumber.ts';
import {
  SidePanel,
  PanelHeader,
  PanelTitle,
  PanelHeaderActions,
  ToolbarButton,
  PanelBody,
  PanelSection,
  PanelSectionTitle,
  EmptyNote,
  MeasurementList,
  MeasurementItem,
  MeasurementHeader,
  MeasurementName,
  MeasurementBadge,
  MeasurementValue,
  MeasurementActions,
  RemoveMeasurementButton,
} from '../AppLayout/styled.ts';

export type MeasurementSummary = {
  config: MeasurementConfig;
  value: number | null;
  unit?: string;
  sampleCount: number;
  accent: string;
  channelAlias: string;
};

export type MeasurementPanelProps = {
  open: boolean;
  summaries: MeasurementSummary[];
  canAddMeasurement: boolean;
  onAddMeasurement: () => void;
  onRemoveMeasurement: (id: string) => void;
};

/**
 * Side panel that lists derived measurements and exposes actions for adding or
 * removing tracked statistics. Keeps the presentation isolated from the App
 * container, enabling targeted testing and reuse.
 */
export const MeasurementPanel: React.FC<MeasurementPanelProps> = ({
  open,
  summaries,
  canAddMeasurement,
  onAddMeasurement,
  onRemoveMeasurement,
}) => (
  <SidePanel $position="right" $open={open}>
    <PanelHeader>
      <PanelTitle>Measurements</PanelTitle>
      <PanelHeaderActions>
        <ToolbarButton type="button" onClick={onAddMeasurement} disabled={!canAddMeasurement}>
          + Add
        </ToolbarButton>
      </PanelHeaderActions>
    </PanelHeader>

    <PanelBody>
      <PanelSection>
        <PanelSectionTitle>Tracked Measurements</PanelSectionTitle>
        {summaries.length === 0 ? (
          <EmptyNote>Pin scope math or device stats here. Add measurements to compute live statistics.</EmptyNote>
        ) : (
          <MeasurementList>
            {summaries.map((summary) => (
              <MeasurementItem key={summary.config.id} $accent={summary.accent}>
                <MeasurementHeader>
                  <MeasurementName>{summary.channelAlias}</MeasurementName>
                  <MeasurementBadge $accent={summary.accent}>
                    {MEASUREMENT_KIND_LABELS[summary.config.kind]}
                  </MeasurementBadge>
                </MeasurementHeader>
                <MeasurementValue $accent={summary.accent}>
                  {summary.value === null ? (
                    <>
                      <span className="value">---</span>
                      <span className="unit">{summary.unit ?? '—'}</span>
                    </>
                  ) : (
                    (() => {
                      const display = formatMeasurementDisplay(summary.value ?? 0, summary.unit ?? '');
                      const resolvedUnit = display.unitText || summary.unit || '—';
                      return (
                        <>
                          <span className="value">{display.valueText}</span>
                          <span className="unit">{resolvedUnit}</span>
                        </>
                      );
                    })()
                  )}
                </MeasurementValue>
                <MeasurementActions>
                  <RemoveMeasurementButton
                    type="button"
                    $accent={summary.accent}
                    onClick={() => onRemoveMeasurement(summary.config.id)}
                  >
                    Remove
                  </RemoveMeasurementButton>
                </MeasurementActions>
              </MeasurementItem>
            ))}
          </MeasurementList>
        )}
      </PanelSection>
    </PanelBody>
  </SidePanel>
);
