/**
 * ============================================================================
 * FILE: SaveSuccessPanel.tsx
 * PURPOSE: The Save-Success moment (Phase 2.1a, Fable Vision arc) — the 10
 *          seconds after a workout saves, upgraded from toast-and-vanish to
 *          the award beat: session headline + streak, honest billing line
 *          with a buy-more path at low balance, plan/challenge progress, and
 *          book-next — then Done hands control back to the mount's
 *          onComplete flow (navigation preserved, just deferred).
 * DATA TRUTH: every line renders only from real response/pulse data and is
 *          omitted when absent; XP copy is optimistic-honest (the 201 carries
 *          no xp key — awards land asynchronously server-side).
 * ============================================================================
 */
import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { CheckCircle2 } from 'lucide-react';
import type { DailyWorkoutForm } from '../../services/nasmApiService';
import WorkoutLoggerChallengeReceipt from './WorkoutLoggerChallengeReceipt';
import useProgressPulse from '../../hooks/analytics/useProgressPulse';
import { useAuth } from '../../context/AuthContext';
import { buildShareWorkoutPostData, shareWorkoutToFeed } from './shareWorkoutPost';
import type { ShareableExercise } from './shareWorkoutPost';

const Panel = styled.section`
  margin-top: 16px;
  padding: 18px;
  border-radius: 14px;
  background: var(--surface-elevated, #141419);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 25%, transparent);
  box-shadow: 0 0 24px color-mix(in srgb, var(--accent-secondary, #8b5cf6) 18%, transparent);
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Headline = styled.h3`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary, #e0ecf4);
  font-size: 18px;
  font-weight: 700;
`;

const BeatLine = styled.p`
  margin: 0;
  color: var(--text-primary, #e0ecf4);
  font-size: 14px;
  line-height: 1.5;
`;

const SoftLine = styled.p`
  margin: 0;
  color: var(--text-secondary, #9fb6c8);
  font-size: 13px;
  line-height: 1.5;
`;

/* Launch charter 4a: the PR celebration line — gold, no motion (text beat). */
const PrLine = styled.p`
  margin: 0;
  color: var(--accent-gold, #c6a84b);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.5;
`;

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const ActionButton = styled.button<{ $primary?: boolean }>`
  min-height: 44px;
  flex: 1 1 140px;
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  border: ${({ $primary }) => ($primary ? 'none' : '1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 35%, transparent)')};
  background: ${({ $primary }) => ($primary ? 'var(--accent-secondary, #8b5cf6)' : 'transparent')};
  color: ${({ $primary }) => ($primary ? 'var(--text-primary, #e0ecf4)' : 'var(--text-primary, #e0ecf4)')};
  box-shadow: ${({ $primary }) => ($primary ? '0 0 16px color-mix(in srgb, var(--accent-primary, #60c0f0) 35%, transparent)' : 'none')};

  &:focus-visible { outline: 2px solid var(--accent-primary, #60c0f0); outline-offset: 2px; }
`;

interface PlanProgressShape {
  advanced?: boolean | null;
  planCompleted?: boolean | null;
  next?: { weekNumber?: string | number | null; dayNumber?: string | number | null } | null;
  previous?: { weekNumber?: string | number | null; dayNumber?: string | number | null } | null;
}

export interface SaveSuccessPanelProps {
  form: DailyWorkoutForm;
  completedSets: number;
  formattedVolume: string;
  isSelfMode: boolean;
  challengeProgress: DailyWorkoutForm['challengeProgress'] | null;
  onDone: () => void;
  onBuyMore: () => void;
  onBookNext?: (() => void) | null;
  /** Session exercises for the self-mode Share CTA (rich feed attachment). */
  exercisesForShare?: ShareableExercise[] | null;
}

const toCount = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
};

const buildBillingLine = (form: DailyWorkoutForm, isSelfMode: boolean): string | null => {
  const billing = form.billing;
  if (!billing) return null;
  if (billing.status === 'previously_deducted') {
    return 'Covered by the scheduled session credit already deducted.';
  }
  const deducted = toCount(billing.creditsDeducted);
  const remaining = toCount(billing.remainingSessions);
  if (billing.status === 'deducted' && deducted && deducted > 0) {
    const suffix = remaining === null
      ? ''
      : ` — ${isSelfMode ? 'you have' : 'client has'} ${remaining} remaining`;
    return `Used ${deducted} session credit${deducted === 1 ? '' : 's'}${suffix}.`;
  }
  return null;
};

const buildPlanLine = (form: DailyWorkoutForm): string | null => {
  const progress = (form as { planProgress?: PlanProgressShape | null }).planProgress ?? null;
  if (!progress?.advanced) return null;
  if (progress.planCompleted) return 'Program complete — every planned day is logged. Time to celebrate and plan the next block.';
  const next = progress.next;
  if (next?.weekNumber && next?.dayNumber) {
    return `Plan advanced — next up: Week ${next.weekNumber}, Day ${next.dayNumber}.`;
  }
  return 'Plan advanced — your program cursor moved forward.';
};

/**
 * Launch charter 4a: split server-detected prEvents into celebrated records
 * (beat-a-prior-best, loudest first by % improvement, capped at 3 lines) and
 * a quiet count of first-lift baselines. Exported for tests.
 */
const buildPrBeat = (
  form: DailyWorkoutForm
): { records: NonNullable<DailyWorkoutForm['prEvents']>; firstCount: number } => {
  const events = Array.isArray(form.prEvents) ? form.prEvents : [];
  const records = events
    .filter((event) => !event.first && event.previous != null && event.value > 0)
    .sort((a, b) => {
      const gainA = a.previous ? (a.value - a.previous) / a.previous : 0;
      const gainB = b.previous ? (b.value - b.previous) / b.previous : 0;
      return gainB - gainA;
    })
    .slice(0, 3);
  const firstCount = events.filter((event) => event.first).length;
  return { records, firstCount };
};

const SaveSuccessPanel: React.FC<SaveSuccessPanelProps> = ({
  form,
  completedSets,
  formattedVolume,
  isSelfMode,
  challengeProgress,
  onDone,
  onBuyMore,
  onBookNext,
  exercisesForShare,
}) => {
  const { authAxios } = useAuth();
  const { status: pulseStatus, pulse } = useProgressPulse();
  const [shareState, setShareState] = useState<'idle' | 'posting' | 'shared' | 'failed'>('idle');
  const billingLine = buildBillingLine(form, isSelfMode);
  const planLine = buildPlanLine(form);
  const prBeat = buildPrBeat(form);
  const remaining = toCount(form.billing?.remainingSessions);
  const showBuyMore = isSelfMode && form.billing?.status === 'deducted' && remaining !== null && remaining <= 2;
  const streak = isSelfMode && pulseStatus === 'ready' ? pulse?.streak : null;

  // User-initiated share: consent-exempt by contract (socialAutoPost.mjs
  // gates only AUTOMATED posts) — this rich post is the user's own action.
  const shareData = useMemo(
    () => (isSelfMode ? buildShareWorkoutPostData(exercisesForShare ?? []) : null),
    [isSelfMode, exercisesForShare],
  );

  const handleShare = async () => {
    if (!shareData || shareState === 'posting') return;
    setShareState('posting');
    try {
      await shareWorkoutToFeed(authAxios, {
        content: `${completedSets} set${completedSets === 1 ? '' : 's'} · ${formattedVolume} — logged on SwanStudios.`,
        workoutData: shareData,
      });
      setShareState('shared');
    } catch {
      setShareState('failed');
    }
  };

  return (
    <Panel aria-label="Workout saved" role="status">
      <Headline>
        <CheckCircle2 size={20} aria-hidden="true" />
        Workout saved
      </Headline>
      <BeatLine>
        {completedSets} set{completedSets === 1 ? '' : 's'} · {formattedVolume} moved — another data point on every chart.
      </BeatLine>
      {prBeat.records.map((pr) => (
        <PrLine key={`${pr.exerciseName}-${pr.metric}`}>
          🏆 New PR — {pr.exerciseName}: {Math.round(pr.value)} lb{' '}
          {pr.metric === 'est1rm' ? 'est. 1RM' : 'top weight'}
          {pr.previous != null ? ` (prev ${Math.round(pr.previous)})` : ''}
        </PrLine>
      ))}
      {prBeat.firstCount > 0 && (
        <SoftLine>
          Baseline recorded for {prBeat.firstCount} lift{prBeat.firstCount === 1 ? '' : 's'} — beat it next time for a PR.
        </SoftLine>
      )}
      {streak && Number.isFinite(streak.weeklyCurrent) && streak.weeklyCurrent > 0 && (
        <BeatLine>
          {streak.weeklyCurrent}-week streak alive · {streak.daysThisWeek} training day{streak.daysThisWeek === 1 ? '' : 's'} this week.
        </BeatLine>
      )}
      {isSelfMode && <SoftLine>XP from this session is on its way to your profile.</SoftLine>}
      {billingLine && <SoftLine>{billingLine}</SoftLine>}
      {planLine && <SoftLine>{planLine}</SoftLine>}
      <WorkoutLoggerChallengeReceipt progress={challengeProgress} />
      {shareState === 'shared' && <SoftLine>Shared to your community feed.</SoftLine>}
      {shareState === 'failed' && (
        <SoftLine>Couldn&apos;t share right now — you can post it from the Community feed.</SoftLine>
      )}
      <ActionRow>
        {shareData && shareState !== 'shared' && (
          <ActionButton type="button" onClick={handleShare} disabled={shareState === 'posting'}>
            {shareState === 'posting' ? 'Sharing...' : 'Share to feed'}
          </ActionButton>
        )}
        {showBuyMore && (
          <ActionButton type="button" onClick={onBuyMore}>
            Top up sessions
          </ActionButton>
        )}
        {onBookNext && (
          <ActionButton type="button" onClick={onBookNext}>
            Book next session
          </ActionButton>
        )}
        <ActionButton type="button" $primary onClick={onDone}>
          Done
        </ActionButton>
      </ActionRow>
    </Panel>
  );
};

export default SaveSuccessPanel;
