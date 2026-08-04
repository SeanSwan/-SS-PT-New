/**
 * resolvePlanVsActual (S25 — JARVIS blueprint §4.8). Pure resolver: planned
 * days vs logged forms → per-day 3-state pill (✓ done · ~ modified · · missed)
 * with per-exercise deltas + reasons. Matching is name-based
 * (case-insensitive, trimmed) and order-based across days — data comes from
 * EXISTING logger reads; this module fetches nothing and never touches the
 * Plan Surfacing cursor truth.
 */

export interface PlannedDayInput {
  dayNumber: number;
  exercises: Array<{ name: string; sets: number; reps: string | number; weight?: number | null }>;
}

export interface LoggedFormInput {
  date: string;
  exercises: Array<{ exerciseName: string; sets: Array<{ weight: number; reps: number }> }>;
}

export type DayAdherence = 'done' | 'modified' | 'missed';

export interface PlanVsActualDay {
  dayNumber: number;
  status: DayAdherence;
  deltas: Array<{ name: string; planned: string; actual: string; note: 'matched' | 'reduced' | 'increased' | 'skipped' | 'added' }>;
}

const norm = (name: string) => name.trim().toLowerCase();
const fmtPlanned = (p: PlannedDayInput['exercises'][number]) => `${p.sets}×${p.reps}${p.weight ? `@${p.weight}` : ''}`;
const fmtActual = (sets: LoggedFormInput['exercises'][number]['sets']) =>
  sets.length ? `${sets.length}×${sets[0].reps}${sets[0].weight ? `@${sets[0].weight}` : ''}` : '0 sets';

export function resolvePlanVsActual(
  planned: readonly PlannedDayInput[],
  logged: readonly LoggedFormInput[],
): PlanVsActualDay[] {
  return planned.map((day, index) => {
    const form = logged[index];
    if (!form) {
      return {
        dayNumber: day.dayNumber,
        status: 'missed',
        deltas: day.exercises.map(p => ({ name: p.name, planned: fmtPlanned(p), actual: '—', note: 'skipped' as const })),
      };
    }
    const actualByName = new Map(form.exercises.map(e => [norm(e.exerciseName), e]));
    const deltas: PlanVsActualDay['deltas'] = day.exercises.map(p => {
      const actual = actualByName.get(norm(p.name));
      if (!actual) return { name: p.name, planned: fmtPlanned(p), actual: '—', note: 'skipped' };
      actualByName.delete(norm(p.name));
      const plannedWeight = p.weight ?? null;
      const actualWeight = actual.sets[0]?.weight ?? null;
      const note = plannedWeight !== null && actualWeight !== null && actualWeight !== plannedWeight
        ? (actualWeight < plannedWeight ? 'reduced' : 'increased')
        : (actual.sets.length === Number(p.sets) ? 'matched' : (actual.sets.length < Number(p.sets) ? 'reduced' : 'increased'));
      return { name: p.name, planned: fmtPlanned(p), actual: fmtActual(actual.sets), note };
    });
    for (const extra of actualByName.values()) {
      deltas.push({ name: extra.exerciseName, planned: '—', actual: fmtActual(extra.sets), note: 'added' });
    }
    const anyChange = deltas.some(d => d.note !== 'matched');
    return { dayNumber: day.dayNumber, status: anyChange ? 'modified' : 'done', deltas };
  });
}
