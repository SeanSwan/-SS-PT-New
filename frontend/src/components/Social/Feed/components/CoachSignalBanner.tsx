/**
 * COMPONENT: CoachSignalBanner
 * PURPOSE: Gold-framed coach recognition strip rendered on a feed PostCard when
 *          a coach signaled it today (S1 of the Social Feed Upgrade blueprint).
 * DESIGN:  HY3 seat spec — social-feed-upgrade-2026-09-16/reply-hy3-design-full.md §Component 2.
 *          Gold = earned recognition (reserved token semantics); ONE 1200ms pulse;
 *          static under prefers-reduced-motion (rule 25).
 * API:     Payload arrives on the feed post object (GET /api/social/feed → post.coachSignal).
 * NOTES:   Display-only — no interactions, so no touch-target requirements. Kept out of
 *          PostCard.tsx which sits at the 300-line ceiling (rule 4).
 */

import React from 'react';
import styled, { css, keyframes } from 'styled-components';
import { ShieldCheck } from 'lucide-react';

export interface CoachSignalData {
  coachId: number;
  coachDisplayName: string;
  coachPhoto?: string | null;
  note?: string | null;
}

interface CoachSignalBannerProps {
  signal: CoachSignalData;
}

const goldPulse = keyframes`
  0% { box-shadow: 0 0 0 rgba(198, 168, 75, 0); }
  50% { box-shadow: 0 0 8px rgba(198, 168, 75, 0.4); }
  100% { box-shadow: 0 0 0 rgba(198, 168, 75, 0); }
`;

const Banner = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  margin: 8px 12px 4px;
  padding: 8px 12px;
  border: 1px solid var(--gold-accent, #C6A84B);
  border-left-width: 3px;
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(198, 168, 75, 0.08), rgba(198, 168, 75, 0.02));
  animation: ${css`${goldPulse}`} 1200ms ease-out 1;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const CoachAvatar = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`;

const AvatarFallback = styled.span`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(198, 168, 75, 0.15);
  color: var(--gold-accent, #C6A84B);
  flex-shrink: 0;
`;

const TextStack = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const CoachLine = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-heading, 'Plus Jakarta Sans'), sans-serif;
  font-weight: 700;
  font-size: 13px;
  line-height: 16px;
  color: var(--text-primary, #E0ECF4);
`;

const SignalLabel = styled.span`
  font-family: var(--font-ui, 'Sora'), sans-serif;
  font-weight: 400;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--gold-accent, #C6A84B);
`;

const NoteLine = styled.span`
  font-family: var(--font-ui, 'Sora'), sans-serif;
  font-size: 12px;
  line-height: 16px;
  color: rgba(224, 236, 244, 0.85);
  overflow-wrap: anywhere;
`;

const CoachSignalBanner: React.FC<CoachSignalBannerProps> = ({ signal }) => {
  if (!signal || !signal.coachDisplayName) return null;

  return (
    <Banner data-testid="coach-signal-banner">
      {signal.coachPhoto ? (
        <CoachAvatar src={signal.coachPhoto} alt="" />
      ) : (
        <AvatarFallback aria-hidden="true">
          <ShieldCheck size={14} />
        </AvatarFallback>
      )}
      <TextStack>
        <CoachLine>
          {signal.coachDisplayName}
          <SignalLabel>Coach Signal</SignalLabel>
        </CoachLine>
        {signal.note ? <NoteLine>{signal.note}</NoteLine> : null}
      </TextStack>
    </Banner>
  );
};

export default React.memo(CoachSignalBanner);
