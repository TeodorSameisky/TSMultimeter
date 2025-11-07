import { memo } from 'react';
import type { FormEvent } from 'react';
import type { DeviceInfo } from '../../hooks/useDevice.ts';
import type { MeasurementFormState, MeasurementKind } from '../../types/measurement.ts';
import { MEASUREMENT_KIND_LABELS } from '../../types/measurement.ts';
import {
  FormGroup,
  GhostButton,
  ModalActions,
  ModalTitle,
  PrimaryButton,
  Select,
} from '../common/ModalPrimitives.ts';

type MeasurementWizardProps = {
  devices: DeviceInfo[];
  form: MeasurementFormState;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onChangeDevice: (deviceId: string) => void;
  onChangeKind: (kind: MeasurementKind) => void;
};

const MeasurementWizardComponent: React.FC<MeasurementWizardProps> = ({
  devices,
  form,
  onSubmit,
  onClose,
  onChangeDevice,
  onChangeKind,
}) => (
  <>
    <ModalTitle>Add scope measurement</ModalTitle>
    <form onSubmit={onSubmit}>
      <FormGroup>
        Device source
        <Select
          value={form.deviceId}
          onChange={(event) => onChangeDevice(event.target.value)}
          required
          disabled={devices.length === 0}
        >
          <option value="" disabled>Select a device</option>
          {devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.model} ({device.deviceType})
            </option>
          ))}
        </Select>
      </FormGroup>

      <FormGroup>
        Measurement type
        <Select
          value={form.kind}
          onChange={(event) => onChangeKind(event.target.value as MeasurementKind)}
        >
          {Object.entries(MEASUREMENT_KIND_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </FormGroup>

      <ModalActions>
        <GhostButton type="button" onClick={onClose}>
          Cancel
        </GhostButton>
        <PrimaryButton type="submit" disabled={!form.deviceId}>
          Add measurement
        </PrimaryButton>
      </ModalActions>
    </form>
  </>
);

export const MeasurementWizard = memo(MeasurementWizardComponent);
