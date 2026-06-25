/**
 * ============================================================================
 * FILE: ClientDailyActionStrip.tsx
 * PURPOSE: Action-first cockpit for the selected Client Hub profile.
 * OWNER: Codex | LAST MODIFIED: 2026-05-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Keeps Sean's daily coaching loop one tap away:
 * log the live session, plan the next block, or open the review-gated AI lane.
 *
 * HOW IT FITS IN THE APP: ClientsWorkspace -> selected client header -> this strip.
 */

import React from 'react';
import styled from 'styled-components';
import { ClipboardList, Dumbbell, MessageCircle, TrendingUp } from 'lucide-react';
import { getClientSessionSignal, type ClientSessionSignalTone } from './clientSessionSignal';
import { swanClientActionButton, swanDataCardShell, swanPill } from './clientCardSystem';

interface ClientDailyActionStripProps {
  clientName: string;
  workoutCount: number;
  sessionsLeft: number;
  clientSource?: string;
  sessionBillingMode?: string;
  onLogToday: () => void;
  onPlanNext: () => void;
  onViewProgress: () => void;
  onDictateAI: () => void;
}

const Strip = styled.section`
  --swan-card-padding: 14px 16px;
  --swan-card-radius: 14px;
  ${swanDataCardShell}
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto;
  gap: 14px;
  align-items: center;
  margin-bottom: 12px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 520px) {
    --swan-card-padding: 10px 12px 12px;
    --swan-card-radius: 12px;
    gap: 8px;
    margin-bottom: 8px;
  }
`;

const CopyBlock = styled.div`
  min-width: 0;
`;

const Eyebrow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
`;

const Title = styled.h3`
  margin: 0;
  color: var(--text-heading, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 20px;
  line-height: 1.18;

  @media (max-width: 560px) {
    font-size: 17px;
  }

  @media (max-width: 520px) {
    display: none;
  }
`;

const DetailLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  color: var(--text-muted, rgba(224, 236, 244, 0.82));
  font-family: 'Sora', sans-serif;
  font-size: 13px;

  @media (max-width: 520px) {
    gap: 6px;
    margin-top: 6px;
    font-size: 12px;
  }
`;

const Metric = styled.span<{ $tone?: ClientSessionSignalTone }>`
  ${swanPill}
  display: inline-flex;
  align-items: center;
  background: ${({ $tone = 'default' }) => {
    if ($tone === 'gold') return 'color-mix(in srgb, var(--bg-base, #0A0A0F) 78%, var(--accent-gold, #C6A84B) 10%)';
    if ($tone === 'warning') return 'color-mix(in srgb, var(--bg-base, #0A0A0F) 78%, var(--accent-secondary, #8B5CF6) 12%)';
    return 'color-mix(in srgb, var(--bg-base, #0A0A0F) 78%, var(--accent-primary, #60C0F0) 8%)';
  }};
  max-width: 100%;

  @media (max-width: 520px) {
    min-height: 26px;
    padding: 3px 8px;
  }
`;

const MetricStack = styled.span`
  display: grid;
  gap: 2px;
`;

const MetricNote = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  font-weight: 700;
`;

const ActionGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(108px, 1fr));
  gap: 8px;

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 7px;
  }

  @media (max-width: 420px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
  }
`;

const CockpitButton = styled.button<{ $variant?: 'primary' }>`
  ${swanClientActionButton}
  --swan-action-border: ${({ $variant }) =>
    $variant === 'primary'
      ? 'var(--accent-secondary, #8B5CF6)'
      : 'var(--border-soft, rgba(96, 192, 240, 0.14))'};
  --swan-action-bg: ${({ $variant }) =>
    $variant === 'primary'
      ? 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-tertiary, #4070C0))'
      : 'color-mix(in srgb, var(--bg-elevated, #1A1A24) 84%, transparent)'};
  width: 100%;
  min-width: 0;
  padding: 10px 13px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 800;
  text-align: center;
  white-space: normal;

  @media (max-width: 420px) {
    gap: 6px;
    padding: 8px 8px;
    font-size: 12px;
  }
`;

const ClientDailyActionStrip: React.FC<ClientDailyActionStripProps> = ({
  clientName,
  workoutCount,
  sessionsLeft,
  clientSource,
  sessionBillingMode,
  onLogToday,
  onPlanNext,
  onViewProgress,
  onDictateAI,
}) => {
  const sessionSignal = getClientSessionSignal({ clientSource, sessionBillingMode, availableSessions: sessionsLeft });

  return (
    <Strip aria-label={`${clientName} daily training actions`}>
      <CopyBlock>
        <Eyebrow>
          <TrendingUp size={14} />
          Daily training flow
        </Eyebrow>
        <Title>{clientName}</Title>
        <DetailLine>
          <Metric>{workoutCount} workouts logged</Metric>
          <Metric $tone={sessionSignal.tone}>
            <MetricStack>
              <span>{sessionSignal.label}</span>
              <MetricNote>{sessionSignal.note}</MetricNote>
            </MetricStack>
          </Metric>
        </DetailLine>
      </CopyBlock>

      <ActionGroup>
        <CockpitButton
          type="button"
          $variant="primary"
          onClick={onLogToday}
          aria-label={`Log today for ${clientName}`}
        >
          <Dumbbell size={16} />
          Log Today
        </CockpitButton>
        <CockpitButton
          type="button"
          onClick={onPlanNext}
          aria-label={`Plan next for ${clientName}`}
        >
          <ClipboardList size={16} />
          Plan Next
        </CockpitButton>
        <CockpitButton
          type="button"
          onClick={onViewProgress}
          aria-label={`View ${clientName} progress`}
        >
          <TrendingUp size={16} />
          Progress
        </CockpitButton>
        <CockpitButton
          type="button"
          onClick={onDictateAI}
          aria-label={`Dictate to Swan for ${clientName}`}
        >
          <MessageCircle size={16} />
          Swan Coach
        </CockpitButton>
      </ActionGroup>
    </Strip>
  );
};

export default ClientDailyActionStrip;
