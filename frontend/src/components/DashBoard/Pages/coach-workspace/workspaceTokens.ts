/**
 * FILE: workspaceTokens.ts
 * PURPOSE: The ONE place the v4 Coach Workspace maps the site's appearance
 * systems onto its own tokens (brain-v4 J14).
 *
 *  1. Header theme changer (UniversalThemeContext → injectThemeVariables) writes
 *     `--bg-*`, `--text-*`, `--accent-*`, `--border-*`, `--success/--error/--warning`
 *     on :root (THEME-CHANGER-COMPAT.md).
 *  2. Swan Style Lens, v1 (all 27 lenses): `html[data-style-lens]` + `--lens-*`
 *     layout tokens (panel radius, canvas, navigation edge, density scale, blur).
 *  3. Swan Style Lens, v2 recipe (a committed lens WITH a recipe): LensPlanFrame
 *     carries `data-lens2-plan` + inline `--world-*`.
 *
 * PRECEDENCE — theme first, and a lens world only when one is really committed.
 * `WorldContractRoot` (inside every SurfaceLensGate) always defines DEFAULT
 * `--world-*` literals. Reading `var(--world-bg, var(--bg-base))` unconditionally
 * would therefore pin the workspace to Obsidian and silently IGNORE the header
 * theme changer. So world values are read only under `[data-lens2-plan]`, which
 * LensPlanFrame emits only when a recipe compiled.
 *
 * The `--coach-*` bridge lets reused coach components (log entries, proposal
 * cards, confirmation sheet, voice overlay) repaint with the workspace instead of
 * carrying their own palette.
 *
 * Every colour in coach-workspace/** is `var(--ws-*)`; the only literals are the
 * dark-first fallbacks inside this file (enforced by coachWorkspaceTokens.test.ts).
 */
import { css } from 'styled-components';

export const workspaceTokens = css`
  --ws-bg: var(--bg-base, #030712);
  --ws-panel: var(--bg-surface, #0c111d);
  --ws-elevated: var(--bg-elevated, #111829);
  --ws-sunken: var(--bg-secondary, #07101f);
  --ws-text: var(--text-primary, #e0ecf4);
  --ws-text-soft: var(--text-secondary, #c9d4e4);
  --ws-muted: var(--text-muted, #9fb0c8);
  --ws-accent: var(--accent-primary, #60c0f0);
  --ws-action: var(--accent-secondary, #8b5cf6);
  --ws-gold: var(--accent-gold, #c6a84b);
  --ws-ok: var(--success, #47e89a);
  --ws-danger: var(--error, #ff6d85);
  --ws-warn: var(--warning, #ffb86b);
  --ws-line: var(--console-line, var(--border-subtle, color-mix(in srgb, var(--ws-text) 12%, transparent)));
  --ws-line-strong: var(--console-line-strong, var(--border-strong, color-mix(in srgb, var(--ws-accent) 38%, transparent)));
  --ws-edge: var(--lens-navigation-edge, var(--ws-accent));
  --ws-canvas: var(--lens-canvas, var(--ws-bg));
  --ws-accent-soft: color-mix(in srgb, var(--ws-accent) 14%, transparent);
  --ws-action-soft: color-mix(in srgb, var(--ws-action) 18%, transparent);
  --ws-gold-soft: color-mix(in srgb, var(--ws-gold) 12%, transparent);
  --ws-radius: var(--lens-panel-radius, 14px);
  --ws-radius-sm: 9px;
  --ws-scale: var(--lens-density-scale, 1);
  --ws-gap: calc(12px * var(--ws-scale));
  --ws-blur: var(--lens-geo-blur-md, 14px);
  --ws-font: 'Sora', 'Plus Jakarta Sans', system-ui, sans-serif;
  --ws-title-font: 'Plus Jakarta Sans', 'Sora', system-ui, sans-serif;
  --ws-mono: 'Fira Code', ui-monospace, 'SFMono-Regular', monospace;
  /* Design Brain drama face — one Cormorant italic moment per view. */
  --ws-drama-font: var(--font-drama, 'Cormorant Garamond', Georgia, serif);
  --ws-focus: 0 0 0 2px var(--ws-bg), 0 0 0 4px var(--ws-accent);

  [data-lens2-plan] & {
    --ws-bg: var(--world-bg, var(--bg-base, #030712));
    --ws-panel: var(--world-panel, var(--bg-surface, #0c111d));
    --ws-text: var(--world-text, var(--text-primary, #e0ecf4));
    --ws-muted: var(--world-muted, var(--text-muted, #9fb0c8));
    --ws-accent: var(--world-accent, var(--accent-primary, #60c0f0));
    --ws-action: var(--world-action, var(--accent-secondary, #8b5cf6));
    --ws-title-font: var(--world-title-font, 'Plus Jakarta Sans', system-ui, sans-serif);
  }

  /* Bridge for reused coach components (CoachCommandLogEntry, proposal cards, sheets). */
  --coach-bg: var(--ws-bg);
  --coach-bg-2: var(--ws-sunken);
  --coach-deep: var(--ws-bg);
  --coach-surface: var(--ws-panel);
  --coach-surface-strong: var(--ws-elevated);
  --coach-card: var(--ws-panel);
  --coach-soft: color-mix(in srgb, var(--ws-text) 6%, transparent);
  --coach-line: var(--ws-line);
  --coach-line-strong: var(--ws-line-strong);
  --coach-text: var(--ws-text);
  --coach-text-soft: var(--ws-text-soft);
  --coach-muted: var(--ws-muted);
  --coach-cyan: var(--ws-accent);
  --coach-purple: var(--ws-action);
  --coach-sapphire: var(--ws-action);
  --coach-gold: var(--ws-gold);
  --coach-success: var(--ws-ok);
  --coach-danger: var(--ws-danger);
  --coach-warn: var(--ws-warn);
  --coach-warning: var(--ws-warn);
  --coach-shadow-soft: color-mix(in srgb, var(--ws-bg) 40%, transparent);
`;
