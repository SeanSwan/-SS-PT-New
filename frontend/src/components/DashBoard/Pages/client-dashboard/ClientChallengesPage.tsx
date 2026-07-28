/**
 * FILE: ClientChallengesPage.tsx
 * PURPOSE: Dedicated client dashboard challenge route using the live challenge board.
 * PARENT: UniversalDashboardLayout client route registry.
 */

import React from 'react';
import styled from 'styled-components';
import ChallengesView from '../../../Social/Challenges/ChallengesView';
import DashboardChallengesParty from '../../../UserDashboard/components/DashboardChallengesParty';
import ClientChallengeSubmissionGate from './ClientChallengeSubmissionGate';
import {
  DashboardBackgroundSettingsPanel,
  DashboardBackgroundSurface,
} from '../../shared/DashboardBackgroundStudio';

const PageShell = styled.div`
  display: grid;
  width: min(100%, 1480px);
  margin: 0 auto;
  padding: 28px clamp(18px, 3vw, 44px) 48px;
  gap: 28px;
  color: var(--text-primary, #E0ECF4);
`;

const Header = styled.header`
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(260px, 0.65fr);
  align-items: end;
  gap: 24px;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  padding-bottom: 24px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
    align-items: start;
  }
`;

const Kicker = styled.p`
  margin: 0 0 8px;
  color: var(--accent-primary, #60C0F0);
  font: 800 0.86rem/1.2 var(--font-ui, 'Sora', sans-serif);
`;

const Title = styled.h1`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font: 900 2.5rem/1.05 var(--font-heading, 'Plus Jakarta Sans', sans-serif);

  @media (max-width: 560px) {
    font-size: 2rem;
  }
`;

const Intro = styled.p`
  max-width: 68ch;
  margin: 12px 0 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent);
  font: 600 1rem/1.65 var(--font-ui, 'Sora', sans-serif);
`;

const UtilitySlot = styled.div`
  justify-self: end;
  min-width: min(100%, 260px);

  @media (max-width: 760px) {
    justify-self: start;
  }
`;

const ChallengeRegion = styled.section`
  min-width: 0;
`;

const SquadSection = styled.section`
  display: grid;
  gap: 14px;
  min-width: 0;
  border-top: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent);
  padding-top: 24px;
`;

const SectionTitle = styled.h2`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font: 850 1.2rem/1.25 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
`;

const SectionCopy = styled.p`
  max-width: 64ch;
  margin: 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 66%, transparent);
  font: 600 0.95rem/1.55 var(--font-ui, 'Sora', sans-serif);
`;

const ClientChallengesPage: React.FC = () => (
  <DashboardBackgroundSurface>
    <PageShell aria-labelledby="client-challenges-title">
      <Header>
        <div>
          <Kicker>Proving Ground</Kicker>
          <Title id="client-challenges-title">Challenges</Title>
          <Intro>
            Pick the campaign that matches today's training, join it, and keep your progress visible from the live challenge board.
          </Intro>
        </div>
        <UtilitySlot>
          <DashboardBackgroundSettingsPanel scopeLabel="Client" />
        </UtilitySlot>
      </Header>

      <ChallengeRegion aria-label="Active, upcoming, and completed challenges">
        <ChallengesView />
      </ChallengeRegion>

      <ClientChallengeSubmissionGate />

      <SquadSection aria-labelledby="client-challenge-squad-title">
        <div>
          <SectionTitle id="client-challenge-squad-title">Squad Support</SectionTitle>
          <SectionCopy>
            Bring your party into the same rhythm so challenge progress turns into shared accountability.
          </SectionCopy>
        </div>
        <DashboardChallengesParty />
      </SquadSection>
    </PageShell>
  </DashboardBackgroundSurface>
);

export default ClientChallengesPage;