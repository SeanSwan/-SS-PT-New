/**
 * StreakGoalModule.tsx — P3 streak / next-goal beat for the Post-Save Handoff (Convergence v1).
 * ---------------------------------------------------------------------------------------------
 * Converts the finish into the next commitment (blueprint principle CLM-9d9c): a segmented weekly
 * bar (filled = real sessions this week) plus one prompt line that always points forward.
 * DATA TRUTH: renders ONLY from the server-computed proof numbers (sessionsThisWeek/streakWeeks);
 * renders nothing when they're absent or invalid — never a fabricated bar.
 * WEEKLY TARGET: default 3 (Sean 2026-07-21). Plan-defined targets are a follow-up — WorkoutPlan
 * has NO workoutsPerWeek column (Rule 58: the workoutController doc-comment claiming it is drift);
 * the real per-week fields live in the program-block lane (ProgramMesocycleBlock.sessionsPerWeek).
 * Non-interactive module: no touch-target requirements; announced as one labelled group.
 */
import React from 'react';
import styled from 'styled-components';

const DEFAULT_WEEKLY_TARGET = 3;

const Module = styled.div`
  background: var(--bg-surface, #1A1A24);
  border-radius: 12px;
  padding: 14px 16px;
  margin: 0 0 12px;
`;

const LabelRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 10px;
`;

const Label = styled.span`
  font-family: 'Sora', system-ui, sans-serif;
  font-weight: 600;
  font-size: 0.6875rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-primary-70, rgba(224, 236, 244, 0.7));
`;

const Count = styled.span`
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 0.875rem;
  color: var(--text-primary, #E0ECF4);
`;

const SegmentRow = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
`;

const Segment = styled.span<{ $filled: boolean }>`
  flex: 1 1 0;
  height: 6px;
  border-radius: 3px;
  background: ${({ $filled }) => ($filled
    ? 'var(--accent-primary, #60C0F0)'
    : 'var(--bg-elevated, #232330)')};
`;

const Prompt = styled.p`
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 0.8125rem;
  line-height: 1.4;
  margin: 0;
  color: var(--text-primary-85, rgba(224, 236, 244, 0.85));
`;

export interface StreakGoalModuleProps {
  /** Real count from the server proof series (workoutProofSeriesService). */
  sessionsThisWeek: number;
  /** Consecutive training weeks from the same series. */
  streakWeeks: number;
  /** Sessions/week goal. Defaults to 3; clamped to 1–7. (Plan-defined source is a follow-up.) */
  weeklyTarget?: number;
}

const StreakGoalModule: React.FC<StreakGoalModuleProps> = ({
  sessionsThisWeek,
  streakWeeks,
  weeklyTarget,
}) => {
  if (!Number.isFinite(sessionsThisWeek) || sessionsThisWeek < 0) return null;

  const target = Math.min(7, Math.max(1,
    Number.isFinite(weeklyTarget as number) && (weeklyTarget as number) > 0
      ? Math.floor(weeklyTarget as number)
      : DEFAULT_WEEKLY_TARGET));
  const done = Math.floor(sessionsThisWeek);
  const filled = Math.min(done, target);
  const remaining = target - filled;
  const weeks = Math.max(Math.floor(streakWeeks) || 0, 0);

  const prompt = remaining > 0
    ? `${remaining} more this week to hit your goal.`
    : weeks > 1
      ? `Weekly goal met — ${weeks}-week run alive.`
      : 'Weekly goal met — the streak starts here.';

  return (
    <Module
      role="group"
      aria-label={`Weekly streak: ${done} of ${target} sessions. ${prompt}`}
    >
      <LabelRow>
        <Label>Weekly streak</Label>
        <Count aria-hidden="true">{done}/{target}</Count>
      </LabelRow>
      <SegmentRow aria-hidden="true">
        {Array.from({ length: target }, (_, i) => (
          <Segment key={i} $filled={i < filled} />
        ))}
      </SegmentRow>
      <Prompt aria-hidden="true">{prompt}</Prompt>
    </Module>
  );
};

export default StreakGoalModule;
