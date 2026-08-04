/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ SessionDetailPlannedWorkoutPanel — the Plan Reveal (S1).    │
 * │ The session modal's HERO: when a projection backs this      │
 * │ session, the planned workout renders FIRST — plan title,    │
 * │ W·D "you are here" cursor pin, focus line, exercise rows    │
 * │ (name + set-scheme primary; tempo/rest secondary).          │
 * │ Self-fetching (2 existing scoped reads via                  │
 * │ useSessionPlannedWorkout), ≤3 props so the modal's 65-line  │
 * │ prop chain never widens. Fixed-min-height skeleton = zero   │
 * │ layout jump. State matrix: hidden (manual session) ·        │
 * │ loading · error (quiet) · none · rest day · completed ·     │
 * │ ready. World tokens w/ Crystalline fallbacks; gold appears  │
 * │ ONLY on the earned completed state.                         │
 * └─────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import styled from 'styled-components';
import { ClipboardList } from 'lucide-react';
import { useSessionPlannedWorkout } from './useSessionPlannedWorkout';

const Panel = styled.section`
  border-radius: 14px;
  margin-bottom: 12px;
  padding: 14px 16px;
  /* Flat fallback FIRST — iOS < 16.2 has no color-mix. */
  background: var(--world-panel, #141419);
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--world-accent, #60C0F0) 16%, var(--world-bg, #0A0A0F)) 0%,
    var(--world-bg, #0A0A0F) 88%
  );
  border: 1px solid color-mix(in srgb, var(--world-accent, #60C0F0) 32%, transparent);
  color: var(--world-text, #E0ECF4);
  font-family: 'Sora', sans-serif;
`;

const Kicker = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--world-accent, #60C0F0);

  svg { flex-shrink: 0; }
`;

/** The "you are here" pin — W2·D3 in one glance. */
const CursorPin = styled.span`
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--world-accent, #60C0F0) 45%, transparent);
  font-weight: 700;
  white-space: nowrap;
`;

const Title = styled.h3`
  margin: 6px 0 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--world-text, #E0ECF4);
  overflow-wrap: anywhere;
`;

const Focus = styled.p`
  margin: 2px 0 8px;
  font-size: 0.8rem;
  color: var(--world-muted, #9FB0C8);
`;

const Rows = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`;

const Row = styled.li`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  min-height: 44px;
  padding: 6px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--world-text, #E0ECF4) 8%, transparent);

  &:last-child { border-bottom: 0; }
`;

const RowName = styled.span`
  min-width: 0;
  font-size: 0.88rem;
  font-weight: 600;
  overflow-wrap: anywhere;
`;

const RowMeta = styled.span`
  display: flex;
  flex-shrink: 0;
  gap: 10px;
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 0.76rem;
  color: var(--world-muted, #9FB0C8);

  b { color: var(--world-text, #E0ECF4); font-weight: 600; }
`;

/** Earned — the ONE gold use on this surface. */
const CompletedBadge = styled.span`
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 55%, transparent);
  color: var(--accent-gold, #C6A84B);
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
`;

const Quiet = styled.p`
  margin: 6px 0 0;
  font-size: 0.8rem;
  color: var(--world-muted, #9FB0C8);
`;

/** Reserved space while loading — the modal must never jump (M3 spirit). */
const Skeleton = styled.div`
  min-height: 96px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--world-text, #E0ECF4) 6%, transparent);
`;

const BasisNote = styled.span`
  font-size: 0.68rem;
  color: var(--world-muted, #9FB0C8);
  letter-spacing: 0;
  text-transform: none;
`;

const BASIS_COPY: Record<string, string | null> = {
  explicit: null, // scheduled outright — nothing to caveat
  plan_start: null, // anchored to the plan's start — solid
  current_cursor: 'projected from plan progress',
};

export interface SessionDetailPlannedWorkoutPanelProps {
  clientId: number | null | undefined;
  /** YYYY-MM-DD in the client's training zone (callers pass session date-only). */
  sessionDateISO: string | null;
  heading?: string;
}

const SessionDetailPlannedWorkoutPanel: React.FC<SessionDetailPlannedWorkoutPanelProps> = ({
  clientId,
  sessionDateISO,
  heading = 'Planned workout',
}) => {
  const planned = useSessionPlannedWorkout(clientId ?? null, sessionDateISO);

  // Manual sessions (no linked user) and malformed dates render NOTHING —
  // absence of a panel is the honest state, not an empty shell.
  if (planned.status === 'hidden' || planned.status === 'error') return null;

  if (planned.status === 'loading') {
    return (
      <Panel aria-label={heading} aria-busy='true'>
        <Kicker><span><ClipboardList size={14} aria-hidden='true' /> {heading}</span></Kicker>
        <Skeleton aria-hidden='true' />
      </Panel>
    );
  }

  if (planned.status === 'none') {
    return (
      <Panel aria-label={heading}>
        <Kicker><span><ClipboardList size={14} aria-hidden='true' /> {heading}</span></Kicker>
        <Quiet>No plan day is scheduled for this date.</Quiet>
      </Panel>
    );
  }

  const pin = planned.weekNumber && planned.dayNumber
    ? `W${planned.weekNumber}·D${planned.dayNumber}`
    : null;
  const basisNote = BASIS_COPY[planned.basis] ?? null;
  const isRestDay = planned.exercises.length === 0;

  return (
    <Panel aria-label={heading}>
      <Kicker>
        <span><ClipboardList size={14} aria-hidden='true' /> {heading}</span>
        <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          {basisNote && <BasisNote>{basisNote}</BasisNote>}
          {planned.completionState === 'completed' && <CompletedBadge>✓ Completed</CompletedBadge>}
          {pin && <CursorPin aria-label={`Week ${planned.weekNumber}, day ${planned.dayNumber}`}>{pin}</CursorPin>}
        </span>
      </Kicker>
      {(planned.planTitle || planned.dayLabel) && (
        <Title>{planned.dayLabel || planned.planTitle}</Title>
      )}
      {planned.focus && <Focus>{planned.focus}</Focus>}
      {isRestDay ? (
        <Quiet>Rest / recovery day — nothing prescribed.</Quiet>
      ) : (
        <Rows>
          {planned.exercises.map((exercise, index) => (
            <Row key={`${exercise.name}-${index}`}>
              <RowName>{exercise.name}</RowName>
              <RowMeta>
                <b>{exercise.setScheme}</b>
                {exercise.tempo && <span>{exercise.tempo}</span>}
                {exercise.rest && <span>{exercise.rest}</span>}
              </RowMeta>
            </Row>
          ))}
        </Rows>
      )}
    </Panel>
  );
};

export default SessionDetailPlannedWorkoutPanel;
