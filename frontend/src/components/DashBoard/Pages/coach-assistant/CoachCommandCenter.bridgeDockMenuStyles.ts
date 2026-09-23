/**
 * FILE: CoachCommandCenter.bridgeDockMenuStyles.ts
 * PURPOSE: Progressive-disclosure styling for the Coach command dock tools.
 *
 * The visible menu contains only the next useful moves. Low-frequency utilities
 * remain available behind an explicit second disclosure without changing routes
 * or the approval behavior owned by the controller.
 */
import { css } from 'styled-components';

export const coachCommandDockMenuStyles = css`
  .dock-more-menu > a,
  .dock-more-menu > button {
    width: 100%;
  }

  .dock-more-menu > button[aria-expanded='true'] {
    background: color-mix(in srgb, var(--coach-cyan) 10%, transparent);
    border-color: color-mix(in srgb, var(--coach-cyan) 24%, var(--coach-line));
    color: var(--coach-text);
  }

  .dock-advanced-tools {
    border-left: 1px solid color-mix(in srgb, var(--coach-cyan) 24%, var(--coach-line));
    display: grid;
    gap: 6px;
    margin: 0 0 0 8px;
    padding: 4px 0 4px 8px;
  }

  .dock-advanced-tools button {
    align-items: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 11px;
    color: var(--coach-muted);
    display: flex;
    font-size: 13px;
    font-weight: 720;
    gap: 9px;
    min-height: 44px;
    padding: 0 10px;
    text-align: left;
    width: 100%;
  }

  .dock-advanced-tools button:hover,
  .dock-advanced-tools button:focus-visible {
    background: color-mix(in srgb, var(--coach-cyan) 8%, transparent);
    border-color: color-mix(in srgb, var(--coach-cyan) 20%, var(--coach-line));
    color: var(--coach-text);
  }
`;
