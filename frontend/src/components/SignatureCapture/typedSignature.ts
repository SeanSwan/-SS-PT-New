/**
 * typedSignature — Phase 5W-G (accessibility rebuild)
 * ===================================================
 * Helpers for the "Type" signature mode of <SignaturePad />.
 *
 * A typed signature must still produce the SAME artifact shape the backend
 * already stores for drawn signatures (a PNG data URL), so the waiver record
 * always contains a visual signature image regardless of how it was captured.
 *
 * Also exposes `resolveToken`, which reads a CSS custom property off a live
 * element so canvas drawing (which cannot use `var()`) still honours the
 * Crystalline Swan theme instead of hardcoding colors.
 */

/** Shared cursive stack — used by both the CSS preview and the canvas render. */
export const SCRIPT_FONT_STACK =
  "'Brush Script MT', 'Segoe Script', 'Snell Roundhand', 'Apple Chancery', 'Cormorant Garamond', cursive";

export interface TypedSignatureOptions {
  /** Logical canvas width in px. Default 600. */
  width?: number;
  /** Logical canvas height in px. Default 200. */
  height?: number;
  /** Ink color. Default Ice Wing. */
  penColor?: string;
  /** Mime type passed through to `canvas.toDataURL`. Default 'image/png'. */
  type?: string;
}

/**
 * Read a CSS custom property from an element's computed style.
 * Returns `fallback` when the token is unset or empty.
 */
export function resolveToken(el: Element | null, token: string, fallback: string): string {
  if (!el || typeof window === 'undefined') return fallback;
  try {
    const value = window.getComputedStyle(el).getPropertyValue(token).trim();
    return value || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Render a typed name onto an offscreen canvas in a script font and return a
 * data URL. Background stays transparent to match drawn-mode output.
 * Returns '' for an empty/whitespace-only name.
 */
export function renderTypedSignature(name: string, options: TypedSignatureOptions = {}): string {
  const text = name.trim();
  if (!text) return '';

  const {
    width = 600,
    height = 200,
    penColor = '#60C0F0',
    type = 'image/png',
  } = options;

  const canvas = document.createElement('canvas');
  const ratio = Math.max(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
  canvas.width = width * ratio;
  canvas.height = height * ratio;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.scale(ratio, ratio);

  // Shrink the font until the name fits the usable width.
  const maxWidth = width * 0.88;
  let fontSize = Math.round(height * 0.42);
  const setFont = (size: number) => {
    ctx.font = `italic ${size}px ${SCRIPT_FONT_STACK}`;
  };
  setFont(fontSize);
  while (fontSize > 12 && ctx.measureText(text).width > maxWidth) {
    fontSize -= 2;
    setFont(fontSize);
  }

  ctx.fillStyle = penColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2, maxWidth);

  return canvas.toDataURL(type);
}
