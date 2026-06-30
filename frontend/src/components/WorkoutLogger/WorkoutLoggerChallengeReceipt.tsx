/**
 * ============================================================================
 * FILE: WorkoutLoggerChallengeReceipt.tsx
 * PURPOSE: Backend-authoritative challenge impact receipt after workout saves.
 * OWNER: Codex | LAST MODIFIED: 2026-06-30
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a compact post-workout challenge receipt from
 * the challengeProgress payload returned by the workout save API.
 *
 * HOW IT FITS IN THE APP: Used by WorkoutLogger for no-navigation save flows
 * and by ClientMyWorkoutsPage when the self-route carries save state forward.
 *
 * KEY DECISIONS: Never invent challenge progress or XP on the client; completed
 * challenges take display priority over smaller progress moves, and failed or
 * empty receipts render nothing.
 * ============================================================================
 */
import React from 'react';
import { Trophy, TrendingUp } from 'lucide-react';
import styled from 'styled-components';

import type { ChallengeProgressImpactReceipt } from '../../services/nasmApiService';
import { CS, withAlpha } from './WorkoutLoggerCS';
import { buildWorkoutChallengeImpactSummary } from './WorkoutLogger.submitReceipt';

interface WorkoutLoggerChallengeReceiptProps {
  progress?: ChallengeProgressImpactReceipt | null;
}

const WorkoutLoggerChallengeReceipt: React.FC<WorkoutLoggerChallengeReceiptProps> = ({ progress }) => {
  const summary = buildWorkoutChallengeImpactSummary(progress);
  if (!summary) return null;

  const Icon = summary.completed ? Trophy : TrendingUp;
  const additionalUpdates = summary.updateItems.slice(1, summary.moreCount + 1);
  const hiddenUpdateCount = Math.max(0, summary.moreCount - additionalUpdates.length);

  return (
    <ReceiptCard role="status" aria-live="polite" aria-label="Challenge impact">
      <IconSlot $completed={summary.completed}>
        <Icon size={20} aria-hidden="true" />
      </IconSlot>
      <ReceiptCopy>
        <Kicker>Challenge impact</Kicker>
        <ReceiptTitle>{summary.headline}</ReceiptTitle>
        <ReceiptDetail>{summary.detail}</ReceiptDetail>
        {additionalUpdates.length > 0 && (
          <UpdateList aria-label="Challenge updates from this workout">
            {additionalUpdates.map((item) => (
              <UpdateItem key={`${item.challengeId ?? item.title}-${item.detail}`}>
                <UpdateTitle>
                  <span>{item.title}</span>
                  {item.completed && <CompletePill>Complete</CompletePill>}
                </UpdateTitle>
                <UpdateDetail>{item.detail}</UpdateDetail>
              </UpdateItem>
            ))}
          </UpdateList>
        )}
        {hiddenUpdateCount > 0 && (
          <ReceiptDetail>
            {hiddenUpdateCount} more challenge{hiddenUpdateCount === 1 ? '' : 's'} also updated.
          </ReceiptDetail>
        )}
      </ReceiptCopy>
      {summary.xpEarned && summary.xpEarned > 0 && (
        <XpBadge aria-label={`${summary.xpEarned} XP earned`}>
          <strong>+{summary.xpEarned}</strong>
          <span>XP</span>
        </XpBadge>
      )}
    </ReceiptCard>
  );
};

export default WorkoutLoggerChallengeReceipt;

const ReceiptCard = styled.section`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.875rem;
  margin: 0 0 1.25rem;
  padding: 1rem;
  border: 1px solid var(--border-primary-soft, ${withAlpha(CS.gaming, 0.26)});
  border-radius: 8px;
  background:
    linear-gradient(135deg, ${withAlpha(CS.gaming, 0.12)}, transparent 48%),
    var(--bg-elevated, ${CS.cardSolid});
  box-shadow: 0 14px 32px ${withAlpha(CS.bgDeep, 0.28)};

  @media (max-width: 560px) {
    grid-template-columns: auto minmax(0, 1fr);
  }
`;

const IconSlot = styled.span<{ $completed: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  color: ${({ $completed }) => ($completed ? CS.accent : CS.gaming)};
  background: ${({ $completed }) => withAlpha($completed ? CS.accent : CS.gaming, 0.14)};
  border: 1px solid ${({ $completed }) => withAlpha($completed ? CS.accent : CS.gaming, 0.36)};
`;

const ReceiptCopy = styled.div`
  min-width: 0;
`;

const Kicker = styled.span`
  display: block;
  margin-bottom: 0.125rem;
  color: var(--accent-primary, ${CS.gaming});
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
`;

const ReceiptTitle = styled.h2`
  margin: 0;
  color: var(--text-primary, ${CS.text});
  font-size: 1rem;
  line-height: 1.25;
`;

const ReceiptDetail = styled.p`
  margin: 0.25rem 0 0;
  color: var(--text-secondary, ${CS.textSecondary});
  font-size: 0.875rem;
  line-height: 1.45;
`;

const UpdateList = styled.ul`
  display: grid;
  gap: 0.5rem;
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0;
`;

const UpdateItem = styled.li`
  display: grid;
  gap: 0.2rem;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--border-secondary-soft, ${withAlpha(CS.glow, 0.2)});
  border-radius: 8px;
  background: linear-gradient(135deg, ${withAlpha(CS.glow, 0.1)}, ${withAlpha(CS.secondary, 0.08)});
`;

const UpdateTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.625rem;
  color: var(--text-primary, ${CS.text});
  font: 800 0.82rem/1.3 var(--font-ui, 'Sora', sans-serif);

  span:first-child {
    min-width: 0;
    overflow-wrap: anywhere;
  }
`;

const UpdateDetail = styled.p`
  margin: 0;
  color: var(--text-secondary, ${CS.textSecondary});
  font: 700 0.78rem/1.45 var(--font-ui, 'Sora', sans-serif);
`;

const CompletePill = styled.span`
  flex: none;
  border: 1px solid var(--accent-gold, ${withAlpha(CS.accent, 0.45)});
  border-radius: 999px;
  padding: 0.15rem 0.45rem;
  color: var(--accent-gold, ${CS.accent});
  background: ${withAlpha(CS.accent, 0.12)};
  font: 800 0.68rem/1.2 var(--font-ui, 'Sora', sans-serif);
  text-transform: uppercase;
`;

const XpBadge = styled.span`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  min-height: 44px;
  padding: 0.45rem 0.625rem;
  border-radius: 8px;
  border: 1px solid var(--accent-gold, ${withAlpha(CS.accent, 0.45)});
  background: ${withAlpha(CS.accent, 0.12)};
  color: var(--accent-gold, ${CS.accent});
  font-family: 'Fira Code', monospace;

  strong {
    font-size: 1rem;
    line-height: 1;
  }

  span {
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0;
  }

  @media (max-width: 560px) {
    grid-column: 2;
    justify-self: start;
    margin-top: 0.25rem;
  }
`;