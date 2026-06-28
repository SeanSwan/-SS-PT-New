/**
 * HistoricalWorkoutImportPanel logic.
 *
 * Pure date and prompt helpers for the Move Fitness/SwanStudios historical
 * workout import lane. UI writes stay review-gated through Swan Coach.
 */
import { normalizeIsoDateOnly } from '../../../../../utils/isoDateOnly';
export interface HistoricalWorkoutDateSource {
  date?: string | null;
  completedAt?: string | null;
}

export interface HistoricalImportPlanInput {
  clientId: number;
  startDate: string;
  endDate: string;
  sessionsPerWeek: number;
  sourceLabel: string;
  knownDates: string[];
  lastWorkoutNotes: string;
}

export interface HistoricalImportPlan {
  expectedDates: string[];
  missingDates: string[];
  coachPrompt: string;
}

export interface HistoricalPreviewFormFieldsInput {
  clientId: number;
  knownDates: string[];
  missingDates: string[];
  sourceLabel: string;
  lastWorkoutNotes: string;
}

interface HistoricalPreviewPromptDraft {
  date: string;
  confidence?: number | null;
  parsedWorkout?: { exercises?: Array<{ exerciseName?: string | null }> };
}

interface HistoricalPreviewPromptRequest {
  date: string;
}

const WEEKDAY_PATTERNS: Record<number, number[]> = {
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
};

export function clampSessionsPerWeek(value: number): number {
  if (!Number.isFinite(value)) return 3;
  return Math.min(7, Math.max(1, Math.round(value)));
}

function toDateOnly(value?: string | null): string | null {
  return normalizeIsoDateOnly(value);
}

export function knownWorkoutDateSet(workouts: HistoricalWorkoutDateSource[]): Set<string> {
  return new Set(
    workouts
      .map((workout) => toDateOnly(workout.date) || toDateOnly(workout.completedAt))
      .filter((date): date is string => Boolean(date)),
  );
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isoFromUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function validDateRange(start: string | null, end: string | null): [string, string] | null {
  if (!start || !end) return null;
  return start <= end ? [start, end] : null;
}

function expectedWorkoutDates(startDate: string, endDate: string, sessionsPerWeek: number): string[] {
  const range = validDateRange(toDateOnly(startDate), toDateOnly(endDate));
  if (!range) return [];
  const [start, end] = range;

  const activeWeekdays = new Set(WEEKDAY_PATTERNS[clampSessionsPerWeek(sessionsPerWeek)]);
  const dates: string[] = [];
  for (
    let cursor = new Date(`${start}T00:00:00.000Z`);
    isoFromUtcDate(cursor) <= end;
    cursor = addUtcDays(cursor, 1)
  ) {
    if (activeWeekdays.has(cursor.getUTCDay())) {
      dates.push(isoFromUtcDate(cursor));
    }
  }
  return dates;
}

function compactDateList(dates: string[], max = 36): string {
  if (dates.length === 0) return 'none';
  const shown = dates.slice(0, max);
  const extra = dates.length - shown.length;
  return extra > 0 ? `${shown.join(', ')} (+${extra} more)` : shown.join(', ');
}

function redactPromptNotes(notes: string): string {
  return notes
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]')
    .replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[redacted-phone]')
    .trim();
}

function normalizedDateArray(dates: string[]): string[] {
  return [...new Set(dates.map(toDateOnly).filter((date): date is string => Boolean(date)))].sort();
}

export function buildHistoricalPreviewFormFields(input: HistoricalPreviewFormFieldsInput): Record<string, string> {
  return {
    clientId: String(input.clientId),
    knownDates: JSON.stringify(normalizedDateArray(input.knownDates)),
    lastWorkoutNotes: redactPromptNotes(input.lastWorkoutNotes),
    missingDates: JSON.stringify(normalizedDateArray(input.missingDates)),
    sourceLabel: input.sourceLabel.trim() || 'External historical import',
  };
}

function previewExerciseNames(draft: HistoricalPreviewPromptDraft): string {
  const names = draft.parsedWorkout?.exercises
    ?.map((exercise) => exercise.exerciseName?.trim())
    .filter(Boolean)
    .slice(0, 6);
  return names?.length ? names.join(', ') : 'exercise list needs review';
}

export function appendHistoricalPreviewToCoachPrompt(input: {
  basePrompt: string;
  drafts?: HistoricalPreviewPromptDraft[];
  missingDraftRequests?: HistoricalPreviewPromptRequest[];
}): string {
  const drafts = input.drafts || [];
  const missingDates = (input.missingDraftRequests || []).map((request) => request.date).filter(Boolean);
  if (drafts.length === 0 && missingDates.length === 0) return input.basePrompt;

  const lines = [input.basePrompt.trim(), '', 'Uploaded history preview draft candidates:'];
  drafts.slice(0, 12).forEach((draft) => {
    const confidence = typeof draft.confidence === 'number' ? ` confidence ${Math.round(draft.confidence * 100)}%` : '';
    lines.push(`- ${draft.date}${confidence}: ${previewExerciseNames(draft)}.`);
  });
  if (missingDates.length > 0) {
    lines.push(`Missing-date draft prompts still needed: ${missingDates.slice(0, 36).join(', ')}.`);
  }
  lines.push('Keep every preview item review-gated; do not write to charts, streaks, or progress proof until an admin/trainer explicitly approves.');
  return lines.join('\n');
}

export function buildHistoricalImportPlan(input: HistoricalImportPlanInput): HistoricalImportPlan {
  const cadence = clampSessionsPerWeek(input.sessionsPerWeek);
  const expectedDates = expectedWorkoutDates(input.startDate, input.endDate, cadence);
  const known = new Set(input.knownDates.map(toDateOnly).filter((date): date is string => Boolean(date)));
  const missingDates = expectedDates.filter((date) => !known.has(date));
  const sourceLabel = input.sourceLabel.trim() || 'external/free-tracking';
  const lastWorkoutNotes = redactPromptNotes(input.lastWorkoutNotes) || 'No last-workout notes were provided.';

  const coachPrompt = [
    'Swan Coach historical workout import planning.',
    `Client: #${input.clientId}.`,
    `Source: ${sourceLabel}. Treat Move Fitness/external clients as free-tracking; do not deduct paid sessions for historical imports.`,
    `Date range: ${input.startDate} to ${input.endDate}. Target cadence: ${cadence} workouts/week.`,
    `Known logged workout dates: ${compactDateList([...known].sort())}.`,
    `Missing candidate dates needing editable filler drafts: ${compactDateList(missingDates)}.`,
    'Trainer anchor notes from the last known workout or memory:',
    lastWorkoutNotes,
    'Create editable workout-log drafts for the missing candidate dates only.',
    'Mark every generated draft as AI-estimated historical filler in the notes.',
    'Use NASM-appropriate progressions/regressions and ask for pain/contraindication clarification instead of inventing medical facts.',
    'Earlier missing dates should generally be easier than later/current workouts: regress load, volume, density, and exercise complexity so the backfill tells a believable progression story toward the latest known anchor.',
    'Output one draft per date with title, date, duration, optional explicit intensity only, exercises, sets, reps, load, tempo, rest, RPE, and notes.',
    'Keep the drafts easy for the admin/trainer to edit before saving to charts and social progress proof.',
    'Do not present estimated drafts as verified performance records until the admin/trainer manually reviews and saves them.',
  ].join('\n');

  return { expectedDates, missingDates, coachPrompt };
}

export function createHistoricalImportDraftKey(clientId: number, now = Date.now()): string {
  return `swan-historical-import-${clientId}-${now}`;
}
