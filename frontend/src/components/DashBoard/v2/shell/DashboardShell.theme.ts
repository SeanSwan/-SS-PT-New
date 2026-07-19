/**
 * Dashboards v2 — token chain (KIMI-DASHBOARDS-CORRECTED §3.1 + GAPFIX §4).
 *
 * THE ONLY v2 file that may name `--lens-*` / `--world-*`, and the ONLY hex site (status colors).
 * `--dash-*` aliases the REAL shipped lens/world tokens; every other v2 file references bare
 * `var(--dash-*)` only. No invented names (`--world-surface`, `--world-data-*`, `--world-z-*`).
 * A missing world token means the gate's contract check already failed closed to V1, so no fallbacks.
 */
import { createGlobalStyle } from 'styled-components';

export const DashboardShellTheme = createGlobalStyle`
  .dash-shell {
    /* structure ← REAL world slots */
    --dash-bg: var(--world-bg);              --dash-panel: var(--world-panel);
    --dash-ink: var(--world-text);           --dash-ink-2: var(--world-muted);
    --dash-accent: var(--world-accent);      --dash-action: var(--world-action);
    --dash-glass: color-mix(in oklab, var(--world-panel) 72%, transparent);
    --dash-line: color-mix(in oklab, var(--world-accent) 14%, transparent);
    --dash-line-strong: color-mix(in oklab, var(--world-accent) 28%, transparent);
    --dash-glow: color-mix(in oklab, var(--world-accent) 35%, transparent);
    /* shape / elevation / z ← REAL lens slots (set on [data-style-lens-shell]) */
    --dash-r-panel: var(--lens-panel-radius);   --dash-r-row: var(--world-row-radius);
    --dash-dial-r: var(--world-dial-radius);    --dash-pad: var(--lens-main-padding);
    --dash-canvas: var(--lens-canvas);
    --dash-elev-1: var(--lens-elev-1); --dash-elev-2: var(--lens-elev-2); --dash-elev-3: var(--lens-elev-3);
    --dash-z-sticky: var(--lens-z-sticky); --dash-z-overlay: var(--lens-z-overlay);
    --dash-z-toast: var(--lens-z-toast); --dash-z-modal: var(--lens-z-modal);
    /* type + targets + roster */
    --dash-font-display: var(--world-title-font);
    --dash-target: max(44px, var(--world-target-size, 44px));
    --dash-row-cols: var(--world-row-columns, 4);
    /* statuses: dash-local literals — the ONLY hexes in v2; never Galaxy values */
    --dash-good: #58D6A0; --dash-warn: #EFB456; --dash-bad: #F07575;
  }
  /* per-density second accent — derived, zero invention (this file only) */
  .dash-shell[data-density='trainer'] { --dash-accent-2: var(--world-action); }
  .dash-shell[data-density='admin']   { --dash-accent-2: var(--world-accent); }
  .dash-shell[data-density='client']  { --dash-accent-2: color-mix(in oklab, var(--world-accent) 75%, var(--world-text) 25%); }
  .dash-shell[data-density='user']    { --dash-accent-2: color-mix(in oklab, var(--world-accent) 65%, var(--world-action, var(--world-accent)) 35%); }

  /* focus ring — never removed */
  .dash-shell :where(a, button, [role='button'], input, select, textarea, [tabindex]):focus-visible {
    outline: 2px solid var(--dash-accent);
    outline-offset: 2px;
  }
  /* belt-and-braces: reduced motion forces opacity-only regardless of tier (§4.1) */
  @media (prefers-reduced-motion: reduce) {
    .dash-shell *, .dash-shell *::before, .dash-shell *::after {
      transition-duration: 1ms;
      animation-duration: 1ms;
    }
  }
`;
