/**
 * COMPONENT: SelectedClientTrainingHeader
 * PURPOSE: Compact selected-client training toolbar for the canonical Client Hub.
 * OWNER: Codex
 * LAST VALIDATED: 2026-06-22
 *
 * WIREFRAME:
 * +-------------------------------------------------------------+
 * | client name + key stats | Log | Plan | Progress | Swan | More |
 * +-------------------------------------------------------------+
 * | optional full daily flow + client detail card                |
 * +-------------------------------------------------------------+
 *
 * DATA FLOW:
 * Props in: selected client summary and existing action handlers.
 * State: local details disclosure only.
 * API calls: none.
 * Events: forwards the same log, plan, progress, and Swan handlers.
 */

import React, { useId, useState } from 'react';
import { ChevronDown, ClipboardList, Dumbbell, MessageCircle, TrendingUp } from 'lucide-react';
import { HeaderSection } from '../ClientsWorkspace.styles';
import ClientDailyActionStrip from './ClientDailyActionStrip';
import ClientHeaderCard from './ClientHeaderCard';
import type { ClientOption } from './ClientSelectorDropdown';
import { getClientDisplayName } from './clientIdentity';
import { getClientSessionSignal, normalizeAvailableSessions } from './clientSessionSignal';
import {
  CompactActionButton,
  CompactActions,
  CompactEyebrow,
  CompactMeta,
  CompactPill,
  CompactTitle,
  CompactTrainingCopy,
  CompactTrainingHeaderShell,
  DetailsToggleButton,
  ExpandedTrainingDetails,
} from './SelectedClientTrainingHeader.styles';

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
}) => {
  const detailsId = useId();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const clientName = getClientDisplayName(client);
  const sessionsLeft = normalizeAvailableSessions(client.availableSessions);
  const sessionSignal = getClientSessionSignal({
    clientSource: client.clientSource,
    availableSessions: sessionsLeft,
  });

  return (
    <HeaderSection>
      <CompactTrainingHeaderShell aria-label={`${clientName} training actions`}>
        <CompactTrainingCopy>
          <CompactEyebrow>Selected client</CompactEyebrow>
          <CompactTitle>{clientName}</CompactTitle>
          <CompactMeta>
            <CompactPill>{client.workoutCount || 0} workouts</CompactPill>
            <CompactPill $tone={sessionSignal.tone}>{sessionSignal.label}</CompactPill>
            {onboardingPct != null && onboardingPct < 100 && (
              <CompactPill>{onboardingPct}% onboarding</CompactPill>
            )}
          </CompactMeta>
        </CompactTrainingCopy>

        <CompactActions>
          <CompactActionButton type="button" $variant="primary" onClick={onLogToday} aria-label={`Log today for ${clientName}`}>
            <Dumbbell size={16} />
            <span>Log</span>
          </CompactActionButton>
          <CompactActionButton type="button" onClick={onPlanNext} aria-label={`Plan next for ${clientName}`}>
            <ClipboardList size={16} />
            <span>Plan</span>
          </CompactActionButton>
          <CompactActionButton type="button" onClick={onViewProgress} aria-label={`View ${clientName} progress`}>
            <TrendingUp size={16} />
            <span>Progress</span>
          </CompactActionButton>
          <CompactActionButton type="button" onClick={onDictateAI} aria-label={`Dictate to Swan for ${clientName}`}>
            <MessageCircle size={16} />
            <span>Swan</span>
          </CompactActionButton>
          <DetailsToggleButton
            type="button"
            $open={detailsOpen}
            aria-expanded={detailsOpen}
            aria-controls={detailsId}
            onClick={() => setDetailsOpen((open) => !open)}
          >
            <span>Details</span>
            <ChevronDown size={16} />
          </DetailsToggleButton>
        </CompactActions>
      </CompactTrainingHeaderShell>

      {detailsOpen && (
        <ExpandedTrainingDetails id={detailsId}>
          <ClientDailyActionStrip
            clientName={clientName}
            workoutCount={client.workoutCount || 0}
            sessionsLeft={sessionsLeft}
            clientSource={client.clientSource}
            onLogToday={onLogToday}
            onPlanNext={onPlanNext}
            onViewProgress={onViewProgress}
            onDictateAI={onDictateAI}
          />
          <ClientHeaderCard client={client as any} onboardingPct={onboardingPct} />
        </ExpandedTrainingDetails>
      )}
    </HeaderSection>
  );
};

export default SelectedClientTrainingHeader;
