/**
 * COMPONENT: WorkoutPlannerSaveBar (S17 — JARVIS blueprint §4.4)
 * PURPOSE: The single save/activate surface for Planner IA V2. Renders
 * EXACTLY ONE primary button in every state — the whole matrix lives in the
 * pure `resolveSaveBar` (S14); this component only presents its resolution.
 * Every disabled control states its reason. Overflow actions the platform
 * cannot perform yet (templates → S24, assignment → schedule link-up) render
 * disabled with the reason spoken, never hidden. A "Create PDF" utility item
 * rides the overflow so the legacy header matrix can retire under the flag.
 * Presentational — zero fetching, all writes arrive as handlers.
 */

import React from 'react';
import styled from 'styled-components';
import { MoreHorizontal } from 'lucide-react';
import { resolveSaveBar, type SaveBarState } from './plannerLogic/resolveSaveBar';

const Bar = styled.div`
  position: sticky; bottom: 0; z-index: 40;
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 10px 14px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  background: var(--world-surface, var(--bg-base, #030712));
  border-top: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  @media (max-width: 1279px) { bottom: 48px; } /* clears the V2 tab bar */
`;

const Primary = styled.button`
  min-height: 44px; padding: 0 20px; border-radius: 10px; cursor: pointer;
  border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  background: var(--btn-primary-bg, #002060);
  color: var(--button-primary-text, #E0ECF4);
  font-family: 'Sora', sans-serif; font-size: 0.84rem; font-weight: 800;
  &:hover:not(:disabled) { box-shadow: 0 0 14px color-mix(in srgb, var(--accent-glow, #8B5CF6) 45%, transparent); }
  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: 3px; }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

const Status = styled.span`
  font-family: 'Sora', sans-serif; font-size: 0.76rem; font-weight: 700;
  color: var(--world-text-dim, var(--text-secondary, #9fb3c8));
`;

const OverflowWrap = styled.div` position: relative; margin-left: auto; `;

const OverflowButton = styled.button`
  min-width: 44px; min-height: 44px; border-radius: 10px; cursor: pointer;
  border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  background: transparent; color: var(--world-text, var(--text-primary, #E0ECF4));
  display: inline-flex; align-items: center; justify-content: center;
  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: 2px; }
`;

const Menu = styled.ul`
  position: absolute; right: 0; bottom: calc(100% + 6px); z-index: 45;
  margin: 0; padding: 6px; list-style: none; min-width: 220px;
  background: var(--world-surface-raised, var(--card-dark, #141419));
  border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  border-radius: 12px;
`;

const MenuItem = styled.button`
  width: 100%; min-height: 44px; padding: 0 12px; text-align: left; cursor: pointer;
  border: none; border-radius: 8px; background: transparent;
  color: var(--world-text, var(--text-primary, #E0ECF4));
  font-family: 'Sora', sans-serif; font-size: 0.8rem; font-weight: 700;
  &:hover:not(:disabled) { background: color-mix(in srgb, var(--world-accent, var(--accent-primary, #60C0F0)) 12%, transparent); }
  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: -2px; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  small { display: block; font-weight: 500; color: var(--world-text-dim, var(--text-secondary, #9fb3c8)); }
`;

export interface SaveBarHandlers {
  onPrimary: (primaryLabel: string) => void;
  onOverflowItem: (item: string) => void;
  /** Items the platform cannot perform yet → disabled with the stated reason. */
  unavailable?: Record<string, string>;
  primaryUnavailableReason?: string;
  busy?: boolean;
}

const WorkoutPlannerSaveBar: React.FC<{ state: SaveBarState } & SaveBarHandlers> = ({
  state, onPrimary, onOverflowItem, unavailable = {}, primaryUnavailableReason, busy = false,
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const resolution = resolveSaveBar(state);
  const overflow = [...resolution.overflow, 'Create PDF'];
  const primaryBlocked = Boolean(resolution.primaryDisabled) || Boolean(primaryUnavailableReason);

  return (
    <Bar data-testid="planner-save-bar">
      <Primary
        type="button"
        disabled={busy || primaryBlocked}
        onClick={() => onPrimary(resolution.primary)}
        aria-label={resolution.primary}
      >
        {busy ? 'Working…' : resolution.primary}
      </Primary>
      <Status aria-live="polite" data-testid="planner-save-bar-status">
        {primaryUnavailableReason ?? resolution.statusText}
      </Status>
      <OverflowWrap>
        <OverflowButton
          type="button"
          aria-label="More plan actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(open => !open)}
        >
          <MoreHorizontal size={18} aria-hidden />
        </OverflowButton>
        {menuOpen && (
          <Menu role="menu" aria-label="Plan actions">
            {overflow.map(item => (
              <li key={item} role="none">
                <MenuItem
                  type="button"
                  role="menuitem"
                  disabled={busy || item in unavailable}
                  onClick={() => { setMenuOpen(false); onOverflowItem(item); }}
                >
                  {item}
                  {item in unavailable && <small>{unavailable[item]}</small>}
                </MenuItem>
              </li>
            ))}
          </Menu>
        )}
      </OverflowWrap>
    </Bar>
  );
};

export default WorkoutPlannerSaveBar;
