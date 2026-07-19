/**
 * Slice 3 / C6 — lens-shell focus, selection, elevation, z (KIMI-SWAN-LENS-SLICE3 §2). ADDITIVE.
 * S1-C core untouched; Lane-A files untouched.
 *
 * MOUNT: `lensSurfaceCss` is composed by the SAME mount that composes Slice-2's viewport styles
 * (one additive import line — the only prior-slice touch this slice needs). Fallback:
 * <LensSurfaceGlobalStyles /> once at the lens-shell root.
 *
 * FOCUS/SELECTION RECONCILIATION — decision: SCOPE, not supersede. Every rule applies ONLY under
 * [data-style-lens-shell]. These existing app-wide rules are RETAINED and keep ownership OUTSIDE
 * the shell (not edited, not overridden there): styles/CosmicEleganceGlobalStyle.ts,
 * styles/ImprovedGlobalStyle.ts, styles/dashboard-global-styles.css, styles/responsive-fixes.css.
 * Inside the shell, C6 wins by specificity — `[data-style-lens-shell] …:focus-visible` is (0,2,0)
 * vs their bare `:focus-visible` (0,1,0), order-independent, no !important. forced-colors is
 * harmonized by SAME VALUE with the shipped S1-C rule (both `2px solid Highlight`) so declarations
 * cannot conflict regardless of order.
 *
 * TOKENS: emits ZERO --world-* declarations (Rule 67 — new world names are Lane A's). READS the
 * shipped --world-accent + theme var --bg-base only. var() fallbacks below mirror S1-A §B shipped
 * values verbatim; retired trio absent (tested).
 *
 * ELEVATION: additive --lens-elev-* family, Swan-fixed this slice; elev-3 = the shipped S1-A shadow
 * base verbatim. Consumption is OPT-IN (.lens-elev-* utilities or box-shadow: var(--lens-elev-<n>)).
 * Z: additive --lens-z-* interim family (token form of Slice-2's CRYSTALLIZE_OVERLAY_Z pattern);
 * consumers apply `var(--lens-z-<step>)` as their stacking value (bare z literals stay banned).
 * Promotion of the family to --world-z-* is PROPOSED, not emitted (Deferred §8.2).
 */
import { createGlobalStyle } from 'styled-components';

export const lensSurfaceCss = `
[data-style-lens-shell] {
  --lens-elev-0: none;
  --lens-elev-1: 0 2px 6px rgba(10, 10, 15, 0.45);
  --lens-elev-2: 0 4px 12px rgba(10, 10, 15, 0.5);
  --lens-elev-3: 0 8px 24px rgba(10, 10, 15, 0.55);
  --lens-elev-4: 0 16px 48px rgba(10, 10, 15, 0.6);
  --lens-z-base: 0;
  --lens-z-raised: 100;
  --lens-z-sticky: 200;
  --lens-z-overlay: 300;
  --lens-z-modal: 400;
  --lens-z-toast: 500;
}

[data-style-lens-shell] :where(a, button, [role='button'], input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--world-accent, #60c0f0);
  outline-offset: 2px;
}

[data-style-lens-shell]::selection,
[data-style-lens-shell] ::selection {
  background-color: var(--world-accent, #60c0f0);
  color: var(--bg-base, #0a0a0f);
}

@media (forced-colors: active) {
  [data-style-lens-shell] :where(a, button, [role='button'], input, select, textarea, [tabindex]):focus-visible {
    outline: 2px solid Highlight;
    outline-offset: 2px;
  }
}

[data-style-lens-shell] .lens-elev-1 { box-shadow: var(--lens-elev-1); }
[data-style-lens-shell] .lens-elev-2 { box-shadow: var(--lens-elev-2); }
[data-style-lens-shell] .lens-elev-3 { box-shadow: var(--lens-elev-3); }
[data-style-lens-shell] .lens-elev-4 { box-shadow: var(--lens-elev-4); }
`;

/** Fallback mount only. Primary mount = the Slice-2 style composition (one additive line). */
export const LensSurfaceGlobalStyles = createGlobalStyle`${lensSurfaceCss}`;
