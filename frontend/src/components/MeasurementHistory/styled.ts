import styled from 'styled-components';
import { clamp01 } from './utils';

type ButtonVariant = 'primary' | 'secondary';
type AxisButtonVariant = 'primary' | 'ghost';

export const Card = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 420px;
  position: relative;
`;

export const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

export const CardTitle = styled.h3`
  margin: 0;
  color: #2c3e50;
  font-size: 1.2rem;
  font-weight: 600;
`;

export const TitleInput = styled.input`
  margin: 0;
  padding: 0.1rem 0.25rem;
  color: #2c3e50;
  font-size: 1.2rem;
  font-weight: 600;
  font-family: inherit;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  min-width: 12rem;
  max-width: 22rem;

  &:focus {
    outline: none;
    border-color: rgba(52, 152, 219, 0.45);
    background: #f2f9ff;
  }
`;

export const Actions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

export const Button = styled.button<{ $variant?: ButtonVariant }>`
  padding: 0.5rem 0.9rem;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  border: none;
  ${({ $variant = 'secondary' }) => ($variant === 'primary'
    ? `background-color: #3498db; color: white; &:hover { background-color: #2980b9; }`
    : `background-color: #ecf0f1; color: #2c3e50; &:hover { background-color: #d0d7de; }`)}
`;

export const ChartContainer = styled.div`
  flex: 1;
  width: 100%;
  min-height: 360px;
`;

export const ChartStage = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`;

export const ZoomOverlayLayer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`;

export const ZoomSelectionBox = styled.div<{
  $left: number;
  $width: number;
  $top: number;
  $height: number;
  $animate: boolean;
  $fading: boolean;
}>`
  position: absolute;
  left: ${({ $left }) => `${clamp01($left) * 100}%`};
  width: ${({ $width }) => `${clamp01($width) * 100}%`};
  top: ${({ $top }) => `${clamp01($top) * 100}%`};
  height: ${({ $height }) => `${clamp01($height) * 100}%`};
  border: 1px solid rgba(86, 143, 255, 0.65);
  background: rgba(86, 143, 255, 0.18);
  border-radius: 3px;
  box-shadow: 0 0 12px rgba(86, 143, 255, 0.18);
  transition: ${({ $animate }) => ($animate ? 'left 160ms ease, width 160ms ease, opacity 180ms ease' : 'none')};
  opacity: ${({ $width, $height, $fading }) => (($width > 0 && $height > 0) ? ($fading ? 0 : 1) : 0)};
`;

export const NoDataMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6c757d;
  font-size: 1.05rem;
`;

export const CursorInfo = styled.div`
  margin-top: 0.75rem;
  padding: 0.75rem;
  border-radius: 6px;
  background: #f4f6f7;
  color: #34495e;
  font-size: 0.9rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.5rem;
`;

export const CursorCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

export const CursorHeading = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
`;

export const ExportLegend = styled.div<{ $visible: boolean }>`
  position: absolute;
  right: 1.5rem;
  top: 1.5rem;
  display: ${({ $visible }) => ($visible ? 'flex' : 'none')};
  flex-direction: column;
  gap: 0.4rem;
  background: #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.45);
  border-radius: 8px;
  padding: 0.6rem 1rem 0.75rem;
  box-shadow: 0 12px 20px rgba(15, 23, 42, 0.18);
  z-index: 6;
  min-width: 12rem;
  pointer-events: ${({ $visible }) => ($visible ? 'auto' : 'none')};
  &::before {
    content: 'Traces';
    font-size: 0.8rem;
    font-weight: 700;
    color: #1f2937;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
`;

export const ExportLegendRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.9rem;
  color: #1f2937;
  font-weight: 600;
`;

export const ExportLegendSwatch = styled.span<{ $color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.95), 0 0 0 3px rgba(15, 23, 42, 0.2);
  flex-shrink: 0;
`;

export const ExportLegendLabel = styled.span`
  white-space: nowrap;
  color: #1f2937;
`;

export const CursorTime = styled.span`
  font-family: 'Roboto Mono', 'SFMono-Regular', monospace;
  font-size: 0.82rem;
  color: #5a6d85;
`;

export const CursorSeriesList = styled.div`
  margin-top: 0.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

export const CursorSeriesRow = styled.div<{ $highlight?: boolean }>`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  font-size: 0.78rem;
  color: ${({ $highlight }) => ($highlight ? '#1d2735' : '#5a6d85')};
  font-weight: ${({ $highlight }) => ($highlight ? 600 : 500)};
`;

export const CursorSeriesLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
`;

export const CursorSeriesSwatch = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
`;

export const CursorSeriesAlias = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const CursorTraceSelector = styled.label`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: #2c3e50;
`;

export const CursorTraceControlRow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
`;

export const CursorTraceSwatch = styled.span<{ $color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.18);
  flex-shrink: 0;
`;

export const CursorTraceSelect = styled.select<{ $color: string }>`
  border: 1px solid #c5ced8;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  font-size: 0.85rem;
  color: ${({ $color }) => $color};
  background: #ffffff;
  min-width: 180px;
`;

export const AxisScaleBackdrop = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(12, 18, 26, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
`;

export const AxisScaleDialog = styled.div`
  width: min(360px, 90%);
  background: rgba(12, 20, 32, 0.98);
  border-radius: 14px;
  border: 1px solid rgba(120, 159, 221, 0.35);
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.35);
  padding: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  color: #e4ecff;
`;

export const AxisScaleTitle = styled.h4`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
`;

export const AxisScaleField = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: rgba(198, 212, 238, 0.85);
`;

export const AxisScaleInput = styled.input`
  border-radius: 8px;
  border: 1px solid rgba(120, 159, 221, 0.4);
  background: rgba(9, 15, 24, 0.85);
  color: #f2f6ff;
  padding: 0.45rem 0.6rem;
  font-size: 0.85rem;
  outline: none;

  &:focus {
    border-color: rgba(86, 143, 255, 0.9);
    box-shadow: 0 0 0 2px rgba(86, 143, 255, 0.25);
  }
`;

export const AxisScaleActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
`;

export const AxisScaleButton = styled.button<{ $variant?: AxisButtonVariant }>`
  border-radius: 8px;
  border: ${({ $variant = 'ghost' }) => ($variant === 'ghost' ? '1px solid rgba(198, 212, 238, 0.45)' : 'none')};
  background: ${({ $variant = 'ghost' }) => ($variant === 'ghost' ? 'transparent' : 'linear-gradient(135deg, rgba(62, 157, 255, 0.95), rgba(94, 167, 255, 0.95))')};
  color: ${({ $variant = 'ghost' }) => ($variant === 'ghost' ? 'rgba(226, 237, 255, 0.9)' : '#0b1628')};
  font-weight: 600;
  padding: 0.45rem 0.9rem;
  cursor: pointer;
  font-size: 0.85rem;

  &:hover {
    background: ${({ $variant = 'ghost' }) => ($variant === 'ghost' ? 'rgba(198, 212, 238, 0.15)' : 'linear-gradient(135deg, rgba(62, 157, 255, 1), rgba(94, 167, 255, 1))')};
  }
`;

export const AxisScaleError = styled.div`
  color: #ff8787;
  font-size: 0.78rem;
`;
