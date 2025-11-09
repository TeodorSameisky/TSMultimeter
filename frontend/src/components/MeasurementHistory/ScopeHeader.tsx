import React from 'react';
import {
  Actions,
  Button,
  CardHeader,
  TitleInput,
  CursorTraceSelector,
  CursorTraceControlRow,
  CursorTraceSwatch,
  CursorTraceSelect,
} from './styled';

export type CursorTraceOption = {
  key: string;
  label: string;
  color: string;
};

export type ScopeHeaderProps = {
  scopeTitle: string;
  onTitleChange: (value: string) => void;
  onTitleBlur: () => void;
  cursorTraceKey: string;
  cursorTraceOptions: CursorTraceOption[];
  currentTraceColor: string;
  onCursorTraceChange: (value: string) => void;
  isPaused: boolean;
  onPauseToggle: () => void;
  onAutoFit: () => void;
  onResetCursors: () => void;
  onExportImage: () => void;
  isExportingImage: boolean;
  onExportCsv: () => void;
  canExportCsv: boolean;
  onClearHistory: () => void;
};

/**
 * Collects the scope title input and command buttons in a single, focused
 * presentational component so the container can concentrate on interaction
 * logic.
 */
export const ScopeHeader: React.FC<ScopeHeaderProps> = ({
  scopeTitle,
  onTitleChange,
  onTitleBlur,
  cursorTraceKey,
  cursorTraceOptions,
  currentTraceColor,
  onCursorTraceChange,
  isPaused,
  onPauseToggle,
  onAutoFit,
  onResetCursors,
  onExportImage,
  isExportingImage,
  onExportCsv,
  canExportCsv,
  onClearHistory,
}) => (
  <CardHeader>
    <TitleInput
      value={scopeTitle}
      onChange={(event) => onTitleChange(event.target.value)}
      onBlur={onTitleBlur}
      maxLength={80}
      aria-label="Scope title"
      placeholder="Measurement Scope"
    />
    <Actions data-export-ignore="true">
      <CursorTraceSelector>
        <span>Cursor Trace</span>
        <CursorTraceControlRow>
          <CursorTraceSwatch $color={currentTraceColor} />
          <CursorTraceSelect
            value={cursorTraceKey}
            onChange={(event) => onCursorTraceChange(event.target.value)}
            $color={currentTraceColor}
          >
            <option value="auto">Auto (follow pointer)</option>
            {cursorTraceOptions.map((option) => (
              <option
                key={option.key}
                value={option.key}
                style={{ color: option.color }}
              >
                {option.label}
              </option>
            ))}
          </CursorTraceSelect>
        </CursorTraceControlRow>
      </CursorTraceSelector>
      <Button onClick={onPauseToggle} $variant={isPaused ? 'primary' : 'secondary'}>
        {isPaused ? 'Resume' : 'Pause'}
      </Button>
      <Button onClick={onAutoFit}>Auto Fit</Button>
      <Button onClick={onResetCursors}>Clear Cursors</Button>
      <Button
        onClick={onExportImage}
        disabled={isExportingImage}
        aria-busy={isExportingImage}
        type="button"
      >
        {isExportingImage ? 'Exporting…' : 'Export Image'}
      </Button>
      <Button onClick={onExportCsv} disabled={!canExportCsv}>Export CSV</Button>
      <Button onClick={onClearHistory}>Clear All</Button>
    </Actions>
  </CardHeader>
);
