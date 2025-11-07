import { memo } from 'react';
import type { FormEvent } from 'react';
import type { ChannelWizardFormState } from '../../types/channel.ts';
import type { DeviceTypeOption, DeviceTypeOptionValue } from '../../types/devices.ts';
import {
  ErrorNote,
  FormGroup,
  GhostButton,
  Input,
  ModalActions,
  ModalTitle,
  PrimaryButton,
  Select,
} from '../common/ModalPrimitives.ts';

type ChannelWizardProps = {
  form: ChannelWizardFormState;
  availablePorts: string[];
  isLinking: boolean;
  isBusy: boolean;
  errorMessage: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onRefreshPorts: () => void;
  onChangeDeviceType: (deviceType: DeviceTypeOptionValue) => void;
  onChangePort: (port: string) => void;
  onChangeAlias: (alias: string) => void;
  deviceTypeOptions: readonly DeviceTypeOption[];
};

const ChannelWizardComponent: React.FC<ChannelWizardProps> = ({
  form,
  availablePorts,
  isLinking,
  isBusy,
  errorMessage,
  onSubmit,
  onClose,
  onRefreshPorts,
  onChangeDeviceType,
  onChangePort,
  onChangeAlias,
  deviceTypeOptions,
}) => {
  const requiresPort = form.deviceType !== 'Mock';
  const disableSubmit = isLinking || isBusy || (requiresPort && !form.port);
  const disablePortSelect = isLinking || availablePorts.length === 0;
  const disableDeviceSelect = isLinking || deviceTypeOptions.length === 0;

  return (
    <>
      <ModalTitle>Connect a device channel</ModalTitle>
      <form onSubmit={onSubmit}>
        {errorMessage && <ErrorNote>{errorMessage}</ErrorNote>}

        <FormGroup>
          Device type
          <Select
            value={form.deviceType}
            onChange={(event) => onChangeDeviceType(event.target.value as DeviceTypeOptionValue)}
            disabled={disableDeviceSelect}
          >
            {deviceTypeOptions.length === 0 ? (
              <option value="">No device types available</option>
            ) : (
              deviceTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            )}
          </Select>
        </FormGroup>

        {requiresPort && (
          <FormGroup>
            Serial port
            <Select
              value={form.port}
              onChange={(event) => onChangePort(event.target.value)}
              disabled={disablePortSelect}
            >
              {availablePorts.length === 0 ? (
                <option value="">No ports detected</option>
              ) : (
                availablePorts.map((port) => (
                  <option key={port} value={port}>
                    {port}
                  </option>
                ))
              )}
            </Select>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <small style={{ color: '#9fb2d0' }}>
                Make sure the instrument is connected over USB/serial.
              </small>
              <GhostButton
                type="button"
                onClick={() => onRefreshPorts()}
                disabled={isLinking || isBusy}
                style={{ padding: '0.35rem 0.75rem' }}
              >
                Refresh ports
              </GhostButton>
            </div>
          </FormGroup>
        )}

        <FormGroup>
          Channel name
          <Input
            value={form.alias}
            onChange={(event) => onChangeAlias(event.target.value)}
            placeholder="e.g. VOUT"
            required
            disabled={isLinking}
          />
        </FormGroup>

        <ModalActions>
          <GhostButton type="button" onClick={onClose} disabled={isLinking || isBusy}>
            Cancel
          </GhostButton>
          <PrimaryButton type="submit" disabled={disableSubmit}>
            {isLinking ? 'Adding…' : 'Add device'}
          </PrimaryButton>
        </ModalActions>
      </form>
    </>
  );
};

export const ChannelWizard = memo(ChannelWizardComponent);
