/**
 * ============================================================================
 * SURFACE + CHART REPRESENTATION — Slice W0.2 (the two token-only axes,
 * promoted to real FORM axes)
 * ============================================================================
 * WHY THIS FILE EXISTS (hostile-review finding, 2026-07-29): `surface.card`
 * and `chart.progress` are 2 of the 6 axes the distinctness metric
 * (`whatChanged`/`changedAxisCount`) counts — but no `.lens2-surface` /
 * `.lens2-chart` element existed, so BOTH axes rendered nothing. Two worlds
 * could clear the ≥3-axis gate while being visually near-identical (the exact
 * "25 greys" failure the World Ledger's phenomenon-uniqueness rule exists to
 * prevent). `conceptShared.styles.ts` now hangs the two hooks off `Panel` and
 * `ReadinessDial`; this file gives every vocabulary variant a real form.
 *
 * DISCIPLINE — form, never token duplication. Tokens already own
 * `--world-panel-radius` / `--world-panel` / `--world-accent` / `--world-shadow`
 * / `--world-dial-radius`. A rule here that restated a token value would (same
 * specificity, later source order) silently OVERRIDE that token for every
 * future world using the variant. So these rules only touch properties NO
 * token controls: border width/style, backdrop-filter, clip-path, overlay
 * background-image, box-shadow STRUCTURE, footprint, and the dial's ring
 * thickness (`::after` inset).
 *
 * DATA SAFETY: `ReadinessDial`'s conic-gradient encodes the readiness % — it is
 * the DATA channel. Variants reshape geometry only; none replaces `background`.
 * Rule 43: composed into a styled-component, so `css` helper is required.
 * Rule 6: every color is `var(--token, #fallback)`.
 * ============================================================================
 */
import { css } from 'styled-components';

export const surfaceChartRepresentationStyles = css`
  /* ── surface.card — the panel MATERIAL ───────────────────────────── */

  /* playful: pillowy, lifted, saturated glass. */
  &[data-lens2-surface='floating-candy'] .lens2-surface {
    border-width: 2px;
    backdrop-filter: blur(20px) saturate(140%);
    box-shadow:
      0 22px 54px color-mix(in srgb, var(--world-accent, #8b5cf6) 26%, transparent),
      inset 0 1px 0 color-mix(in srgb, var(--world-text, #e0ecf4) 22%, transparent);
  }

  /* technical: machined plate — a cut corner facet, no blur, no lift. */
  &[data-lens2-surface='faceted-console'] .lens2-surface {
    border-width: 1px;
    backdrop-filter: none;
    clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%);
    box-shadow: none;
  }

  /* luxe: heavy frost behind a double chrome edge. */
  &[data-lens2-surface='frosted-vault'] .lens2-surface {
    border-width: 1px;
    backdrop-filter: blur(26px) brightness(1.06);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--world-accent, #c6a84b) 44%, transparent),
      inset 0 0 0 4px color-mix(in srgb, var(--world-shadow, #0a0a0f) 60%, transparent),
      0 34px 90px color-mix(in srgb, var(--world-shadow, #0a0a0f) 62%, transparent);
  }

  /* calm: matte stone, cut IN rather than floated — inset light only. */
  &[data-lens2-surface='etched-stone'] .lens2-surface {
    border-width: 1px;
    backdrop-filter: none;
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, var(--world-text, #e0ecf4) 12%, transparent),
      inset 0 -1px 0 color-mix(in srgb, var(--world-shadow, #0a0a0f) 70%, transparent);
  }

  /* atmospheric: no edge at all — light pools in from the top of the panel. */
  &[data-lens2-surface='lightwell'] .lens2-surface {
    border-width: 0;
    backdrop-filter: blur(10px);
    background-image: radial-gradient(
      120% 82% at 50% 0%,
      color-mix(in srgb, var(--world-accent, #60c0f0) 16%, transparent),
      transparent 64%
    );
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--world-accent, #60c0f0) 18%, transparent),
      0 40px 92px color-mix(in srgb, var(--world-shadow, #0a0a0f) 52%, transparent);
  }

  /* ── chart.progress — the readiness dial's GEOMETRY ──────────────── */
  /* The conic gradient stays untouched (data). Ring thickness = ::after inset. */

  /* playful: chunky, wide, glowing — an arcade meter. */
  &[data-lens2-chart='arcade-meter'] .lens2-chart {
    width: clamp(150px, 19vw, 250px);
    filter: drop-shadow(0 0 18px color-mix(in srgb, var(--world-accent, #8b5cf6) 46%, transparent));
  }
  &[data-lens2-chart='arcade-meter'] .lens2-chart::after {
    inset: 24%;
  }

  /* technical: small, hard, instrumented — a hairline outline as a bezel. */
  &[data-lens2-chart='telemetry-columns'] .lens2-chart {
    width: clamp(112px, 12vw, 176px);
    outline: 1px solid color-mix(in srgb, var(--world-accent, #60c0f0) 52%, transparent);
    outline-offset: 7px;
  }
  &[data-lens2-chart='telemetry-columns'] .lens2-chart::after {
    inset: 13%;
  }
  &[data-lens2-chart='telemetry-columns'] .lens2-chart strong {
    font-size: clamp(24px, 3vw, 40px);
  }

  /* calm/luxe: a thin, precise gauge ring. */
  &[data-lens2-chart='ring-gauge'] .lens2-chart {
    width: clamp(132px, 16vw, 214px);
  }
  &[data-lens2-chart='ring-gauge'] .lens2-chart::after {
    inset: 8%;
  }
  &[data-lens2-chart='ring-gauge'] .lens2-chart strong {
    font-size: clamp(30px, 3.6vw, 50px);
    font-weight: 500;
  }

  /* atmospheric: a bold soft-edged band of light. */
  &[data-lens2-chart='spark-ribbon'] .lens2-chart {
    width: clamp(160px, 20vw, 268px);
    filter: blur(0.2px)
      drop-shadow(0 0 26px color-mix(in srgb, var(--world-accent, #60c0f0) 40%, transparent));
  }
  &[data-lens2-chart='spark-ribbon'] .lens2-chart::after {
    inset: 33%;
  }
`;
