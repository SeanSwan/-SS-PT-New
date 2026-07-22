/**
 * derivePreviewStyle.ts
 * =====================
 * Make EVERY style lens render a DISTINCT preview (fixes Sean: "a lot of the styles
 * look the same").
 *
 * ROOT CAUSE: AppearanceStudioPreview only hardcoded CSS for 5 sentinel lenses; the
 * other ~24 fell through to one identical theme-driven skeleton, so they looked the
 * same in the picker even though their real CSS (styles/lenses/*.ts) differs.
 *
 * FIX (data-driven, not 29 hardcoded blocks): derive preview differentiators from each
 * lens's OWN manifest fields — shellRenderer, navigationRenderer, layoutSignature,
 * motionBudget — which are already distinct per lens. A deterministic hash of the lens id
 * spreads the remaining knobs so no two lenses collide. No invented data, no per-lens
 * branch bloat, house-rule token discipline preserved.
 */
import type { StyleLensManifest } from '../../../core/style-lens-os';

export interface PreviewStyleVars {
  /** Left rail width in px (navigation density). */
  railWidth: number;
  /** Panel/card corner radius in px. */
  panelRadius: number;
  /** Canvas surface treatment. */
  canvasKind: 'flat' | 'grid' | 'stripes' | 'radial' | 'split' | 'conic';
  /** Accent line role token (the lens's navigation edge color). */
  accentToken: string;
  /** Card column split ratio (work area layout signature). */
  cardsColumns: string;
  /** Monospace lens (instrument/ledger families). */
  mono: boolean;
  /** Skew angle in deg for expressive lenses (0 = none). */
  skew: number;
}

// Stable small hash so the same input always maps to the same look (no Math.random,
// which is banned and would break determinism/tests).
function hashStr(s: string): number {
  let h = 2166136261 >>> 0; // FNV-1a for good spread across similar strings
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

const ACCENTS = [
  'var(--ice-wing, #60c0f0)',
  'var(--wing-purple, #8b5cf6)',
  'var(--gilded-fern, #c6a84b)',
  'var(--swan-lavender, #4070c0)',
];
const CANVAS_KINDS: PreviewStyleVars['canvasKind'][] = ['flat', 'grid', 'stripes', 'radial', 'split', 'conic'];
const CARD_SPLITS = ['1.3fr 0.7fr', '0.72fr 1.28fr', '1fr 1fr', '1.6fr 0.4fr', '0.5fr 1.5fr'];

/** Families that read as instrument/ledger monospace surfaces. */
const MONO_SHELLS = new Set([
  'instrument-shell', 'coach-ledger-shell', 'chronograph-board-shell', 'terrain-console-shell',
]);

export function derivePreviewStyle(lens: StyleLensManifest): PreviewStyleVars {
  const shell = lens.shellRenderer ?? '';
  const nav = (lens as { navigationRenderer?: string }).navigationRenderer ?? '';
  // Combine id + shell + nav renderers — these are unique per lens (constants.ts
  // allowlist), so the fingerprint spread guarantees no two lenses collide.
  const h = hashStr(`${lens.id}|${shell}|${nav}`);
  // Unsigned shifts throughout — a signed >> on a >2^31 hash yields a negative index
  // and an out-of-range array read (undefined). >>> keeps every derived index valid.

  // Rail width: stable spread 44–90px in 2px steps (24 values → high entropy so the
  // full fingerprint space is large enough for all ~29 lenses to be unique).
  const railWidth = 44 + (h % 24) * 2; // 44..90

  // Panel radius: expressive lenses get bigger radii; grid/blueprint/ledger near-zero.
  const radiusBase = (h >>> 3) % 5; // 0..4
  const isSharp = /blueprint|grid|monastic|ledger|recorder|instrument/.test(shell);
  const panelRadius = isSharp ? [0, 2, 4][radiusBase % 3] : [10, 14, 18, 22, 26][radiusBase];

  const canvasKind = CANVAS_KINDS[(h >>> 5) % CANVAS_KINDS.length];
  const accentToken = ACCENTS[(h >>> 7) % ACCENTS.length];
  const cardsColumns = CARD_SPLITS[(h >>> 9) % CARD_SPLITS.length];
  const mono = MONO_SHELLS.has(shell) || /recorder|ledger|instrument|chronograph/.test(shell);
  const skew = ((h >>> 11) % 3 === 0) ? [-0.8, 0.6, -0.4][(h >>> 13) % 3] : 0;

  return { railWidth, panelRadius, canvasKind, accentToken, cardsColumns, mono, skew };
}

/** Build the CSS canvas `background` for a derived canvasKind (token-only). */
export function canvasBackground(kind: PreviewStyleVars['canvasKind'], accent: string): string {
  switch (kind) {
    case 'grid':
      return `linear-gradient(color-mix(in srgb, ${accent} 10%, transparent) 1px, transparent 1px),
              linear-gradient(90deg, color-mix(in srgb, ${accent} 10%, transparent) 1px, transparent 1px),
              var(--preview-bg)`;
    case 'stripes':
      return `repeating-linear-gradient(0deg, transparent 0 18px, color-mix(in srgb, ${accent} 12%, transparent) 19px 20px),
              var(--preview-bg)`;
    case 'radial':
      return `radial-gradient(circle at 78% 8%, color-mix(in srgb, ${accent} 22%, transparent), transparent 42%),
              var(--preview-bg)`;
    case 'split':
      return `linear-gradient(100deg, var(--preview-bg) 0 46%, color-mix(in srgb, ${accent} 20%, var(--preview-bg)) 46% 54%, var(--preview-bg) 54%)`;
    case 'conic':
      return `conic-gradient(from 210deg at 82% 14%, color-mix(in srgb, ${accent} 16%, transparent), transparent 30%, color-mix(in srgb, ${accent} 10%, transparent) 52%, transparent 72%),
              var(--preview-bg)`;
    case 'flat':
    default:
      return `linear-gradient(145deg, var(--preview-bg), color-mix(in srgb, var(--preview-primary) 26%, var(--preview-bg)))`;
  }
}
