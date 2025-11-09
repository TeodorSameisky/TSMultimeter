import { memo } from 'react';
import styled, { css } from 'styled-components';
import type { FormEvent } from 'react';
import type { MeasurementSample } from '../../types/deviceData.ts';
import type {
  ChannelConfig,
  ChannelSettingsDraft,
  DeviceChannelConfig,
} from '../../types/channel.ts';
import { isMathChannel } from '../../types/channel.ts';
import { formatMeasurementDisplay } from '../../utils/formatNumber.ts';
import { ChannelSettingsCard } from './ChannelSettingsCard.tsx';

export type ChannelReading = {
  channel: ChannelConfig;
  sample: MeasurementSample | undefined;
};

export type ChannelStripProps = {
  channelReadings: ChannelReading[];
  channelSettingsDraft: ChannelSettingsDraft | null;
  channelSettingsError: string | null;
  deviceChannelById: Map<string, DeviceChannelConfig>;
  mathSettingsHelpChannelId: string | null;
  isAddDeviceDisabled: boolean;
  canAddMathChannel: boolean;
  onAddDevice: () => void;
  onAddMath: () => void;
  onOpenChannelSettings: (channel: ChannelConfig) => void;
  onDisconnectChannel: (channel: ChannelConfig) => void;
  onToggleChannel: (id: string) => void;
  onToggleMathHelp: (channelId: string) => void;
  onSettingsFieldChange: (
    field: 'alias' | 'color' | 'unit' | 'expression' | 'precision',
    value: string,
  ) => void;
  onPopoutChange: (enabled: boolean) => void;
  onSettingsCancel: () => void;
  onSettingsSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const ChannelStripRoot = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.85rem;
  position: relative;
  padding: 0.5rem 0;
`;

const ChannelCard = styled.div<{
  $disabled: boolean;
  $accent: string;
  $settingsOpen: boolean;
}>`
  position: relative;
  min-width: 190px;
  border-radius: 14px;
  padding: 0.95rem 1rem 1rem;
  background: rgba(9, 16, 26, 0.86);
  border: 1px solid rgba(60, 85, 122, 0.65);
  box-shadow: ${({ $settingsOpen }) =>
    $settingsOpen
      ? '0 22px 46px rgba(7, 11, 19, 0.55)'
      : '0 12px 32px rgba(7, 11, 19, 0.35)'};
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease,
    border-color 0.18s ease, background 0.18s ease, filter 0.18s ease;
  align-self: stretch;
  overflow: visible;
  z-index: ${({ $settingsOpen }) => ($settingsOpen ? 6 : 1)};
  filter: ${({ $disabled }) => ($disabled ? 'grayscale(40%) brightness(0.85)' : 'none')};
  opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};

  &:hover {
    border-color: ${({ $accent }) => $accent};
    transform: translateY(-2px);
  }
`;

const ChannelCardSurface = styled.div<{ $settingsOpen: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  pointer-events: ${({ $settingsOpen }) => ($settingsOpen ? 'none' : 'auto')};
  opacity: ${({ $settingsOpen }) => ($settingsOpen ? 0.25 : 1)};
  transition: opacity 0.2s ease;
`;

const ChannelSettingsOverlay = styled.div`
  position: absolute;
  bottom: calc(100% + 0.9rem);
  left: 0;
  width: 100%;
  display: flex;
  justify-content: flex-start;
  pointer-events: auto;
  z-index: 12;
`;

const ChannelSettingsInner = styled.div`
  backdrop-filter: blur(10px);
  border-radius: 16px;
  overflow: hidden;
  width: 100%;
`;

const ChannelHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
`;

const ChannelAliasRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
`;

const ChannelColorSwatch = styled.span<{ $color: string; $disabled: boolean }>`
  width: 0.75rem;
  height: 2.2rem;
  border-radius: 999px;
  background: ${({ $color }) => $color};
  opacity: ${({ $disabled }) => ($disabled ? 0.45 : 1)};
  box-shadow: 0 0 0 2px rgba(9, 16, 26, 0.92),
    0 0 12px ${({ $color }) => `${$color}55`};
`;

const ChannelAlias = styled.span<{ $disabled: boolean }>`
  font-size: 1.05rem;
  font-weight: 600;
  color: ${({ $disabled }) => ($disabled ? 'rgba(159, 180, 215, 0.55)' : '#eef4ff')};
  transition: color 0.18s ease;
`;

const ChannelHeaderRight = styled.div`
  display: flex;
  align-items: center;
`;

const ChannelActionGroup = styled.div`
  display: flex;
  gap: 0.35rem;
`;

const channelIconButtonStates = css<{ $active?: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  border: 1px solid rgba(110, 140, 190, 0.6);
  background: ${({ $active }) =>
    $active ? 'rgba(47, 76, 126, 0.7)' : 'rgba(17, 28, 46, 0.85)'};
  color: ${({ $active }) => ($active ? '#f1f5ff' : '#b7c6de')};
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;

  &:hover {
    border-color: rgba(144, 178, 241, 0.95);
    color: #fff;
    background: rgba(47, 76, 126, 0.8);
  }
`;

const ChannelIconButton = styled.button<{ $active?: boolean }>`
  ${channelIconButtonStates}
`;

const ChannelValue = styled.div<{ $color: string; $disabled: boolean }>`
  display: flex;
  align-items: baseline;
  gap: 0.45rem;
  font-family: 'Roboto Mono', Consolas, 'SFMono-Regular', ui-monospace, monospace;

  .value {
    font-size: 1.45rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    color: ${({ $color, $disabled }) => ($disabled ? 'rgba(180, 198, 226, 0.48)' : $color)};
    text-shadow: ${({ $color, $disabled }) =>
      $disabled ? 'none' : `0 0 24px ${$color}55`};
  }

  .unit {
    font-size: 0.95rem;
    font-weight: 500;
    color: ${({ $disabled }) => ($disabled ? 'rgba(180, 198, 226, 0.4)' : 'rgba(227, 235, 255, 0.78)')};
    text-transform: none;
  }
`;

const AddChannelCard = styled.button`
  min-width: 190px;
  border-radius: 14px;
  border: 1px dashed rgba(90, 115, 155, 0.6);
  background: rgba(18, 27, 40, 0.8);
  color: #9fb4d7;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0.95rem 1rem 1rem;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease,
    box-shadow 0.2s ease;
  align-self: stretch;
  box-shadow: 0 12px 32px rgba(7, 11, 19, 0.25);

  &:hover {
    color: #d4e2ff;
    border-color: rgba(113, 153, 255, 0.9);
    background: rgba(18, 40, 82, 0.85);
    box-shadow: 0 18px 42px rgba(7, 11, 19, 0.35);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const AddSymbol = styled.span`
  font-size: 1.6rem;
  line-height: 1;
`;

const ChannelStripComponent: React.FC<ChannelStripProps> = ({
  channelReadings,
  channelSettingsDraft,
  channelSettingsError,
  deviceChannelById,
  mathSettingsHelpChannelId,
  isAddDeviceDisabled,
  canAddMathChannel,
  onAddDevice,
  onAddMath,
  onOpenChannelSettings,
  onDisconnectChannel,
  onToggleChannel,
  onToggleMathHelp,
  onSettingsFieldChange,
  onPopoutChange,
  onSettingsCancel,
  onSettingsSubmit,
}) => (
  <ChannelStripRoot>
    {channelReadings.map(({ channel, sample }) => {
      const isEnabled = channel.enabled;
      const isSettingsOpen = channelSettingsDraft?.id === channel.id;
      const draft = isSettingsOpen ? channelSettingsDraft : null;
      const accent = draft?.color ?? channel.color;
      const aliasLabel = draft?.alias ?? channel.alias;
      const effectivePrecision = draft?.precision ?? channel.precision;
      const measurementDisplay = sample
        ? formatMeasurementDisplay(sample.value, sample.unit, effectivePrecision)
        : null;
      const displayValue = measurementDisplay?.valueText ?? '---';
      const unitLabel = measurementDisplay?.unitText
        ?? sample?.unit
        ?? (isMathChannel(channel) ? channel.unit : '');
      const toggleTooltip = isEnabled ? 'Double-click to disable trace' : 'Double-click to enable trace';
      return (
        <ChannelCard
          key={channel.id}
          $disabled={!isEnabled}
          $accent={accent}
          $settingsOpen={isSettingsOpen}
          onDoubleClick={(event) => {
            event.preventDefault();
            onToggleChannel(channel.id);
          }}
          title={toggleTooltip}
        >
          <ChannelCardSurface $settingsOpen={isSettingsOpen}>
            <ChannelHeader>
              <ChannelAliasRow>
                <ChannelColorSwatch $color={accent} $disabled={!isEnabled} />
                <ChannelAlias $disabled={!isEnabled}>{aliasLabel}</ChannelAlias>
              </ChannelAliasRow>
              <ChannelHeaderRight>
                <ChannelActionGroup>
                  <ChannelIconButton
                    type="button"
                    onClick={() => onOpenChannelSettings(channel)}
                    title="Channel settings"
                    aria-label="Channel settings"
                    $active={isSettingsOpen}
                    onDoubleClick={(event) => event.stopPropagation()}
                  >
                    ⚙
                  </ChannelIconButton>
                  <ChannelIconButton
                    type="button"
                    onClick={() => {
                      onDisconnectChannel(channel);
                    }}
                    title="Disconnect channel"
                    aria-label="Disconnect channel"
                    onDoubleClick={(event) => event.stopPropagation()}
                  >
                    ×
                  </ChannelIconButton>
                </ChannelActionGroup>
              </ChannelHeaderRight>
            </ChannelHeader>
            <ChannelValue $color={accent} $disabled={!isEnabled}>
              <span className="value">{displayValue}</span>
              <span className="unit">{unitLabel}</span>
            </ChannelValue>
          </ChannelCardSurface>
          {isSettingsOpen && draft && (
            <ChannelSettingsOverlay
              role="dialog"
              aria-modal="true"
              onDoubleClickCapture={(event) => event.stopPropagation()}
            >
              <ChannelSettingsInner>
                <ChannelSettingsCard
                  channel={channel}
                  draft={draft}
                  error={channelSettingsError}
                  deviceChannelById={deviceChannelById}
                  mathSettingsHelpChannelId={mathSettingsHelpChannelId}
                  onToggleMathHelp={onToggleMathHelp}
                  onSettingsFieldChange={onSettingsFieldChange}
                  onPopoutChange={onPopoutChange}
                  onSettingsCancel={onSettingsCancel}
                  onSettingsSubmit={onSettingsSubmit}
                />
              </ChannelSettingsInner>
            </ChannelSettingsOverlay>
          )}
        </ChannelCard>
      );
    })}
    <AddChannelCard type="button" onClick={onAddDevice} disabled={isAddDeviceDisabled}>
      <AddSymbol>+</AddSymbol>
      Add device
    </AddChannelCard>
    <AddChannelCard
      type="button"
      onClick={onAddMath}
      disabled={!canAddMathChannel}
    >
      <AddSymbol>f(x)</AddSymbol>
      Add math
    </AddChannelCard>
  </ChannelStripRoot>
);

export const ChannelStrip = memo(ChannelStripComponent);
