// Pure command-lane summaries live outside orchestration hooks so routing stays readable.
import {
  isNavigationCommand,
  nonZeroNumberPart,
  numberOr,
  numberPart,
  numberValue,
  painEntryWord,
  plural,
  positiveNumberPart,
  signed,
  stringOr,
  stringPart,
  stringPairPart,
  stringValue,
  textOr,
} from './coachCommandSummaryParts';
import type { SummaryResult } from './coachCommandSummaryParts';

type SummaryClient = { id?: number; firstName?: string } | null;
type SummaryContext = { command: string; r: SummaryResult; forClient: string };
type SummaryHandler = (context: SummaryContext) => string;
const clientSuffix = (client: SummaryClient) => (client?.firstName ? ` for ${client.firstName}` : '');

function workoutLoggedSummary({ r, forClient }: SummaryContext): string {
  const count = numberPart(r, 'exerciseCount', value => ` ${value} exercise(s),`);
  const sets = numberPart(r, 'totalSets', value => ` ${value} sets.`) || '.';
  const xp = numberPart(r, 'xpAwarded', value => ` +${value} XP.`);
  return `Workout logged${forClient}.${count}${sets}${xp}`;
}

function mealsLoggedSummary({ r, forClient }: SummaryContext): string {
  const count = numberOr(r, 'mealsLogged', 0);
  const dateStr = stringPart(r, 'date', value => ` on ${value}`);
  if (count === 0) return `No meals logged${forClient}${dateStr}.`;
  const cal = textOr(numberPart(r, 'totalCalories', value => ` ${value} kcal.`), '.');
  const prot = positiveNumberPart(r, 'totalProtein', value => ` ${value}g protein.`);
  return `${count} meal${plural(count)} logged${forClient}${dateStr}.${cal}${prot}`;
}

function clientOnboardingSummary({ r }: SummaryContext): string {
  if (r.hasPreparedDraft === true) return 'Client onboarding draft prepared for review.';
  return 'Client onboarding command completed.';
}

function activeClientsSummary({ r }: SummaryContext): string {
  const returned = numberOr(r, 'returnedCount', 0);
  const total = numberPart(r, 'totalCount', value => ` of ${value}`);
  const swan = numberPart(r, 'swanStudiosCount', value => ` ${value} SwanStudios.`);
  const move = numberPart(r, 'moveFitnessCount', value => ` ${value} Move Fitness.`);
  return `${returned}${total} active client${plural(returned)} loaded.${swan}${move}`;
}

function nutritionLogSummary({ r, forClient }: SummaryContext): string {
  const count = numberOr(r, 'mealCount', 0);
  const dateStr = textOr(stringPart(r, 'date', value => ` on ${value}`), ' today');
  const cal = textOr(numberPart(r, 'totalCalories', value => ` ${value} kcal.`), '.');
  const prot = positiveNumberPart(r, 'totalProtein', value => ` ${value}g protein.`);
  if (count === 0) return `No meals logged${forClient}${dateStr}.`;
  return `${count} meal${plural(count)}${forClient}${dateStr}.${cal}${prot}`;
}

function macroTrendsSummary({ r, forClient }: SummaryContext): string {
  const days = numberOr(r, 'daysLogged', 0);
  const range = textOr(stringPairPart(r, 'startDate', 'endDate', (start, end) => ` (${start} – ${end})`), ' (last 7 days)');
  if (days === 0) return `No nutrition logged${forClient} in the last 7 days.`;
  const avg = textOr(numberPart(r, 'avgCalories', value => ` Avg ${value} kcal/day.`), '.');
  const prot = positiveNumberPart(r, 'avgProtein', value => ` ${value}g protein avg.`);
  return `${days} day${plural(days)} logged${forClient}${range}.${avg}${prot}`;
}

function measurementTrendsSummary({ r, forClient }: SummaryContext): string {
  const count = numberOr(r, 'totalMeasurements', 0);
  if (count === 0) return `No measurement history on file${forClient}.`;
  const unit = stringOr(r, 'weightUnit', 'lbs');
  const wt = textOr(numberPart(r, 'latestWeight', value => ` Latest: ${value} ${unit}.`), '.');
  const wChange = nonZeroNumberPart(r, 'weightChange', value => ` Weight change: ${signed(value)} ${unit}.`);
  const bfChange = nonZeroNumberPart(r, 'bodyFatChange', value => ` Body fat: ${signed(value)}%.`);
  const days = positiveNumberPart(r, 'daysSinceStart', value => ` Over ${value} days.`);
  return `${count} measurement${plural(count)}${forClient}.${wt}${wChange}${bfChange}${days}`;
}

function latestMeasurementSummary({ r, forClient }: SummaryContext): string {
  if (r.measurementDate === null || r.measurementDate === undefined) return `No measurements on file${forClient}.`;
  const wt = textOr(numberPart(r, 'weight', value => ` ${value} ${stringOr(r, 'weightUnit', 'lbs')}.`), '.');
  const bf = positiveNumberPart(r, 'bodyFatPercentage', value => ` ${value}% body fat.`);
  return `Latest measurement${forClient} on ${r.measurementDate}.${wt}${bf}`;
}

function weighInSummary({ r, forClient }: SummaryContext): string {
  const wt = numberPart(r, 'weight', value => ` ${value} ${stringOr(r, 'weightUnit', 'lbs')}`);
  const dateStr = stringPart(r, 'measurementDate', value => ` on ${value}`);
  return `Weigh-in logged${forClient}${dateStr}.${wt}.`;
}

function measurementsLoggedSummary({ r, forClient }: SummaryContext): string {
  const dateStr = stringPart(r, 'measurementDate', value => ` on ${value}`);
  const wt = numberPart(r, 'weight', value => ` ${value} ${stringOr(r, 'weightUnit', 'lbs')}.`);
  const bf = numberPart(r, 'bodyFatPercentage', value => ` ${value}% body fat.`);
  const circ = positiveNumberPart(r, 'fieldsLogged', value => ` ${value} circumference field${plural(value)}.`);
  return `Measurement logged${forClient}${dateStr}.${wt}${bf}${circ}`;
}

function activePainSummary({ r, forClient }: SummaryContext): string {
  const count = numberOr(r, 'count', 0);
  if (count === 0) return `No active pain entries on file${forClient}.`;
  const lvl = textOr(numberPart(r, 'highestPainLevel', value => ` Highest level: ${value}/10.`), '.');
  const reg = stringPart(r, 'regions', value => ` Regions: ${value}.`);
  return `${count} active pain ${painEntryWord(count)}${forClient}.${lvl}${reg}`;
}

function painRegion(r: SummaryResult): string {
  return stringValue(r, 'bodyRegion')?.replace(/_/g, ' ') ?? 'region';
}
function addPainEntrySummary({ r, forClient }: SummaryContext): string {
  const lvl = textOr(numberPart(r, 'painLevel', value => ` Level ${value}/10.`), '.');
  return `Pain entry logged${forClient} — ${painRegion(r)}.${lvl}`;
}
function resolvePainEntrySummary({ r, forClient }: SummaryContext): string {
  const date = stringPart(r, 'resolvedAt', value => ` on ${value}`);
  return `Pain entry resolved${forClient} — ${painRegion(r)}${date}.`;
}
function updatePainEntrySummary({ r, forClient }: SummaryContext): string {
  const lvl = textOr(numberPart(r, 'painLevel', value => ` Level ${value}/10.`), '.');
  return `Pain entry updated${forClient} — ${painRegion(r)}.${lvl}`;
}

function cancelSessionSummary({ r, forClient }: SummaryContext): string {
  const sid = numberPart(r, 'sessionId', value => ` #${value}`);
  const refund = r.refundIssued === true ? ' Session credit restored.' : '';
  const review = r.requiresAdminReview === true ? ' Flagged for admin review (late cancellation).' : '';
  return `Session${sid} cancelled${forClient}.${refund}${review}`;
}

function workoutHistorySummary({ r, forClient }: SummaryContext): string {
  const count = numberOr(r, 'count', 0);
  const last = stringPart(r, 'lastSessionDate', value => ` Last: ${value}.`);
  const title = stringPart(r, 'recentTitle', value => ` "${value}"`);
  return `${count} recent session${plural(count)}${forClient}.${last}${title}`;
}

function availabilityOverrideSummary({ r }: SummaryContext): string {
  const dateStr = stringPart(r, 'date', value => ` on ${value}`);
  const time = stringPairPart(r, 'startTime', 'endTime', (start, end) => ` ${start}–${end}`);
  const type = stringOr(r, 'type', 'blocked');
  return `Availability ${type}${dateStr}${time}.`;
}

function trainerAvailabilitySummary({ r }: SummaryContext): string {
  const count = numberOr(r, 'recurringSlotCount', 0);
  if (count === 0) return 'No recurring availability on file.';
  const days = stringPart(r, 'days', value => ` Days: ${value}.`);
  const hours = stringPairPart(r, 'earliestStart', 'latestEnd', (start, end) => ` ${start}–${end}.`);
  const daysWithAvailability = numberOr(r, 'daysWithAvailability', 0);
  return `${count} slot${plural(count)} across ${daysWithAvailability} day${plural(daysWithAvailability)}.${days}${hours}`;
}

function availableSlotsSummary({ r }: SummaryContext): string {
  const count = numberOr(r, 'availableSlotCount', 0);
  const dateStr = stringPart(r, 'date', value => ` on ${value}`);
  const duration = numberOr(r, 'durationMinutes', 60);
  if (count === 0) return `No ${duration}-minute slots available${dateStr}.`;
  const first = stringPart(r, 'firstSlotStartUtc', value => ` First starts at ${value} UTC.`);
  const last = stringPart(r, 'lastSlotEndUtc', value => ` Last ends at ${value} UTC.`);
  return `${count} available slot${plural(count)}${dateStr} for ${duration}-minute sessions.${first}${last}`;
}

function todayScheduleSummary({ r }: SummaryContext): string {
  const count = numberOr(r, 'count', 0);
  const dateStr = textOr(stringPart(r, 'date', value => ` on ${value}`), ' today');
  if (count === 0) return `No sessions scheduled${dateStr}.`;
  const next = stringPart(r, 'nextSessionTime', value => ` Next: ${value} UTC.`);
  const done = positiveNumberPart(r, 'completedCount', value => ` ${value} completed.`);
  return `${count} session${plural(count)}${dateStr}.${next}${done}`;
}

function weekScheduleSummary({ r }: SummaryContext): string {
  const count = numberOr(r, 'sessionCount', 0);
  const range = textOr(stringPairPart(r, 'startDate', 'endDate', (start, end) => ` (${start} – ${end})`), ' this week');
  if (count === 0) return `No sessions scheduled${range}.`;
  const days = numberPart(r, 'daysWithSessions', value => ` Across ${value} day${plural(value)}.`);
  const firstTime = stringPart(r, 'firstSessionTime', value => ` at ${value} UTC`);
  const first = stringPart(r, 'firstSessionDate', value => ` First: ${value}${firstTime}.`);
  return `${count} session${plural(count)}${range}.${days}${first}`;
}

function createHermesTaskSummary({ r }: SummaryContext): string {
  const agent = stringOr(r, 'agentType', 'agent');
  const id = stringValue(r, 'taskId') !== undefined ? ` (${String(r.taskId).slice(0, 8)}…)` : '';
  return `Task queued for ${agent} agent${id}.`;
}

function listHermesTasksSummary({ r }: SummaryContext): string {
  const count = numberOr(r, 'count', 0);
  const pending = numberOr(r, 'pending', 0);
  return `${count} Hermes task${plural(count)} found — ${pending} pending.`;
}

const COMMAND_SUMMARY_HANDLERS: Record<string, SummaryHandler> = {
  log_workout: workoutLoggedSummary,
  log_meals: mealsLoggedSummary,
  create_client: clientOnboardingSummary,
  create_external_client: clientOnboardingSummary,
  list_active_clients: activeClientsSummary,
  view_nutrition_log: nutritionLogSummary,
  view_macro_trends: macroTrendsSummary,
  view_measurement_trends: measurementTrendsSummary,
  view_latest_measurements: latestMeasurementSummary,
  log_weighin: weighInSummary,
  log_measurements: measurementsLoggedSummary,
  view_active_pain: activePainSummary,
  add_pain_entry: addPainEntrySummary,
  resolve_pain_entry: resolvePainEntrySummary,
  update_pain_entry: updatePainEntrySummary,
  cancel_session: cancelSessionSummary,
  view_workout_history: workoutHistorySummary,
  create_availability_override: availabilityOverrideSummary,
  view_trainer_availability: trainerAvailabilitySummary,
  view_available_slots: availableSlotsSummary,
  view_today_schedule: todayScheduleSummary,
  view_today_sessions: todayScheduleSummary,
  view_week_schedule: weekScheduleSummary,
  create_hermes_task: createHermesTaskSummary,
  list_hermes_tasks: listHermesTasksSummary,
};

function fallbackCommandSummary(command: string, r: SummaryResult): string {
  if (isNavigationCommand(command)) {
    const dest = stringOr(r, 'destination', command.replace(/_/g, ' '));
    return `Navigated to ${dest}.`;
  }
  if (command.startsWith('view_')) {
    return `${command.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} loaded.`;
  }
  return `${command.replace(/_/g, ' ')} completed.`;
}

export function commandResultSummary(command: string, result: SummaryResult | null, client: SummaryClient): string {
  const r = result ?? {};
  const handler = COMMAND_SUMMARY_HANDLERS[command];
  if (handler) return handler({ command, r, forClient: clientSuffix(client) });
  return fallbackCommandSummary(command, r);
}
