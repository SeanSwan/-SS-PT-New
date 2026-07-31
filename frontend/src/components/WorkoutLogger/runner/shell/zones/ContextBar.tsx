/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ ContextBar — SESSION SHELL zone 1 (sticky, status-first).   │
 * │ client · date · session-source signal · plan chip (the ONE  │
 * │ control here → plan sheet) · 2 numbers max. STATUS lives    │
 * │ here; controls live in the action bar (zone 6). Absorbs     │
 * │ WorkoutLoggerHeader (client/date/signal/numbers + the OPT   │
 * │ selector, relocated into the plan sheet) and the            │
 * │ ActivePlanContextStrip's chip role.                         │
 * │ Source: SESSION-SHELL-HANDOFF-2026-07-30 §3 zone 1 + §4.1.  │
 * └─────────────────────────────────────────────────────────────┘
 */
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { ClipboardList, User } from 'lucide-react';
import { getClientSessionSignal } from '../../../../DashBoard/workspaces/clients-team/clientSessionSignal';
import type { PlannedAssignment } from '../../../WorkoutLogger.localTypes';
import PlanContextSheet from './PlanContextSheet';
import ContextOverflow, { type ContextOverflowProps } from './ContextOverflow';

const Bar = styled.div`
  position: sticky;
  top: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 10px;
  min-height: 44px;
  padding: 6px 12px;
  background: color-mix(in srgb, var(--bg-surface, #1a1a24) 96%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary, #e0ecf4) 10%, transparent);
  color: var(--text-primary, #e0ecf4);
  font-family: 'Sora', sans-serif;
`;

const Client = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 700;
  font-size: 0.9rem;

  svg { color: var(--world-accent, #60c0f0); flex-shrink: 0; }
`;

const Meta = styled.span`
  color: var(--text-muted, #94a3b8);
  font-size: 0.75rem;
  white-space: nowrap;
`;

const SignalPill = styled.span<{ $tone: 'warning' | 'gold' | 'neutral' }>`
  padding: 2px 8px;
  border-radius: 2rem;
  font-size: 0.7rem;
  font-weight: 700;
  white-space: nowrap;
  color: ${({ $tone }) =>
    $tone === 'warning' ? 'var(--warning, #f59e0b)'
    : $tone === 'gold' ? 'var(--accent-gold, #c6a84b)'
    : 'var(--text-muted, #94a3b8)'};
  border: 1px solid currentColor;
`;

const Numbers = styled.span`
  margin-left: auto;
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 0.75rem;
  color: var(--text-muted, #94a3b8);
  white-space: nowrap;
`;

const PlanChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  max-width: min(46vw, 260px);
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--world-accent, #60c0f0) 40%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--world-accent, #60c0f0) 10%, transparent);
  color: var(--text-primary, #e0ecf4);
  font: 600 0.78rem 'Sora', sans-serif;
  cursor: pointer;

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  svg { color: var(--world-accent, #60c0f0); flex-shrink: 0; }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8b5cf6);
    outline-offset: 2px;
  }
`;

export interface ContextBarProps {
  /** ⋯ menu (Cancel/PDF/summary-with-lock) — omitted only in bare mounts. */
  overflow?: ContextOverflowProps;
  /** Epoch ms of the FIRST logged set — flips the numbers to volume · elapsed. */
  sessionStartedAt?: number | null;
  /** Live session volume (e.g. "4,120 lbs") shown once the session starts. */
  formattedVolume?: string;
  clientFirstName: string;
  clientLastName: string;
  availableSessions: number;
  clientSource?: string | null;
  workoutDate?: string | null;
  totalSets: number;
  estimatedDuration: number;
  assignment: PlannedAssignment | null;
  currentOPTPhase: number;
  onOPTPhaseChange: (phase: number) => void;
}

const formatElapsed = (startedAt: number, now: number): string => {
  const total = Math.max(0, Math.floor((now - startedAt) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
};

const ContextBar: React.FC<ContextBarProps> = React.memo(({
  overflow,
  sessionStartedAt = null,
  formattedVolume,
  clientFirstName,
  clientLastName,
  availableSessions,
  clientSource,
  workoutDate,
  totalSets,
  estimatedDuration,
  assignment,
  currentOPTPhase,
  onOPTPhaseChange,
}) => {
  const [planOpen, setPlanOpen] = useState(false);
  // Consult zone-1 spec: ELAPSED, not an estimate — the ticker lives HERE so
  // only this memoized bar re-renders each second, never the page.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (!sessionStartedAt) return undefined;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sessionStartedAt]);
  const signal = getClientSessionSignal({ clientSource: clientSource || undefined, availableSessions });
  const parsed = workoutDate ? new Date(`${workoutDate}T00:00:00`) : null;
  const displayDate = parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const planTitle = assignment?.title?.trim() || assignment?.dayLabel?.trim() || null;
  const chipLabel = planTitle ?? 'No plan';

  return (
    <Bar data-shell-zone='context-bar'>
      <Client>
        <User size={16} aria-hidden='true' />
        {clientFirstName} {clientLastName}
      </Client>
      <Meta>{displayDate}</Meta>
      <SignalPill
        $tone={signal.tone === 'warning' ? 'warning' : signal.tone === 'gold' ? 'gold' : 'neutral'}
        title={signal.note}
        aria-live='polite'
        aria-atomic='true'
      >
        {signal.label}
      </SignalPill>
      <PlanChip
        type='button'
        aria-label={`Session plan: ${chipLabel}`}
        aria-haspopup='dialog'
        onClick={() => setPlanOpen(true)}
      >
        <ClipboardList size={14} aria-hidden='true' />
        <span>{chipLabel}</span>
      </PlanChip>
      {sessionStartedAt ? (
        <Numbers aria-label={`Session volume ${formattedVolume ?? ''}, elapsed ${formatElapsed(sessionStartedAt, nowTick)}`}>
          {formattedVolume} · {formatElapsed(sessionStartedAt, nowTick)}
        </Numbers>
      ) : (
        <Numbers aria-label={`${totalSets} total sets, about ${estimatedDuration} minutes`}>
          {totalSets} sets · ~{estimatedDuration} min
        </Numbers>
      )}
      {overflow && <ContextOverflow {...overflow} />}
      <PlanContextSheet
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        assignment={assignment}
        currentOPTPhase={currentOPTPhase}
        onOPTPhaseChange={onOPTPhaseChange}
        clientName={`${clientFirstName} ${clientLastName}`}
      />
    </Bar>
  );
});

ContextBar.displayName = 'ContextBar';
export default ContextBar;
