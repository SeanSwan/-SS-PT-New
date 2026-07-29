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
 * Post-de-gate (FLAG-LIFECYCLE-DOCTRINE.md, 2026-07-21): the 7 vNext surface flags are RETIRED — design is
 * chosen by the canonical committed route, not a flag. So `SurfaceLensGate` (and this wrapper) now mount on the
 * LIVE canonical surfaces that adopt a LensFrame (e.g. WorkoutLogger, Schedule, Clients, Bootcamp), NOT inside a
 * flag-ON vNext mount. It stays a `display:contents` no-op for the default world, so committing no lens (or a
 * lens with no recipe — 25 of 27 today) produces zero visual change; only a lens with a v2 recipe repaints.
 *
 * Values = the canonical Crystalline Swan palette (CLAUDE.md Active Palette). This file is the ONE sanctioned
 * hex site for the DEFAULT world — surfaces stay pure consumers (LAW 8 R6). Per-world SETTING hex lives in
 * `worlds/recipes/<id>.ts` and nowhere else, restricted to the `world-panel`/`world-bg`/`world-shadow` tokens
 * (bespoke world depth has no palette slot); every other color token there must be `var(--palette-token, #fb)`.
 * Both carve-outs are CI-enforced by `worlds/lawA.test.ts` — that test, not this comment, is the authority.
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
