/**
 * Selected-client daily training header for the canonical Client Hub.
 */

import React from 'react';
import { HeaderSection } from '../ClientsWorkspace.styles';
import ClientDailyActionStrip from './ClientDailyActionStrip';
import ClientHeaderCard from './ClientHeaderCard';
import type { ClientOption } from './ClientSelectorDropdown';
import { getClientDisplayName } from './clientIdentity';
import { normalizeAvailableSessions } from './clientSessionSignal';

interface SelectedClientTrainingHeaderProps {
  client: ClientOption;
  onboardingPct?: number;
  onLogToday: () => void;
  onPlanNext: () => void;
  onViewProgress: () => void;
  onDictateAI: () => void;
}

const SelectedClientTrainingHeader: React.FC<SelectedClientTrainingHeaderProps> = ({
  client,
  onboardingPct,
  onLogToday,
  onPlanNext,
  onViewProgress,
  onDictateAI,
}) => (
  <HeaderSection>
    <ClientDailyActionStrip
      clientName={getClientDisplayName(client)}
      workoutCount={client.workoutCount || 0}
      sessionsLeft={normalizeAvailableSessions(client.availableSessions)}
      clientSource={client.clientSource}
      onLogToday={onLogToday}
      onPlanNext={onPlanNext}
      onViewProgress={onViewProgress}
      onDictateAI={onDictateAI}
    />
    <ClientHeaderCard client={client as any} onboardingPct={onboardingPct} />
  </HeaderSection>
);

export default SelectedClientTrainingHeader;
