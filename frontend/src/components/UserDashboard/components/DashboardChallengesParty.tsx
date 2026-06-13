/**
 * ============================================================================
 * FILE: DashboardChallengesParty.tsx
 * PURPOSE: Party (accountability squad) lane for the dashboard Challenges tab
 *          (workstream O2). The PartyHPBar / PartyCreateJoin widgets lost
 *          their only user-dashboard surface when the Feed tab unmounted —
 *          Challenges is their natural home: parties exist to keep a squad
 *          accountable to shared training goals.
 * HOW IT FITS: Mounted by UserDashboardTabsV3 inside the challenges panel,
 *          below ChallengesView. Sole user-dashboard mount of useParty
 *          (ClientCommunityPage keeps its own on the client dashboard).
 * ============================================================================
 */
import React from 'react';
import styled from 'styled-components';
import { useParty } from '../../../hooks/social/useParty';
import { PartyCreateJoin, PartyHPBar } from '../../Social/RPG';

/* O3 party↔challenge fusion (copy-level): squads sit under the challenge
   board and the line ties them together. HP driven by member adherence is
   the backend follow-up (see audit backlog). */
const SquadContext = styled.p`
  margin: 0.6rem 0 0;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
  font: 700 0.8rem/1.5 var(--font-ui, 'Sora', sans-serif);
`;

const DashboardChallengesParty: React.FC = () => {
  const { party, myRole, createParty, joinParty, leaveParty, isLoading } = useParty();

  // No skeleton: the panel is secondary to ChallengesView above it, and the
  // create/join card flashing in-and-out would read as jank.
  if (isLoading) return null;

  return (
    <div>
      {party ? (
        <PartyHPBar party={party} myRole={myRole} onLeave={leaveParty} />
      ) : (
        <PartyCreateJoin onCreate={createParty} onJoin={joinParty} />
      )}
      <SquadContext>
        Squads train against the challenges above together — every member who
        keeps logging keeps the party strong.
      </SquadContext>
    </div>
  );
};

export default DashboardChallengesParty;
