/**
 * FILE: CoachCommandCenter.bridgeStyles.ts
 * PURPOSE: Command Bridge Floor Mode shell for the admin Swan Coach terminal.
 *
 * Single-column, phone-first console: current client context, Talk/Review/History,
 * a live chat transcript, and a bottom command dock. Heavy review surfaces stay
 * grouped in Review or More so the default view remains usable on the training floor.
 */

import styled, { css } from 'styled-components';

import { coachCommandDockStyles } from './CoachCommandCenter.bridgeDockStyles';
import { coachCommandBridgeMobileDockStyles } from './CoachCommandCenter.bridgeMobileDockStyles';
import { coachCommandCrystallineFocusStyles } from './CoachCommandCenter.crystallineFocusStyles';
import { coachCommandFoundationStyles } from './CoachCommandCenter.foundationStyles';
import { coachCommandHeaderActionStyles } from './CoachCommandCenter.headerActionStyles';
import { coachCommandOpsMissionStyles } from './CoachCommandCenter.opsMissionStyles';
import { coachCommandOpsStyles } from './CoachCommandCenter.opsStyles';
import { coachCommandOwnerControlsStyles } from './CoachCommandCenter.ownerControlsStyles';
import { coachCommandShellStyles } from './CoachCommandCenter.shellStyles';
import { coachCommandThreadHeaderStyles } from './CoachCommandCenter.threadHeaderStyles';

export const coachCommandBridgeStyles = css`
  .bridge-shell {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 0 auto;
    max-width: 880px;
    min-height: max(480px, calc(100dvh - 48px));
    width: 100%;
  }

  .client-bar {
    align-items: center;
    border-radius: 22px;
    display: grid;
    gap: 12px;
    grid-template-columns: minmax(0, 1fr) auto;
    padding: 14px;
  }

  .client-bar-tools {
    align-items: center;
    display: inline-flex;
    gap: 8px;
    justify-content: flex-end;
    min-width: 0;
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

  .new-client-button {
    align-items: center;
    background: linear-gradient(135deg, var(--coach-sapphire), color-mix(in srgb, var(--coach-sapphire) 64%, var(--coach-purple)));
    border: 1px solid color-mix(in srgb, var(--coach-purple) 42%, transparent);
    border-radius: 14px;
    box-shadow: 0 10px 30px color-mix(in srgb, var(--coach-purple) 30%, transparent);
    color: var(--coach-text);
    display: inline-flex;
    font-size: 14px;
    font-weight: 800;
    gap: 8px;
    justify-content: center;
    min-height: 44px;
    padding: 0 14px;
  }

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

  .tab-scroll .left-rail {
    border-radius: 18px;
    max-height: none;
    position: static;
    top: auto;
  }

  .review-hub {
    display: grid;
    gap: 14px;
  }

  .review-hub-top {
    display: grid;
    gap: 4px;
  }

  .review-eyebrow {
    color: var(--coach-muted);
    font-family: 'Fira Code', monospace;
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .review-hub h2 {
    color: var(--coach-text);
    font-family: 'Plus Jakarta Sans', 'Sora', system-ui, sans-serif;
    font-size: 28px;
    line-height: 1.05;
    margin: 0;
  }

  .review-hub p {
    color: var(--coach-muted);
    font-size: 14px;
    line-height: 1.5;
    margin: 0;
  }

  .review-next-card {
    align-items: center;
    background: color-mix(in srgb, var(--coach-gold) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--coach-gold) 28%, transparent);
    border-radius: 14px;
    color: var(--coach-text);
    display: flex;
    gap: 10px;
    min-height: 56px;
    padding: 12px;
  }

  .review-next-card span,
  .review-section-card span {
    display: grid;
    gap: 3px;
    min-width: 0;
  }

  .review-next-card small,
  .review-section-card small {
    color: var(--coach-muted);
    font-size: 12px;
    line-height: 1.35;
  }

  .review-card-grid {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .review-section-card {
    align-items: flex-start;
    background: color-mix(in srgb, var(--coach-soft) 78%, transparent);
    border: 1px solid var(--coach-line);
    border-radius: 14px;
    color: var(--coach-text);
    display: grid;
    gap: 9px;
    min-height: 132px;
    padding: 14px;
    text-align: left;
  }

  .review-section-card.is-active {
    background: color-mix(in srgb, var(--coach-cyan) 12%, var(--coach-soft));
    border-color: color-mix(in srgb, var(--coach-cyan) 36%, var(--coach-line));
  }

  .review-section-card em {
    color: color-mix(in srgb, var(--coach-gold) 82%, var(--coach-text));
    font-size: 12px;
    font-style: normal;
    font-weight: 820;
  }

  .review-section-panel {
    display: grid;
    gap: 12px;
  }

  @media (max-width: 720px) {
    .review-card-grid {
      grid-template-columns: 1fr;
    }
  }
`;

export const CommandBridgeShell = styled.div`
  ${coachCommandShellStyles}
  ${coachCommandFoundationStyles}
  ${coachCommandBridgeStyles}
  ${coachCommandHeaderActionStyles}
  ${coachCommandThreadHeaderStyles}
  ${coachCommandDockStyles}
  ${coachCommandBridgeMobileDockStyles}
  ${coachCommandOpsStyles}
  ${coachCommandOwnerControlsStyles}
  ${coachCommandOpsMissionStyles}
  ${coachCommandCrystallineFocusStyles}
`;
