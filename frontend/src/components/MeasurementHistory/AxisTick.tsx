import React from 'react';
import type { AxisTickComponentProps } from './types';

export const AxisTick: React.FC<AxisTickComponentProps> = ({
  x,
  y,
  payload,
  unit,
  color,
  onDoubleClick,
  formattedValue,
}) => {
  const value = formattedValue ?? (payload?.value ?? '');
  return (
    <g
      transform={`translate(${x}, ${y})`}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onDoubleClick(unit);
      }}
      style={{ cursor: 'pointer' }}
    >
      <text
        x={-6}
        y={0}
        dy={4}
        textAnchor="end"
        fill={color}
        fontSize={12}
        style={{ userSelect: 'none' }}
      >
        {value}
      </text>
    </g>
  );
};
