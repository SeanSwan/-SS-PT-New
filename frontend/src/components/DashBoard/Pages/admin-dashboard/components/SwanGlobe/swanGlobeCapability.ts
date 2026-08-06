/**
 * swanGlobeCapability — the gate that decides whether the Three.js chunk is
 * fetched AT ALL (SWA-138 S12, HY3 B2 "conditional import, not just lazy").
 *
 * A phone must never download ~600KB of WebGL for a picture it won't animate,
 * so this runs BEFORE the dynamic import — not inside the component.
 */

export interface GlobeCapability {
  /** True only when the Three.js chunk should be fetched. */
  enabled: boolean;
  reason: 'ok' | 'coarse-pointer' | 'small-viewport' | 'no-webgl' | 'reduced-motion' | 'ssr';
}

const MIN_DESKTOP_WIDTH = 1024;

export function detectWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2') || canvas.getContext('webgl'),
    );
  } catch {
    return false;
  }
}

export function resolveGlobeCapability(): GlobeCapability {
  if (typeof window === 'undefined') return { enabled: false, reason: 'ssr' };

  // Coarse pointer = touch device: the globe's value is drag-explore, and the
  // SVG map + ranked table serve that audience better at zero bundle cost.
  if (window.matchMedia?.('(pointer: coarse)').matches) {
    return { enabled: false, reason: 'coarse-pointer' };
  }
  if (window.innerWidth < MIN_DESKTOP_WIDTH) {
    return { enabled: false, reason: 'small-viewport' };
  }
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    // M1 licence + reduced motion: render the static authored surface instead.
    return { enabled: false, reason: 'reduced-motion' };
  }
  if (!detectWebGL()) {
    return { enabled: false, reason: 'no-webgl' };
  }
  return { enabled: true, reason: 'ok' };
}
