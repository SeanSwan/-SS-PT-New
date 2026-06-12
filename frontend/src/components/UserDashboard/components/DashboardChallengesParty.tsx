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
import { useParty } from '../../../hooks/social/useParty';
import { PartyCreateJoin, PartyHPBar } from '../../Social/RPG';

const DashboardChallengesParty: React.FC = () => {
  const { party, myRole, createParty, joinParty, leaveParty, isLoading } = useParty();

  // No skeleton: the panel is secondary to ChallengesView above it, and the
  // create/join card flashing in-and-out would read as jank.
  if (isLoading) return null;

  if (party) {
    return <PartyHPBar party={party} myRole={myRole} onLeave={leaveParty} />;
  }

  return <PartyCreateJoin onCreate={createParty} onJoin={joinParty} />;
};

export default DashboardChallengesParty;
