/**
 * NextBestActionCard.tsx — Zone 3 "arrow" of the Post-Save Handoff.
 * Renders the server-resolved next-best-action. Defense-in-depth on the trainer-indispensability
 * doctrine: even though the server guards it, this component renders NOTHING if a client is ever
 * handed a trainerOnly action. Clients get read + do, never a plan decision.
 */
import React from 'react';
import { Eyebrow, NbaCard, NbaTitle, NbaBody, CtaButton } from './PostSaveHandoff.styles';
import type { LoggerRole, NextBestAction } from './workoutHandoff.types';

interface NextBestActionCardProps {
  nba: NextBestAction;
  viewerRole: LoggerRole;
  onNavigate: (href: string) => void;
  onEvent?: (event: string, payload?: Record<string, unknown>) => void;
}

const NextBestActionCard: React.FC<NextBestActionCardProps> = ({ nba, viewerRole, onNavigate, onEvent }) => {
  // Client + trainerOnly must never render — a leaked plan decision is worse than no card.
  if (viewerRole === 'client' && nba.trainerOnly) return null;
  if (!nba?.href || !nba?.ctaLabel) return null;

  const handleClick = () => {
    onEvent?.('nba_cta_tapped', { kind: nba.kind });
    onNavigate(nba.href);
  };

  return (
    <div>
      <Eyebrow $tone="accent">Next best action</Eyebrow>
      <NbaCard>
        <NbaTitle>{nba.title}</NbaTitle>
        {nba.body ? <NbaBody>{nba.body}</NbaBody> : null}
        <CtaButton type="button" onClick={handleClick}>{nba.ctaLabel}</CtaButton>
      </NbaCard>
    </div>
  );
};

export default NextBestActionCard;
