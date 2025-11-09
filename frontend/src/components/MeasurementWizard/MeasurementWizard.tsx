import { memo } from 'react';
import type { FormEvent } from 'react';
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

type MeasurementChannelOption = {
  id: string;
  label: string;
  group: 'device' | 'math';
};

type MeasurementWizardProps = {
  channelOptions: MeasurementChannelOption[];
  form: MeasurementFormState;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onChangeChannel: (channelId: string) => void;
  onChangeKind: (kind: MeasurementKind) => void;
};

const MeasurementWizardComponent: React.FC<MeasurementWizardProps> = ({
  channelOptions,
  form,
  onSubmit,
  onClose,
  onChangeChannel,
  onChangeKind,
}) => (
  <>
    <ModalTitle>Add scope measurement</ModalTitle>
    <form onSubmit={onSubmit}>
      <FormGroup>
        Channel source
        <Select
          value={form.channelId}
          onChange={(event) => onChangeChannel(event.target.value)}
          required
          disabled={channelOptions.length === 0}
        >
          <option value="" disabled>Select a channel</option>
          {(['device', 'math'] as const).map((group) => {
            const groupItems = channelOptions.filter((option) => option.group === group);
            if (groupItems.length === 0) {
              return null;
            }
            const label = group === 'device' ? 'Device channels' : 'Math channels';
            return (
              <optgroup key={group} label={label}>
                {groupItems.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            );
          })}
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
        <PrimaryButton type="submit" disabled={!form.channelId}>
          Add measurement
        </PrimaryButton>
      </ModalActions>
    </form>
  </>
);

export const MeasurementWizard = memo(MeasurementWizardComponent);
