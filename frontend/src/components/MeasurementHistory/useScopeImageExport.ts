import { useCallback, useState } from 'react';

const waitForNextFrame = () => new Promise<void>((resolve) => {
  requestAnimationFrame(() => resolve());
});

/**
 * Provides an imperative helper for exporting the measurement scope as an image.
 * The hook encapsulates the html-to-image import and guards against concurrent
 * export requests so callers can simply trigger {@link exportImage}.
 */
export const useScopeImageExport = (scopeTitle: string) => {
  const [isExporting, setIsExporting] = useState(false);

  const exportImage = useCallback(async (target: HTMLElement | null) => {
    if (isExporting || !target) {
      return false;
    }

    try {
      setIsExporting(true);
      await waitForNextFrame();
      await waitForNextFrame();
      await waitForNextFrame();

      const { toPng } = await import('html-to-image');
      const pixelRatio = window.devicePixelRatio || 1;
      const dataUrl = await toPng(target, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: Math.max(pixelRatio, 1.5),
        filter: (node) => {
          if (!(node instanceof HTMLElement)) {
            return true;
          }
          return !('exportIgnore' in node.dataset);
        },
      });

      const sanitizedTitle = scopeTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'measurement-scope';
      const anchor = document.createElement('a');
      anchor.href = dataUrl;
      anchor.download = `${sanitizedTitle}-${Date.now()}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      return true;
    } catch (error) {
      console.error('Failed to export scope image', error);
      return false;
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, scopeTitle]);

  return {
    isExporting,
    exportImage,
  } as const;
};
