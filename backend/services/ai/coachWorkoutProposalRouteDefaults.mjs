/**
 * coachWorkoutProposalRouteDefaults.mjs
 * =====================================
 * Applies trusted route-context defaults to Coach workout proposal payloads.
 */
import {
  WORKOUT_LOG_SOURCES,
  isHistoricalWorkoutLogSource,
  normalizeWorkoutLogSource,
} from '../workout/workoutLogSourcePolicy.mjs';

const ROUTE_CONTEXT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function safeRouteDate(routeContext) {
  const scheduledSessionDate = String(routeContext?.scheduledSessionDate || '').trim();
  if (ROUTE_CONTEXT_DATE_PATTERN.test(scheduledSessionDate)) return scheduledSessionDate;
  const workoutDate = String(routeContext?.workoutDate || '').trim();
  return ROUTE_CONTEXT_DATE_PATTERN.test(workoutDate) ? workoutDate : null;
}

function safeRouteScheduledSessionId(routeContext) {
  const scheduledSessionId = String(routeContext?.scheduledSessionId || '').trim();
  return /^[1-9]\d*$/.test(scheduledSessionId) ? scheduledSessionId : null;
}

function safeWorkoutLogSource(payloadSource, routeContext) {
  const routeAllowsHistoricalSource = routeContext?.intent === 'historical_import';
  if (routeAllowsHistoricalSource) {
    const requestedSource = normalizeWorkoutLogSource(payloadSource);
    return isHistoricalWorkoutLogSource(requestedSource)
      ? requestedSource
      : WORKOUT_LOG_SOURCES.HISTORICAL_IMPORT;
  }

  return payloadSource ? WORKOUT_LOG_SOURCES.LIVE : null;
}

export function withWorkoutRouteDefaults(payload, routeContext) {
  const defaults = {};
  const date = safeRouteDate(routeContext);
  if (date && !payload.date) defaults.date = date;
  const scheduledSessionId = safeRouteScheduledSessionId(routeContext);
  if (scheduledSessionId && payload.scheduledSessionId == null) {
    defaults.scheduledSessionId = scheduledSessionId;
  }
  const source = safeWorkoutLogSource(payload.source, routeContext);
  if (source) defaults.source = source;
  return Object.keys(defaults).length ? { ...payload, ...defaults } : payload;
}

export function withSplitPlanRouteDefaults(payload, routeContext) {
  const source = safeWorkoutLogSource(payload.source, routeContext);
  return source ? { ...payload, source } : payload;
}