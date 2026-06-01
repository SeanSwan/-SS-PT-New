/**
 * Pure command-lane result summaries for Swan Coach assistant messages.
 * Keep these copy helpers outside the orchestration hook so routing stays readable.
 */

export function commandResultSummary(
  command: string,
  result: Record<string, unknown> | null,
  client: { id?: number; firstName?: string } | null,
): string {
  const r = result ?? {};
  const forClient = client?.firstName ? ` for ${client.firstName}` : '';
  switch (command) {
    case 'log_workout': {
      const count = typeof r.exerciseCount === 'number' ? ` ${r.exerciseCount} exercise(s),` : '';
      const sets = typeof r.totalSets === 'number' ? ` ${r.totalSets} sets.` : '.';
      const xp = typeof r.xpAwarded === 'number' ? ` +${r.xpAwarded} XP.` : '';
      return `Workout logged${forClient}.${count}${sets}${xp}`;
    }
    case 'log_meals': {
      const count = typeof r.mealsLogged === 'number' ? r.mealsLogged : 0;
      const dateStr = typeof r.date === 'string' ? ` on ${r.date}` : '';
      if (count === 0) return `No meals logged${forClient}${dateStr}.`;
      const cal = typeof r.totalCalories === 'number' ? ` ${r.totalCalories} kcal.` : '.';
      const prot = typeof r.totalProtein === 'number' && r.totalProtein > 0 ? ` ${r.totalProtein}g protein.` : '';
      return `${count} meal${count !== 1 ? 's' : ''} logged${forClient}${dateStr}.${cal}${prot}`;
    }
    case 'create_client':
    case 'create_external_client':
      if (r.hasPreparedDraft === true) return 'Client onboarding draft prepared for review.';
      return 'Client onboarding command completed.';
    case 'list_active_clients': {
      const returned = typeof r.returnedCount === 'number' ? r.returnedCount : 0;
      const total = typeof r.totalCount === 'number' ? ` of ${r.totalCount}` : '';
      const swan = typeof r.swanStudiosCount === 'number' ? ` ${r.swanStudiosCount} SwanStudios.` : '';
      const move = typeof r.moveFitnessCount === 'number' ? ` ${r.moveFitnessCount} Move Fitness.` : '';
      return `${returned}${total} active client${returned !== 1 ? 's' : ''} loaded.${swan}${move}`;
    }
    case 'view_nutrition_log': {
      const count = typeof r.mealCount === 'number' ? r.mealCount : 0;
      const dateStr = typeof r.date === 'string' ? ` on ${r.date}` : ' today';
      const cal = typeof r.totalCalories === 'number' ? ` ${r.totalCalories} kcal.` : '.';
      const prot = typeof r.totalProtein === 'number' && r.totalProtein > 0 ? ` ${r.totalProtein}g protein.` : '';
      if (count === 0) return `No meals logged${forClient}${dateStr}.`;
      return `${count} meal${count !== 1 ? 's' : ''}${forClient}${dateStr}.${cal}${prot}`;
    }
    case 'view_macro_trends': {
      const days = typeof r.daysLogged === 'number' ? r.daysLogged : 0;
      const range = (typeof r.startDate === 'string' && typeof r.endDate === 'string')
        ? ` (${r.startDate} – ${r.endDate})`
        : ' (last 7 days)';
      if (days === 0) return `No nutrition logged${forClient} in the last 7 days.`;
      const avg = typeof r.avgCalories === 'number' ? ` Avg ${r.avgCalories} kcal/day.` : '.';
      const prot = typeof r.avgProtein === 'number' && r.avgProtein > 0 ? ` ${r.avgProtein}g protein avg.` : '';
      return `${days} day${days !== 1 ? 's' : ''} logged${forClient}${range}.${avg}${prot}`;
    }
    case 'view_measurement_trends': {
      const count = typeof r.totalMeasurements === 'number' ? r.totalMeasurements : 0;
      if (count === 0) return `No measurement history on file${forClient}.`;
      const unit = typeof r.weightUnit === 'string' ? r.weightUnit : 'lbs';
      const wt = typeof r.latestWeight === 'number' ? ` Latest: ${r.latestWeight} ${unit}.` : '.';
      const wChange = typeof r.weightChange === 'number' && r.weightChange !== 0
        ? ` Weight change: ${r.weightChange > 0 ? '+' : ''}${r.weightChange} ${unit}.` : '';
      const bfChange = typeof r.bodyFatChange === 'number' && r.bodyFatChange !== 0
        ? ` Body fat: ${r.bodyFatChange > 0 ? '+' : ''}${r.bodyFatChange}%.` : '';
      const days = typeof r.daysSinceStart === 'number' && r.daysSinceStart > 0
        ? ` Over ${r.daysSinceStart} days.` : '';
      return `${count} measurement${count !== 1 ? 's' : ''}${forClient}.${wt}${wChange}${bfChange}${days}`;
    }
    case 'view_latest_measurements': {
      if (r.measurementDate === null || r.measurementDate === undefined) return `No measurements on file${forClient}.`;
      const wt = typeof r.weight === 'number' ? ` ${r.weight} ${r.weightUnit ?? 'lbs'}.` : '.';
      const bf = typeof r.bodyFatPercentage === 'number' && r.bodyFatPercentage > 0
        ? ` ${r.bodyFatPercentage}% body fat.` : '';
      return `Latest measurement${forClient} on ${r.measurementDate}.${wt}${bf}`;
    }
    case 'log_weighin': {
      const wt = typeof r.weight === 'number' ? ` ${r.weight} ${r.weightUnit ?? 'lbs'}` : '';
      const dateStr = typeof r.measurementDate === 'string' ? ` on ${r.measurementDate}` : '';
      return `Weigh-in logged${forClient}${dateStr}.${wt}.`;
    }
    case 'log_measurements': {
      const dateStr = typeof r.measurementDate === 'string' ? ` on ${r.measurementDate}` : '';
      const wt = typeof r.weight === 'number' ? ` ${r.weight} ${r.weightUnit ?? 'lbs'}.` : '';
      const bf = typeof r.bodyFatPercentage === 'number' ? ` ${r.bodyFatPercentage}% body fat.` : '';
      const circ = typeof r.fieldsLogged === 'number' && r.fieldsLogged > 0
        ? ` ${r.fieldsLogged} circumference field${r.fieldsLogged !== 1 ? 's' : ''}.` : '';
      return `Measurement logged${forClient}${dateStr}.${wt}${bf}${circ}`;
    }
    case 'view_active_pain': {
      const count = typeof r.count === 'number' ? r.count : 0;
      if (count === 0) return `No active pain entries on file${forClient}.`;
      const lvl = typeof r.highestPainLevel === 'number' ? ` Highest level: ${r.highestPainLevel}/10.` : '.';
      const reg = typeof r.regions === 'string' ? ` Regions: ${r.regions}.` : '';
      return `${count} active pain entr${count !== 1 ? 'ies' : 'y'}${forClient}.${lvl}${reg}`;
    }
    case 'add_pain_entry': {
      const region = typeof r.bodyRegion === 'string' ? r.bodyRegion.replace(/_/g, ' ') : 'region';
      const lvl = typeof r.painLevel === 'number' ? ` Level ${r.painLevel}/10.` : '.';
      return `Pain entry logged${forClient} — ${region}.${lvl}`;
    }
    case 'resolve_pain_entry': {
      const region = typeof r.bodyRegion === 'string' ? r.bodyRegion.replace(/_/g, ' ') : 'region';
      const date = typeof r.resolvedAt === 'string' ? ` on ${r.resolvedAt}` : '';
      return `Pain entry resolved${forClient} — ${region}${date}.`;
    }
    case 'update_pain_entry': {
      const region = typeof r.bodyRegion === 'string' ? r.bodyRegion.replace(/_/g, ' ') : 'region';
      const lvl = typeof r.painLevel === 'number' ? ` Level ${r.painLevel}/10.` : '.';
      return `Pain entry updated${forClient} — ${region}.${lvl}`;
    }
    case 'cancel_session': {
      const sid = typeof r.sessionId === 'number' ? ` #${r.sessionId}` : '';
      const refund = r.refundIssued === true ? ' Session credit restored.' : '';
      const review = r.requiresAdminReview === true ? ' Flagged for admin review (late cancellation).' : '';
      return `Session${sid} cancelled${forClient}.${refund}${review}`;
    }
    case 'view_workout_history': {
      const count = typeof r.count === 'number' ? r.count : 0;
      const last = typeof r.lastSessionDate === 'string' ? ` Last: ${r.lastSessionDate}.` : '';
      const title = typeof r.recentTitle === 'string' ? ` "${r.recentTitle}"` : '';
      return `${count} recent session${count !== 1 ? 's' : ''}${forClient}.${last}${title}`;
    }
    case 'create_availability_override': {
      const dateStr = typeof r.date === 'string' ? ` on ${r.date}` : '';
      const time = (typeof r.startTime === 'string' && typeof r.endTime === 'string')
        ? ` ${r.startTime}–${r.endTime}` : '';
      const type = typeof r.type === 'string' ? r.type : 'blocked';
      return `Availability ${type}${dateStr}${time}.`;
    }
    case 'view_trainer_availability': {
      const count = typeof r.recurringSlotCount === 'number' ? r.recurringSlotCount : 0;
      if (count === 0) return `No recurring availability on file.`;
      const days = typeof r.days === 'string' ? ` Days: ${r.days}.` : '';
      const hours = (typeof r.earliestStart === 'string' && typeof r.latestEnd === 'string')
        ? ` ${r.earliestStart}–${r.latestEnd}.` : '';
      const dw = typeof r.daysWithAvailability === 'number' ? r.daysWithAvailability : 0;
      return `${count} slot${count !== 1 ? 's' : ''} across ${dw} day${dw !== 1 ? 's' : ''}.${days}${hours}`;
    }
    case 'view_available_slots': {
      const count = typeof r.availableSlotCount === 'number' ? r.availableSlotCount : 0;
      const dateStr = typeof r.date === 'string' ? ` on ${r.date}` : '';
      const duration = typeof r.durationMinutes === 'number' ? r.durationMinutes : 60;
      if (count === 0) return `No ${duration}-minute slots available${dateStr}.`;
      const first = typeof r.firstSlotStartUtc === 'string' ? ` First starts at ${r.firstSlotStartUtc} UTC.` : '';
      const last = typeof r.lastSlotEndUtc === 'string' ? ` Last ends at ${r.lastSlotEndUtc} UTC.` : '';
      return `${count} available slot${count !== 1 ? 's' : ''}${dateStr} for ${duration}-minute sessions.${first}${last}`;
    }
    case 'view_today_schedule':
    case 'view_today_sessions': {
      const count = typeof r.count === 'number' ? r.count : 0;
      const dateStr = typeof r.date === 'string' ? ` on ${r.date}` : ' today';
      if (count === 0) return `No sessions scheduled${dateStr}.`;
      const next = typeof r.nextSessionTime === 'string' ? ` Next: ${r.nextSessionTime} UTC.` : '';
      const done = typeof r.completedCount === 'number' && r.completedCount > 0
        ? ` ${r.completedCount} completed.` : '';
      return `${count} session${count !== 1 ? 's' : ''}${dateStr}.${next}${done}`;
    }
    case 'view_week_schedule': {
      const count = typeof r.sessionCount === 'number' ? r.sessionCount : 0;
      const range = (typeof r.startDate === 'string' && typeof r.endDate === 'string')
        ? ` (${r.startDate} – ${r.endDate})` : ' this week';
      if (count === 0) return `No sessions scheduled${range}.`;
      const days = typeof r.daysWithSessions === 'number'
        ? ` Across ${r.daysWithSessions} day${r.daysWithSessions !== 1 ? 's' : ''}.` : '';
      const first = typeof r.firstSessionDate === 'string'
        ? ` First: ${r.firstSessionDate}${typeof r.firstSessionTime === 'string' ? ` at ${r.firstSessionTime} UTC` : ''}.`
        : '';
      return `${count} session${count !== 1 ? 's' : ''}${range}.${days}${first}`;
    }
    case 'create_hermes_task': {
      const agent = typeof r.agentType === 'string' ? r.agentType : 'agent';
      const id = typeof r.taskId === 'string' ? ` (${r.taskId.slice(0, 8)}…)` : '';
      return `Task queued for ${agent} agent${id}.`;
    }
    case 'list_hermes_tasks': {
      const count = typeof r.count === 'number' ? r.count : 0;
      const pending = typeof r.pending === 'number' ? r.pending : 0;
      return `${count} Hermes task${count !== 1 ? 's' : ''} found — ${pending} pending.`;
    }
    default: {
      if (command.startsWith('navigate_') || command.startsWith('scan_command')) {
        const dest = typeof r.destination === 'string' ? r.destination : command.replace(/_/g, ' ');
        return `Navigated to ${dest}.`;
      }
      if (command.startsWith('view_')) {
        return `${command.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} loaded.`;
      }
      return `${command.replace(/_/g, ' ')} completed.`;
    }
  }
}
