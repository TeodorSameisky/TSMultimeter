const CHANNEL_COLOR_PALETTE = [
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#9b59b6',
  '#f39c12',
  '#1abc9c',
  '#d35400',
  '#34495e',
  '#8e44ad',
  '#16a085',
];

/**
 * Picks a colour for a new channel from the predefined palette ensuring minimal
 * duplication. The helper tracks previously used colours and falls back to an
 * indexed pick when the palette is exhausted.
 */
export const pickChannelColor = (usedColors: Set<string>, preferred?: string) => {
  if (preferred && !usedColors.has(preferred)) {
    usedColors.add(preferred);
    return preferred;
  }

  for (const color of CHANNEL_COLOR_PALETTE) {
    if (!usedColors.has(color)) {
      usedColors.add(color);
      return color;
    }
  }

  const fallback = CHANNEL_COLOR_PALETTE[usedColors.size % CHANNEL_COLOR_PALETTE.length]
    ?? CHANNEL_COLOR_PALETTE[0]
    ?? '#95a5a6';
  usedColors.add(fallback);
  return fallback;
};
