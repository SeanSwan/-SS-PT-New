/**
 * ============================================================================
 * FILE: chartCapture.ts
 * PURPOSE: Captures chart DOM elements to image blobs for social sharing
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Uses html2canvas to screenshot a chart card element,
 * applies SwanStudios branding overlay, and returns a File object ready for
 * upload via the social feed FormData pipeline.
 *
 * HOW IT FITS IN THE APP: ChartCard → captureChart() → File → useSocialFeed.createPost()
 */

import html2canvas from 'html2canvas';

// ─────────────────────────────────────────────────────────────
// SECTION: Chart Capture
// PURPOSE: Convert a DOM element to a branded PNG File
// ─────────────────────────────────────────────────────────────

/**
 * Captures a chart DOM element as a PNG File with SwanStudios branding.
 * @param element - The DOM element to capture (typically a ChartCard div)
 * @param chartTitle - Title to embed in the filename and branding watermark
 * @returns A File object ready for FormData upload, or null on failure
 */
export async function captureChartAsImage(
  element: HTMLElement,
  chartTitle: string
): Promise<File | null> {
  try {
    // Temporarily remove 3D transforms for clean capture
    const originalTransform = element.style.transform;
    element.style.transform = 'none';

    const canvas = await html2canvas(element, {
      backgroundColor: '#002060',
      scale: 2,
      useCORS: true,
      logging: false,
      // Ignore buttons/controls inside the chart card
      ignoreElements: (el) => {
        return el.hasAttribute('data-no-capture');
      },
    });

    // Restore original transform
    element.style.transform = originalTransform;

    // Add SwanStudios watermark
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = '600 14px Sora, sans-serif';
      ctx.fillStyle = 'rgba(96, 192, 240, 0.6)';
      ctx.textAlign = 'right';
      ctx.fillText('SwanStudios', canvas.width - 20, canvas.height - 14);
    }

    // Convert canvas to blob then File
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png', 0.95);
    });

    if (!blob) return null;

    const safeName = chartTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    return new File([blob], `swanstudios-${safeName}-${Date.now()}.png`, {
      type: 'image/png',
    });
  } catch (err) {
    console.error('Chart capture failed:', err);
    return null;
  }
}
