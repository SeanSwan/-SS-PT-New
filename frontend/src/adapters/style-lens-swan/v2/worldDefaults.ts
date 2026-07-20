/**
 * Blueprint: worldDefaults (Swan adapter, v2) — LANE-A ACTIVATION (Sean-directed 2026-07-20).
 * Purpose: guarantee the world contract for DEFAULT visitors. Before this, `--world-*` existed only when a
 * committed lens recipe emitted it, and `data-style-lens-shell` was never rendered as a DOM attribute — so
 * every vNext surface gate's ContractCheck failed closed for every visitor and NO surface flag could produce
 * a visible change (FLAG-LIFECYCLE-DOCTRINE.md §BLOCKER).
 *
 * `WorldContractRoot` wraps every SurfaceLensGate frame:
 *  - renders `data-style-lens-shell` (the ancestor the gates' contract probes require);
 *  - provides DEFAULT Crystalline Swan `--world-*` values at CLASS level, so a committed lens recipe's
 *    INLINE `--world-*` (emitted deeper, on LensPlanFrame) still wins by normal custom-property scoping;
 *  - is `display: contents` — zero layout/paint of its own, pure token + attribute carrier.
 *
 * Zero visual change while surface flags are OFF: gates return the old page without mounting any frame, so
 * this wrapper only ever exists inside a flag-ON vNext mount.
 *
 * Values = the canonical Crystalline Swan palette (CLAUDE.md Active Palette). This file is the ONE sanctioned
 * hex site for the default world — surfaces stay pure consumers (LAW 8 R6).
 */
import styled from 'styled-components';

export const WorldContractRoot = styled.div`
  display: contents;

  /* Crystalline Swan — the default world. A committed lens recipe overrides these via LensPlanFrame's
     inline vars (nearer ancestor for all surface content). */
  --world-bg: #0a0a0f; /* Obsidian Black */
  --world-panel: #141419; /* Carbon */
  --world-text: #e0ecf4; /* Frost White */
  --world-muted: #9fb0c8; /* steel between Frost and Obsidian (derived; no palette slot for muted) */
  --world-accent: #60c0f0; /* Ice Wing */
  --world-action: #8b5cf6; /* Wing Purple */
  --world-title-font: 'Plus Jakarta Sans', sans-serif;
`;
