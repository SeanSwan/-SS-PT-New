/**
 * FILE: CoachCommandCenter.bridgeStyles.ts
 * PURPOSE: Command Bridge — chat-first, floor-legible shell for the admin Swan Coach terminal.
 *
 * Single-column, phone-first console: a persistent "now coaching" client bar (the
 * focal point), section tabs, a scrolling chat transcript, and a bottom command dock.
 * Heavy ops surfaces (intake queue, PLAUD merge, operator controls) move off the
 * default view into tabs + a slide-in drawer. Tokens reuse the shared shell/foundation
 * fragments so the visual language matches the rest of Swan Coach.
 *
 * Legibility (Rule 7 + floor use): large type, high-contrast Frost White on Obsidian,
 * primary touch targets >= 56px. Motion stays tier-2/3 and respects reduced-motion.
 *
 * Transcript/dock/drawer styles live in CoachCommandCenter.bridgeDockStyles (300-line cap).
 */

import styled, { css } from 'styled-components';

import { coachCommandDockStyles } from './CoachCommandCenter.bridgeDockStyles';
import { coachCommandBridgeMobileDockStyles } from './CoachCommandCenter.bridgeMobileDockStyles';
import { coachCommandCrystallineFocusStyles } from './CoachCommandCenter.crystallineFocusStyles';
import { coachCommandFoundationStyles } from './CoachCommandCenter.foundationStyles';
import { coachCommandHeaderActionStyles } from './CoachCommandCenter.headerActionStyles';
import { coachCommandOpsMissionStyles } from './CoachCommandCenter.opsMissionStyles';
import { coachCommandOpsStyles } from './CoachCommandCenter.opsStyles';
import { coachCommandShellStyles } from './CoachCommandCenter.shellStyles';

export const coachCommandBridgeStyles = css`
  --coach-sapphire: var(--accent-sapphire, #002060);

  /* ── Shell: phone-first single column ─────────────────────────────── */
  .bridge-shell {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    max-width: 880px;
    margin: 0 auto;
    /* Use min-height (not a fixed height) so the shell adapts to the dashboard
       content area, whose vertical padding varies by breakpoint (24px desktop,
       128px+ top on mobile/tablet). A fixed 100dvh height overflowed that
       padding and crushed the transcript into a sliver. */
    min-height: max(480px, calc(100dvh - 48px));
  }

  /* ── Client bar (signature focal point) ───────────────────────────── */
  .client-bar {
    flex: 0 0 auto;
    border-radius: 22px;
    padding: 16px;
    display: grid;
    gap: 12px;
  }

  .client-bar-top {
    align-items: center;
    display: flex;
    justify-content: space-between;
  }

  .coach-wordmark {
    align-items: center;
    color: var(--coach-text);
    display: inline-flex;
    font-family: 'Plus Jakarta Sans', 'Sora', system-ui, sans-serif;
    font-size: 15px;
    font-weight: 820;
    gap: 8px;
    letter-spacing: 0.03em;
  }

  .ops-button {
    align-items: center;
    background: var(--coach-soft);
    border: 1px solid var(--coach-line);
    border-radius: 12px;
    color: var(--coach-text-soft);
    display: inline-flex;
    font-weight: 700;
    gap: 8px;
    min-height: 44px;
    padding: 0 14px;
  }

  .now-coaching {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .now-label {
    color: var(--coach-muted);
    font-family: 'Fira Code', monospace;
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .client-name {
    color: var(--coach-text);
    font-family: 'Plus Jakarta Sans', 'Sora', system-ui, sans-serif;
    font-size: clamp(22px, 5.4vw, 28px);
    font-weight: 820;
    line-height: 1.08;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Blue bg -> purple glow (Dual-Button Glow) */
  .new-client-button {
    align-items: center;
    background: linear-gradient(135deg, var(--coach-sapphire), color-mix(in srgb, var(--coach-sapphire) 64%, var(--coach-purple)));
    border: 1px solid color-mix(in srgb, var(--coach-purple) 42%, transparent);
    border-radius: 14px;
    box-shadow: 0 10px 30px color-mix(in srgb, var(--coach-purple) 30%, transparent);
    color: var(--coach-text);
    display: inline-flex;
    font-size: 16px;
    font-weight: 800;
    gap: 10px;
    justify-content: center;
    min-height: 56px;
    padding: 0 18px;
    width: 100%;
  }

  .recent-rail {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: none;
  }
  .recent-rail::-webkit-scrollbar { display: none; }

  .recent-chip {
    align-items: center;
    background: var(--coach-soft);
    border: 1px solid var(--coach-line);
    border-radius: 999px;
    color: var(--coach-text);
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 15px;
    font-weight: 720;
    gap: 8px;
    max-width: 200px;
    min-height: 48px;
    padding: 0 16px;
  }
  .recent-chip .recent-chip-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .recent-chip.is-active {
    background: color-mix(in srgb, var(--coach-cyan) 16%, transparent);
    border-color: var(--coach-line-strong);
  }
  .recent-empty {
    color: var(--coach-muted);
    font-size: 14px;
    padding: 6px 2px;
  }

  /* ── Section tabs ─────────────────────────────────────────────────── */
  .tab-bar {
    background: color-mix(in srgb, var(--coach-surface) 80%, transparent);
    border: 1px solid var(--coach-line);
    border-radius: 16px;
    display: flex;
    flex: 0 0 auto;
    gap: 6px;
    padding: 6px;
  }
  .tab-button {
    align-items: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 12px;
    color: var(--coach-muted);
    display: inline-flex;
    flex: 1;
    flex-direction: column;
    font-size: 13px;
    font-weight: 760;
    gap: 3px;
    justify-content: center;
    min-height: 54px;
    position: relative;
  }
  .tab-button.is-active {
    background: color-mix(in srgb, var(--coach-cyan) 14%, transparent);
    border-color: var(--coach-line-strong);
    color: var(--coach-text);
  }
  .tab-badge {
    align-items: center;
    background: var(--coach-purple);
    border-radius: 999px;
    color: #ffffff;
    display: inline-flex;
    font-size: 11px;
    font-weight: 820;
    height: 18px;
    justify-content: center;
    min-width: 18px;
    padding: 0 5px;
    position: absolute;
    right: 12px;
    top: 6px;
  }

  /* ── Tab content area ─────────────────────────────────────────────── */
  .tab-content {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
  }
  .tab-scroll {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 14px;
    min-height: 0;
    overflow-y: auto;
    padding-right: 2px;
  }

  /* History tab reuses .left-rail — render it as a static panel, not a sticky rail */
  .tab-scroll .left-rail {
    border-radius: 18px;
    max-height: none;
    position: static;
    top: auto;
  }
`;

export const CommandBridgeShell = styled.div`
  ${coachCommandShellStyles}
  ${coachCommandFoundationStyles}
  ${coachCommandBridgeStyles}
  ${coachCommandHeaderActionStyles}
  ${coachCommandDockStyles}
  ${coachCommandBridgeMobileDockStyles}
  ${coachCommandOpsStyles}
  ${coachCommandOpsMissionStyles}
  ${coachCommandCrystallineFocusStyles}
`;
