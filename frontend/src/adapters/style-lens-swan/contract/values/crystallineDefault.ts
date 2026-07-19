/**
 * Swan Lens — the Crystalline default world-role VALUE table (S1-A / blueprint §3.B).
 *
 * The ONLY place Slice-1 world-role hex lives. Every value restates or derives from the
 * Crystalline Swan theme tokens (--bg-base / --bg-surface / --ice-wing / --frost-white /
 * --accent-primary / --obsidian-black / --carbon). Contrast ratios are asserted in
 * designValueGuard.test.ts (AT-1) via WCAG 2.x relative luminance.
 *
 * No retired-palette literal appears here (guard rule R2 rejects the retired deep-bg / neon-cyan /
 * wing-purple triple and named aqua/cyan). Per-lens world-role differentiation is Slice-3 work; in Slice-1
 * every manifest maps to THIS default table (see values/index.ts).
 */
import type { LensWorldRoleValues } from '../lensValues.types';

export const CRYSTALLINE_DEFAULT_WORLD_VALUES: LensWorldRoleValues = Object.freeze({
  // --bg-base / --obsidian-black
  bg: { value: '#0a0a0f', kind: 'color' },
  // --bg-surface / --carbon
  panel: { value: '#141419', kind: 'color' },
  // --ice-wing / --accent-primary — on panel ≈ 9.0:1 (≥ 3.0 graphic)
  accent: { value: '#60c0f0', kind: 'color' },
  // --frost-white — on bg ≈ 16.4:1, on panel ≈ 15.3:1
  text: { value: '#e0ecf4', kind: 'color' },
  // frost-white dimmed over bg-surface — on panel ≈ 6.9:1 (≥ 4.5 body text)
  muted: { value: '#99a0a7', kind: 'color' },
  // --accent-primary — CTA; with proposed on-action #0a0a0f ≈ 9.7:1
  action: { value: '#60c0f0', kind: 'color' },
  // obsidian-based elevation paint
  shadow: { value: '0 8px 24px rgba(10,10,15,0.55)', kind: 'shadow' },
  radius: { value: '16px', kind: 'length' },
});
