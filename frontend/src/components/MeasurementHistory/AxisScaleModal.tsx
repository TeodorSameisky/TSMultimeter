import React from 'react';
import type { AxisEditorState } from './types';
import {
  AxisScaleBackdrop,
  AxisScaleDialog,
  AxisScaleTitle,
  AxisScaleField,
  AxisScaleInput,
  AxisScaleError,
  AxisScaleActions,
  AxisScaleButton,
} from './styled';

export interface AxisScaleModalProps {
  editor: AxisEditorState;
  onChange: (field: 'min' | 'max', value: string) => void;
  onAuto: () => void;
  onClose: () => void;
  onApply: () => void;
}

export const AxisScaleModal: React.FC<AxisScaleModalProps> = ({
  editor,
  onChange,
  onAuto,
  onClose,
  onApply,
}) => (
  <AxisScaleBackdrop onClick={onClose}>
    <AxisScaleDialog onClick={(event) => event.stopPropagation()}>
      <AxisScaleTitle>{editor.unit} scaling</AxisScaleTitle>
      <AxisScaleField>
        <span>Minimum</span>
        <AxisScaleInput
          type="number"
          inputMode="decimal"
          step="any"
          value={editor.min}
          onChange={(event) => onChange('min', event.target.value)}
        />
      </AxisScaleField>
      <AxisScaleField>
        <span>Maximum</span>
        <AxisScaleInput
          type="number"
          inputMode="decimal"
          step="any"
          value={editor.max}
          onChange={(event) => onChange('max', event.target.value)}
        />
      </AxisScaleField>
      {editor.error ? <AxisScaleError>{editor.error}</AxisScaleError> : null}
      <AxisScaleActions>
        <AxisScaleButton type="button" onClick={onAuto}>
          Auto scale
        </AxisScaleButton>
        <AxisScaleButton type="button" onClick={onClose}>
          Cancel
        </AxisScaleButton>
        <AxisScaleButton type="button" $variant="primary" onClick={onApply}>
          Apply
        </AxisScaleButton>
      </AxisScaleActions>
    </AxisScaleDialog>
  </AxisScaleBackdrop>
);
