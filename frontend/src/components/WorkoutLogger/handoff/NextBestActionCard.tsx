/**
 * NextBestActionCard.tsx — Zone 3 "arrow" of the Post-Save Handoff.
 * Renders the server-resolved next-best-action. Defense-in-depth on the trainer-indispensability
 * doctrine: even though the server guards it, this component renders NOTHING if a client is ever
 * handed a trainerOnly action. Clients get read + do, never a plan decision.
 */
import React from 'react';
import { Eyebrow, NbaCard, NbaTitle, NbaBody, CtaButton } from './PostSaveHandoff.styles';
import { isTrainerRole, isInternalHref } from './handoffRoles';
import type { LoggerRole, NextBestAction } from './workoutHandoff.types';

interface NextBestActionCardProps {
  // Nullable to match the assembler (nba can be null on the degraded/create path). The component
  // already fail-closes on null (below), so the prop type admits it rather than lying to callers.
  nba: NextBestAction | null;
  viewerRole: LoggerRole;
  onNavigate: (href: string) => void;
  onEvent?: (event: string, payload?: Record<string, unknown>) => void;
}

const NextBestActionCard: React.FC<NextBestActionCardProps> = ({ nba, viewerRole, onNavigate, onEvent }) => {
  // Null-guard first — a missing nba must not throw and take down the whole modal.
  if (!nba) return null;
  // Fail-CLOSED: a trainerOnly action renders only for a provably trainer/admin viewer.
  // A leaked plan decision (client, 'CLIENT', undefined role) is worse than no card.
  if (nba.trainerOnly && !isTrainerRole(viewerRole)) return null;
  // Open-redirect defense: only ever navigate to an internal absolute path.
  if (!nba?.ctaLabel || !isInternalHref(nba?.href)) return null;

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
