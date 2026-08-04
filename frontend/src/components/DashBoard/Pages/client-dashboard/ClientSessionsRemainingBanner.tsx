/**
 * ============================================================================
 * FILE: ClientSessionsRemainingBanner.tsx
 * PURPOSE: Surface the paying client's session balance — the single most
 *          commercially important number for a $175/session client — at the
 *          very top of /dashboard/client/overview.
 * ============================================================================
 *
 * WHY THIS EXISTS
 * Pre-launch audit (LAUNCH-AUDIT-CLIENT-DASH-2026-08-03) found sessions-remaining
 * appeared ONLY on the Book Session page, never on the client home. This banner
 * closes that gap using the canonical credits source (`useSessionCredits` →
 * GET /api/user/credits) so there is one source of truth, not a second one.
 *
 * DISCIPLINE
 * - Swan Card / data-card standard: sapphire gradient surface, chrome edge,
 *   low-motion (no pointer tracking), Crystalline Swan tokens with fallbacks.
 * - Non-deducting sources (Move Fitness / external) do not consume a Swan
 *   session balance, so the numeric balance is not rendered for them.
 * - Honest states: loading skeleton, error copy (never a fabricated number),
 *   and a low-balance nudge at < 3.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { css } from 'styled-components';
import { CalendarPlus, AlertTriangle } from 'lucide-react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useSessionCredits } from '../../../UniversalMasterSchedule/hooks/useSessionCredits';
import { isNonDeductingClientSource } from '../../workspaces/clients-team/clientSessionSignal';

const LOW_BALANCE_THRESHOLD = 3;

const Banner = styled.section<{ $low: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 18px 22px;
  margin: 0 0 16px;
  border-radius: 16px;
  background: linear-gradient(
    135deg,
    var(--surface-elevated, #003080) 0%,
    var(--bg-primary, #002060) 100%
  );
  border: 1px solid ${({ $low }) =>
    $low
      ? 'color-mix(in srgb, var(--warning, #C6A84B) 45%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent)'};
  box-shadow: 0 4px 24px -12px color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
`;

const Left = styled.div`
  display: flex;
  align-items: baseline;
  gap: 12px;
  min-width: 0;
`;

const Value = styled.span<{ $low: boolean }>`
  font-family: 'Sora', sans-serif;
  font-size: clamp(2rem, 6vw, 2.75rem);
  font-weight: 800;
  line-height: 1;
  color: ${({ $low }) =>
    $low ? 'var(--warning, #C6A84B)' : 'var(--accent-primary, #60C0F0)'};
  text-shadow: 0 0 18px
    color-mix(in srgb, currentColor 45%, transparent);
`;

const Meta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const Label = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

const SubMeta = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  color: var(--text-secondary, #4070C0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const LowNudge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  color: var(--warning, #C6A84B);
`;

const BookButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 20px;
  border-radius: 12px;
  border: none;
  background: var(--accent-secondary, #8B5CF6);
  color: var(--text-heading, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  &:hover {
    box-shadow: 0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent);
    transform: translateY(-1px);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
  }
`;

const skeleton = css`
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  border-radius: 8px;
`;
const SkeletonValue = styled.span`
  ${skeleton};
  width: 56px;
  height: 40px;
`;
const SkeletonLabel = styled.span`
  ${skeleton};
  width: 140px;
  height: 14px;
`;

interface Props {
  /** the client's source; controls whether a deducting balance applies */
  clientSource?: string | null;
  /** real logged-session facts for the non-deducting engagement variant */
  sessionsThisMonth?: number;
  streakDays?: number;
}

const BannerInner: React.FC<Props> = ({ clientSource, sessionsThisMonth, streakDays }) => {
  const navigate = useNavigate();
  // Non-deducting members (Move Fitness / external) do not draw down a Swan
  // session balance — showing them a numeric count would be misleading.
  const deducts = !isNonDeductingClientSource(clientSource);
  const { data, isLoading, isError } = useSessionCredits(deducts);

  if (!deducts) {
    // Panel gap (h): non-deducting clients paid real money and previously got
    // LESS product (no banner at all). Same engagement framing, zero
    // deduction/booking language, zero Swan-balance claims. Renders only when
    // real logged facts exist — never a fabricated stat.
    if (!sessionsThisMonth && !streakDays) return null;
    // Unlike the Swan variant (whose Book CTA carries the count in its
    // aria-label), this variant has no button — so the number must NOT be
    // aria-hidden or screen readers hear the label with no value.
    return (
      <Banner $low={false} data-testid="client-engagement-banner">
        <Left>
          <Value $low={false}>{sessionsThisMonth || streakDays}</Value>
          <Meta>
            <Label>
              {sessionsThisMonth
                ? `Session${sessionsThisMonth === 1 ? '' : 's'} Completed This Month`
                : `Day Streak`}
            </Label>
            {sessionsThisMonth && streakDays ? <SubMeta>{streakDays}-day streak</SubMeta> : null}
          </Meta>
        </Left>
      </Banner>
    );
  }

  if (isLoading) {
    return (
      <Banner $low={false} aria-busy="true">
        <Left>
          <SkeletonValue aria-hidden="true" />
          <Meta><SkeletonLabel aria-hidden="true" /></Meta>
        </Left>
      </Banner>
    );
  }

  if (isError || !data) {
    return (
      <Banner $low={false} role="status">
        <Left>
          <Meta>
            <Label>Sessions Remaining</Label>
            <SubMeta>Unable to load your session balance right now.</SubMeta>
          </Meta>
        </Left>
        <BookButton onClick={() => navigate('/dashboard/client/schedule')}>
          <CalendarPlus size={18} /> Book a session
        </BookButton>
      </Banner>
    );
  }

  const remaining = data.sessionsRemaining;
  const low = remaining < LOW_BALANCE_THRESHOLD;
  const expires = data.expiresAt
    ? new Date(data.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <Banner $low={low}>
      <Left>
        <Value $low={low} aria-hidden="true">{remaining}</Value>
        <Meta>
          <Label>
            {remaining === 1 ? 'Session Remaining' : 'Sessions Remaining'}
          </Label>
          {data.packageName && <SubMeta>{data.packageName}</SubMeta>}
          {expires && <SubMeta>Expires {expires}</SubMeta>}
          {low && (
            <LowNudge>
              <AlertTriangle size={13} />
              {remaining === 0 ? 'Book more to keep training' : 'Running low — book soon'}
            </LowNudge>
          )}
        </Meta>
      </Left>
      <BookButton
        onClick={() => navigate('/dashboard/client/schedule')}
        aria-label={`You have ${remaining} training ${remaining === 1 ? 'session' : 'sessions'} remaining. Book a session.`}
      >
        <CalendarPlus size={18} /> Book a session
      </BookButton>
    </Banner>
  );
};

/**
 * Provider-safe wrapper: the banner uses react-query; the app root provides a
 * QueryClient in production, but harness/test mounts (and any future portal
 * mount) may not. A widget must never crash its host over a missing cache
 * provider — when absent, it self-provides an isolated local client. The
 * try/catch hook call is unconditional on every render, so hook order is
 * stable (Rules of Hooks hold).
 */
const ClientSessionsRemainingBanner: React.FC<Props> = (props) => {
  let hasProvider = true;
  try {
    useQueryClient();
  } catch {
    hasProvider = false;
  }
  const [localClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  }));

  const inner = <BannerInner {...props} />;
  return hasProvider ? inner : (
    <QueryClientProvider client={localClient}>{inner}</QueryClientProvider>
  );
};

export default ClientSessionsRemainingBanner;
