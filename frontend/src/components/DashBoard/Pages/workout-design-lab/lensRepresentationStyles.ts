/**
 * ============================================================================
 * LENS REPRESENTATION SWITCHES — where variants become different FORMS
 * ============================================================================
 * Keyed off LensPlanFrame's data-lens2-* attributes + the stable
 * lens2-* class hooks the shared concept primitives expose. Tokens
 * (--world-*) change VALUES; these rules change REPRESENTATION —
 * exercise rows become cards or terminal rows, the action bar becomes a
 * dock or a rail, composition topology shifts. This is the line between
 * "palette swap" and "different design system".
 * ============================================================================
 */
import { css } from "styled-components";

export const lensRepresentationStyles = css`
  /* ── collection.exercise ─────────────────────────────────────────── */
  &[data-lens2-collection='arcade-cards'] .lens2-collection {
    display: grid;
    grid-template-columns: var(--world-row-columns, repeat(auto-fit, minmax(150px, 1fr)));
    gap: 12px;
  }
  &[data-lens2-collection='arcade-cards'] .lens2-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: 6px;
    padding: 14px;
    border-radius: var(--world-row-radius, 22px);
    background: color-mix(in srgb, var(--world-accent, #8b5cf6) 12%, var(--world-panel, #08234a));
    box-shadow: 0 10px 26px color-mix(in srgb, var(--world-shadow, #0a0a0f) 55%, transparent);
  }

  &[data-lens2-collection='command-rows'] .lens2-collection {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2px;
  }
  &[data-lens2-collection='command-rows'] .lens2-row {
    display: grid;
    grid-template-columns: var(--world-row-columns, minmax(180px, 2fr) repeat(4, minmax(70px, 1fr)));
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: var(--world-row-radius, 3px);
    border-left: 2px solid var(--world-accent, #60c0f0);
    background: var(--world-panel, #10203a);
  }
  &[data-lens2-collection='command-rows'] .lens2-row h3,
  &[data-lens2-collection='command-rows'] .lens2-row dd,
  &[data-lens2-collection='command-rows'] .lens2-row dt {
    font-family: 'Fira Code', monospace;
  }

  /* ── action.primary ──────────────────────────────────────────────── */
  &[data-lens2-action='glass-dock'] .lens2-actions {
    flex-direction: row;
    justify-content: center;
    padding: 12px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--world-panel, #08234a) 72%, transparent);
    backdrop-filter: blur(14px);
    box-shadow: 0 0 26px color-mix(in srgb, var(--world-action, #8b5cf6) 30%, transparent);
  }

  &[data-lens2-action='command-rail'] .lens2-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    padding: 10px;
    border-radius: var(--world-panel-radius, 4px);
    border-right: 3px solid var(--world-accent, #60c0f0);
    background: var(--world-panel, #10203a);
  }
  &[data-lens2-action='command-rail'] .lens2-actions button {
    justify-content: flex-start;
    border-radius: var(--world-row-radius, 3px);
  }

  /* ── text.display ────────────────────────────────────────────────── */
  &[data-lens2-display] .lens2-display {
    font: var(--world-title-font);
    letter-spacing: var(--world-letter-spacing, -0.02em);
  }

  /* ── collection.exercise — Slice W0 additions ────────────────────── */
  &[data-lens2-collection='gallery-tiles'] .lens2-collection {
    display: grid;
    grid-template-columns: var(--world-row-columns, repeat(auto-fit, minmax(220px, 1fr)));
    gap: 20px;
  }
  &[data-lens2-collection='gallery-tiles'] .lens2-row {
    display: grid;
    gap: 10px;
    padding: 22px;
    border-radius: var(--world-row-radius, 18px);
    background: color-mix(in srgb, var(--world-panel, #10203a) 88%, transparent);
    border: 1px solid color-mix(in srgb, var(--world-accent, #c6a84b) 26%, transparent);
  }

  &[data-lens2-collection='ledger-strips'] .lens2-collection {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0;
  }
  &[data-lens2-collection='ledger-strips'] .lens2-row {
    display: grid;
    grid-template-columns: var(--world-row-columns, minmax(160px, 2fr) repeat(3, minmax(64px, 1fr)));
    align-items: center;
    gap: 10px;
    padding: 12px 6px;
    border-radius: 0;
    border-bottom: 1px solid color-mix(in srgb, var(--world-accent, #60c0f0) 22%, transparent);
  }

  &[data-lens2-collection='orbit-nodes'] .lens2-collection {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  &[data-lens2-collection='orbit-nodes'] .lens2-row {
    display: grid;
    gap: 4px;
    padding: 12px 18px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--world-accent, #8b5cf6) 14%, var(--world-panel, #08234a));
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--world-accent, #8b5cf6) 40%, transparent);
  }

  /* surface.card (frosted-vault/etched-stone/lightwell) + chart.progress
     (ring-gauge/spark-ribbon) are ALLOWLISTED in variantVocabulary.ts and
     differentiate worlds by TOKENS only — consistent with the existing
     floating-candy/faceted-console + arcade-meter/telemetry-columns, which
     also have no dedicated form primitive. Their form renderers await the
     lens2-surface/lens2-chart primitive elements (W0.2 follow-up); no dead
     CSS is shipped here targeting elements that do not exist. */

  /* ── action.primary — Slice W0 additions ─────────────────────────── */
  &[data-lens2-action='pill-cluster'] .lens2-actions {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
  }
  &[data-lens2-action='pill-cluster'] .lens2-actions button {
    border-radius: 999px;
    min-height: 44px;
  }
  &[data-lens2-action='monolith-bar'] .lens2-actions {
    flex-direction: row;
    justify-content: stretch;
    padding: 6px;
    border-radius: var(--world-panel-radius, 8px);
    background: color-mix(in srgb, var(--world-action, #002060) 82%, transparent);
  }
  &[data-lens2-action='monolith-bar'] .lens2-actions button {
    flex: 1;
    min-height: 48px;
  }

  /* ── typography — Slice W0 additions (voice per family) ───────────── */
  &[data-lens2-display='aurora-airy'] .lens2-display {
    font-weight: 300;
    letter-spacing: 0.04em;
  }
  &[data-lens2-display='monastic-quiet'] .lens2-display {
    font-weight: 500;
    letter-spacing: -0.005em;
  }
  &[data-lens2-body='humanist-serif'] .lens2-row {
    font-family: 'Cormorant Garamond', Georgia, serif;
  }
  &[data-lens2-body='signal-grotesk'] .lens2-row {
    font-family: 'Sora', 'Plus Jakarta Sans', sans-serif;
  }

  /* ── composition topology (desktop templates) ────────────────────── */
  @media (min-width: 821px) {
    &[data-lens2-template='operator-grid'] .lens2-composition {
      grid-template-columns: minmax(0, 2fr) minmax(240px, 1fr);
      grid-template-areas: "work hero" "work dial" "work context" "actions context";
    }
    &[data-lens2-template='atrium-split'] .lens2-composition {
      grid-template-columns: minmax(0, 1fr) minmax(220px, 0.7fr);
      gap: 28px;
    }
  }
  &[data-lens2-template='editorial-column'] .lens2-composition {
    max-width: 760px;
    margin-inline: auto;
  }
`;
