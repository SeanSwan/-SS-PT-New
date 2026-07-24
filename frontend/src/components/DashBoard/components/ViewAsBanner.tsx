/**
 * ViewAsBanner
 * =============
 * Persistent banner shown to an admin who is viewing a non-admin dashboard.
 *
 * Mounted by UniversalDashboardLayout when:
 *   userRole === 'admin' && activeRole !== 'admin'
 *
 * DESIGN RATIONALE (2026-07-24 redesign):
 * The previous version was styled with `--accent-primary` (Ice Wing cyan) — the
 * brand's "everything is normal" colour — which is exactly why viewing another
 * role's dashboard was mistakable for the app spontaneously demoting the owner.
 * Impersonation must never read as normal. This version uses the warning token,
 * spans the full content width, and states plainly whose dashboard is on screen.
 *
 * The exit control resolves to the SAME capability on the admin dashboard
 * (resolveExitViewAsPath) rather than a generic landing page: since the admin
 * now mounts every coaching capability, leaving View-As can preserve the task
 * in progress instead of costing the user their place.
 *
 * Motion is a slow 2-step opacity pulse on a single small dot, disabled under
 * prefers-reduced-motion. Nothing else animates.
 */
import React from 'react';
import styled, { css, keyframes } from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, ArrowRight } from 'lucide-react';
import { resolveExitViewAsPath } from './resolveExitViewAsPath';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

type ViewAsRole = 'trainer' | 'client';

interface ViewAsBannerProps {
  /** The non-admin dashboard role the admin is currently viewing. */
  activeRole: ViewAsRole;
  /**
   * Optional explicit return target. When omitted the banner resolves the
   * equivalent admin surface for the current route, preserving working context.
   */
  returnPath?: string;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.35; }
`;

/** Reduced-motion safe: the dot is always visible, it simply stops pulsing. */
const liveDotMotion = css`
  animation: ${pulse} 2.4s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 12px 18px;
  margin: 0 0 16px 0;
  background: color-mix(in srgb, var(--warning, #f59e0b) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--warning, #f59e0b) 42%, transparent);
  /* The heavy left edge is the at-a-glance "this is not your dashboard" cue. */
  border-left: 4px solid var(--warning, #f59e0b);
  border-radius: 10px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;

  @media (max-width: 640px) {
    flex-wrap: wrap;
    gap: 10px;
    padding: 12px 14px;
  }
`;

const IconWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--warning, #f59e0b);
`;

const LiveDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--warning, #f59e0b);
  ${liveDotMotion}
`;

const TextBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
`;

const Heading = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  /* CLAUDE.md typography rule: Plus Jakarta Sans for headings. */
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9375rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--warning-text, #F5D678);
`;

const HeadingText = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Supporting = styled.span`
  font-size: 0.8125rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.75));
  line-height: 1.35;
`;

const ReturnBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 45%, transparent);
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 16%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.25s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 26%, transparent);
    border-color: var(--accent-secondary, #8B5CF6);
    /* Dual-Button Glow: Purple bg → Cyan glow. */
    box-shadow: 0 4px 20px -2px rgba(96, 192, 240, 0.5);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  @media (max-width: 640px) {
    width: 100%;
    justify-content: center;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<ViewAsRole, string> = {
  trainer: 'Trainer Dashboard',
  client: 'Client Dashboard',
};

/**
 * Persistent banner shown when an admin is viewing a non-admin dashboard.
 * Consumers are responsible for the role check (only render when an admin is
 * viewing trainer/client).
 */
const ViewAsBanner: React.FC<ViewAsBannerProps> = ({ activeRole, returnPath }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const exitPath = returnPath ?? resolveExitViewAsPath(location.pathname, location.search);

  return (
    <Bar role="status" aria-live="polite" data-testid="view-as-banner">
      <IconWrap aria-hidden="true">
        <Eye size={18} />
      </IconWrap>
      <TextBlock>
        <Heading>
          <LiveDot aria-hidden="true" />
          <HeadingText>Admin view: {ROLE_LABEL[activeRole]}</HeadingText>
        </Heading>
        <Supporting>
          You are still signed in as Admin. Actions audit to your admin account.
        </Supporting>
      </TextBlock>
      <ReturnBtn
        type="button"
        onClick={() => navigate(exitPath)}
        aria-label="Return to Admin Dashboard"
      >
        Return to Admin Dashboard
        <ArrowRight size={14} />
      </ReturnBtn>
    </Bar>
  );
};

export default ViewAsBanner;
