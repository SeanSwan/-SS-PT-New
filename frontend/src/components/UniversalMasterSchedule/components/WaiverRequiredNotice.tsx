/**
 * WaiverRequiredNotice — honest blocker state for the client schedule
 * ==================================================================
 * The backend waiver gate (backend/middleware/waiverGate.mjs) 403s
 * /api/sessions for client/user accounts without a linked waiver record.
 * Before 2026-09-12 that 403 was swallowed into a silent empty list and
 * the client saw "No Upcoming Sessions" with no explanation and no way
 * to fix it.
 *
 * UniversalMasterSchedule (client mode) renders this notice when
 * useCalendarData exposes the SESSIONS_WAIVER_REQUIRED sentinel through
 * errors.sessions. The CTA deep-links into the waiver flow with a
 * returnUrl back to the exact schedule surface the client came from.
 *
 * Design: Crystalline Swan tokens with fallbacks (CLAUDE.md rule 6),
 * 44px+ CTA (rule 2), visible focus ring (rules 3/22), low-motion with a
 * prefers-reduced-motion fallback (rule 25), WCAG-AA text contrast.
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import styled from 'styled-components';

const NoticeCard = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  padding: 32px 24px;
  margin: 0 0 20px;
  border-radius: 20px;
  background:
    radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 14%, transparent) 0%, transparent 55%),
    var(--bg-surface, #1A1A24);
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, transparent);
`;

const IconBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  color: var(--accent-primary, #60C0F0);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
`;

const Title = styled.h2`
  margin: 0;
  font-family: var(--font-heading, 'Plus Jakarta Sans', sans-serif);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

const Body = styled.p`
  margin: 0;
  max-width: 46ch;
  font-size: 0.95rem;
  line-height: 1.55;
  color: var(--text-secondary, #A8BACC);
`;

const SignWaiverButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  min-width: min(260px, 100%);
  padding: 0 24px;
  margin-top: 4px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  color: var(--text-primary, #E0ECF4);
  background: var(--accent-secondary, #8B5CF6);
  /* Dual-Button Glow: purple button -> cyan glow */
  box-shadow: 0 0 18px color-mix(in srgb, var(--accent-primary, #60C0F0) 32%, transparent);
  transition: box-shadow 160ms ease, transform 160ms ease;

  &:hover {
    box-shadow: 0 0 26px color-mix(in srgb, var(--accent-primary, #60C0F0) 48%, transparent);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;

const WaiverRequiredNotice: React.FC = () => {
  const location = useLocation();
  const waiverHref = `/waiver?returnUrl=${encodeURIComponent(`${location.pathname}${location.search}`)}`;

  return (
    <NoticeCard aria-label="Waiver required before your schedule can load">
      <IconBadge>
        <ShieldAlert size={28} aria-hidden="true" />
      </IconBadge>
      <Title>Your schedule is waiting on your waiver</Title>
      <Body>
        SwanStudios keeps every session record behind a signed waiver.
        Sign yours once and your sessions will appear here right away.
      </Body>
      <SignWaiverButton to={waiverHref}>Sign your waiver</SignWaiverButton>
    </NoticeCard>
  );
};

export default WaiverRequiredNotice;
