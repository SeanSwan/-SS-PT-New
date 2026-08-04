/**
 * COMPONENT: PlanVsActualStrip (S25 — JARVIS blueprint §4.8)
 * PURPOSE: The Program surface — per-day ✓/~/· adherence pills from the
 * pure resolver; tapping a day reveals per-exercise deltas with reasons
 * ("planned 3×8@185 → 3×8@175, reduced"). Fetches its actuals through the
 * EXISTING logger read (GET /api/workout-forms?clientId=) — one lazy read,
 * no new endpoints, cursor truth and Plan Reveal untouched. Mounted as the
 * V2 shell's Program tab (dark under PLANNER_IA_V2).
 */

import React from 'react';
import styled from 'styled-components';
import { useAuth } from '../../../../context/AuthContext';
import { usePlannerData } from './plannerContexts/PlannerDataContext';
import { resolvePlanVsActual, type PlanVsActualDay, type LoggedFormInput } from './plannerLogic/resolvePlanVsActual';
import { PlannerEmpty, PlannerSkeleton, PlannerError } from './PlannerStateViews';

const Strip = styled.div` display: flex; flex-direction: column; gap: 10px; `;

const DayRow = styled.button<{ $status: PlanVsActualDay['status'] }>`
  display: flex; align-items: center; gap: 10px; min-height: 48px; padding: 0 12px;
  border-radius: 12px; cursor: pointer; text-align: left;
  background: var(--world-surface, var(--bg-base, #030712));
  border: 1px solid ${({ $status }) => ($status === 'missed'
    ? 'var(--caution-ember, #d97706)' : 'var(--world-border, rgba(96, 192, 240, 0.15))')};
  color: var(--world-text, var(--text-primary, #E0ECF4));
  font-family: 'Sora', sans-serif; font-size: 0.82rem; font-weight: 700;
  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: 2px; }
`;

const Pill = styled.span` font-size: 1rem; width: 1.4rem; text-align: center; `;

const DeltaList = styled.ul`
  margin: 0; padding: 4px 12px 8px 40px; list-style: none;
  display: flex; flex-direction: column; gap: 4px;
  li { font-family: 'Fira Code', monospace; font-size: 0.74rem;
    color: var(--world-text-dim, var(--text-secondary, #9fb3c8)); }
`;

const PILL: Record<PlanVsActualDay['status'], string> = { done: '✓', modified: '~', missed: '·' };

const PlanVsActualStrip: React.FC = () => {
  const { authAxios } = useAuth();
  const data = usePlannerData();
  const { generatedPlan } = data.local;
  const { selectedClientId } = data.clientState;
  const [state, setState] = React.useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [logged, setLogged] = React.useState<LoggedFormInput[]>([]);
  const [openDay, setOpenDay] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!selectedClientId || !generatedPlan) { setState('idle'); return undefined; }
    const controller = new AbortController();
    setState('loading');
    authAxios.get(`/api/workout-forms?clientId=${selectedClientId}&limit=50`, { signal: controller.signal })
      .then((res: { data?: { forms?: Array<{ date?: string; exercises?: LoggedFormInput['exercises'] }> } }) => {
        const forms = Array.isArray(res.data?.forms) ? res.data!.forms! : [];
        // API returns newest-first; day-order matching needs oldest-first.
        const ascending = [...forms].sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')));
        setLogged(ascending.map(form => ({ date: String(form.date ?? ''), exercises: form.exercises ?? [] })));
        setState('ready');
      })
      .catch((err: { name?: string }) => { if (err?.name !== 'CanceledError') setState('error'); });
    return () => controller.abort();
  }, [authAxios, selectedClientId, generatedPlan]);

  if (!generatedPlan) {
    return <PlannerEmpty title="No program to compare yet" body="Generate a multi-week program; each day shows ✓ done, ~ modified, or · missed once sessions are logged." />;
  }
  if (state === 'loading') return <PlannerSkeleton variant="list" />;
  if (state === 'error') return <PlannerError message="Couldn't load logged sessions for this client." />;

  // Planned detail comes from the L1 weeks structure when present; plans
  // saved before L1 fall back to day slots with no exercise detail (their
  // pills reflect logged-vs-scheduled presence only).
  const weekDays = (generatedPlan.weeks ?? []).flatMap(week => week.days ?? week.sessions ?? []);
  const plannedDays = weekDays.length > 0
    ? weekDays.map((day, i) => ({
        dayNumber: i + 1,
        exercises: day.exercises
          .map(ex => ({
            name: String(ex.exerciseName ?? ex.name ?? ''),
            sets: Array.isArray(ex.sets) ? ex.sets.length : Number(ex.sets ?? 0),
            reps: ex.reps ?? ex.targetReps ?? '',
          }))
          .filter(ex => ex.name.length > 0),
      }))
    : Array.from({ length: generatedPlan.planSummary.totalSessions }, (_, i) => ({
        dayNumber: i + 1,
        exercises: [] as Array<{ name: string; sets: number; reps: string }>,
      }));
  const days = resolvePlanVsActual(plannedDays, logged);

  return (
    <Strip aria-label="Plan vs actual">
      {days.map(day => (
        <React.Fragment key={day.dayNumber}>
          <DayRow type="button" $status={day.status} aria-expanded={openDay === day.dayNumber}
            onClick={() => setOpenDay(current => (current === day.dayNumber ? null : day.dayNumber))}>
            <Pill aria-hidden>{PILL[day.status]}</Pill>
            Day {day.dayNumber} — {day.status}
          </DayRow>
          {openDay === day.dayNumber && day.deltas.length > 0 && (
            <DeltaList>
              {day.deltas.map((delta, i) => (
                <li key={i}>{delta.name}: {delta.planned} → {delta.actual} ({delta.note})</li>
              ))}
            </DeltaList>
          )}
        </React.Fragment>
      ))}
    </Strip>
  );
};

export default PlanVsActualStrip;
