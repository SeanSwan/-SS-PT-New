/**
 * ViewAsBanner
 * =============
 * Phase 18.A (2026-04-20) — Persistent banner shown to admins who are
 * viewing a non-admin dashboard (trainer or client). Makes it impossible
 * to forget which role's dashboard you're on while keeping the admin as
 * the real authenticated actor (no JWT role swap, no impersonation —
 * all writes still audit to the real admin account).
 *
 * Mounted by UniversalDashboardLayout when:
 *   userRole === 'admin' && activeRole !== 'admin'
 *
 * Copy finalized by Codex ROUND 1.
 */
import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

type ViewAsRole = 'trainer' | 'client';

interface ViewAsBannerProps {
  /** The non-admin dashboard role the admin is currently viewing. */
  activeRole: ViewAsRole;
  /** Path to return to admin dashboard. Default: /dashboard/admin/client-management */
  returnPath?: string;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 18px;
  margin: 0 0 16px 0;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
  border-radius: 10px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;

  @media (max-width: 768px) {
    flex-wrap: wrap;
    padding: 10px 14px;
  }
`;

const IconWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--accent-primary, #60C0F0);
`;

const TextBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
`;

const Heading = styled.span`
  /* CLAUDE.md typography rule: Plus Jakarta Sans for headings. */
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Supporting = styled.span`
  font-size: 0.8125rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.75));
  line-height: 1.3;
`;

const ReturnBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 45%, transparent);
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.25s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent);
    border-color: var(--accent-secondary, #8B5CF6);
    /* Dual-Button Glow (CLAUDE.md rule 32): Purple bg → Cyan glow on hover. */
    box-shadow: 0 4px 20px -2px rgba(96, 192, 240, 0.5);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const DEFAULT_RETURN_PATH = '/dashboard/admin/client-management';

const ROLE_LABEL: Record<ViewAsRole, string> = {
  trainer: 'Trainer Dashboard',
  client: 'Client Dashboard',
};

/**
 * Persistent banner shown when an admin is viewing a non-admin dashboard.
 * Consumers are responsible for the role check (only render when
 * admin is viewing trainer/client).
 */
const ViewAsBanner: React.FC<ViewAsBannerProps> = ({
  activeRole,
  returnPath = DEFAULT_RETURN_PATH,
}) => {
  const navigate = useNavigate();

  return (
    <Bar role="status" aria-live="polite" data-testid="view-as-banner">
      <IconWrap aria-hidden="true">
        <Shield size={18} />
      </IconWrap>
      <TextBlock>
        <Heading>Admin view: {ROLE_LABEL[activeRole]}</Heading>
        <Supporting>
          You are still signed in as Admin. Actions audit to your admin account.
        </Supporting>
      </TextBlock>
      <ReturnBtn
        type="button"
        onClick={() => navigate(returnPath)}
        aria-label="Return to Admin Dashboard"
      >
        Return to Admin Dashboard
        <ArrowRight size={14} />
      </ReturnBtn>
    </Bar>
  );
};

export default ViewAsBanner;
