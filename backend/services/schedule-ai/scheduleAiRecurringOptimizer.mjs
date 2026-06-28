const TERMINAL_STATUSES = new Set(['cancelled', 'completed']);
const CONFLICT_STATUSES = new Set(['assigned', 'requested', 'scheduled', 'confirmed', 'booked', 'blocked']);

function normalizeId(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeStatus(value) {
  return String(value || 'unknown').trim().toLowerCase();
}

function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function endDateFor(session) {
  const explicit = parseDate(session?.endDate ?? session?.endTime);
  if (explicit) return explicit;
  const start = parseDate(session?.sessionDate ?? session?.startTime ?? session?.start);
  if (!start) return null;
  return new Date(start.getTime() + (Number(session?.duration) || 60) * 60000);
}

function startDateFor(session) {
  return parseDate(session?.sessionDate ?? session?.startTime ?? session?.start);
}

function isFutureMutable(session, now) {
  const start = startDateFor(session);
  return Boolean(start && start > now && !TERMINAL_STATUSES.has(normalizeStatus(session?.status)));
}

function overlaps(left, right) {
  const leftStart = startDateFor(left);
  const leftEnd = endDateFor(left);
  const rightStart = startDateFor(right);
  const rightEnd = endDateFor(right);
  return Boolean(leftStart && leftEnd && rightStart && rightEnd && leftStart < rightEnd && rightStart < leftEnd);
}

function timeValue(date) {
  const parsed = parseDate(date);
  if (!parsed) return null;
  return `${String(parsed.getUTCHours()).padStart(2, '0')}:${String(parsed.getUTCMinutes()).padStart(2, '0')}`;
}

function minutesFromTime(value) {
  const [hours, minutes] = String(value || '').split(':').map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
}

function minutesOfDay(date) {
  const parsed = parseDate(date);
  return parsed ? parsed.getUTCHours() * 60 + parsed.getUTCMinutes() : null;
}

function preferenceScore(slot, preferences = {}) {
  if (!slot) return 0;
  let score = 0.4;
  const trainerId = normalizeId(slot.trainerId);
  const start = parseDate(slot.startTime ?? slot.sessionDate);
  if (trainerId && preferences.preferredTrainerIds?.map(Number).includes(trainerId)) score += 0.25;
  if (start && preferences.preferredDays?.map(Number).includes(start.getUTCDay())) score += 0.15;
  const startMinutes = minutesOfDay(start);
  const inWindow = preferences.preferredTimeWindows?.some((window) => {
    const min = minutesFromTime(window?.start);
    const max = minutesFromTime(window?.end);
    return min != null && max != null && startMinutes != null && startMinutes >= min && startMinutes <= max;
  });
  if (inWindow) score += 0.25;
  return Math.min(0.95, Math.round(score * 100) / 100);
}

function scoreCurrentSession(session, preferences = {}) {
  return preferenceScore({
    trainerId: session?.trainerId,
    startTime: session?.sessionDate ?? session?.startTime,
  }, preferences);
}

function bestSlot(slots = [], preferences = {}) {
  return [...slots]
    .map((slot) => ({ slot, score: preferenceScore(slot, preferences) }))
    .sort((a, b) => b.score - a.score)[0] || null;
}

function leastLoadedTrainer(trainerLoad = []) {
  return [...trainerLoad]
    .map((entry) => ({ trainerId: normalizeId(entry.trainerId), count: Number(entry.futureSessionCount) || 0 }))
    .filter((entry) => entry.trainerId)
    .sort((a, b) => a.count - b.count || a.trainerId - b.trainerId)[0]?.trainerId || null;
}

function makeIssue({ code, severity, session, conflict = null }) {
  return {
    code,
    severity,
    sessionId: normalizeId(session?.id),
    recurringGroupId: String(session?.recurringGroupId || ''),
    conflictingSessionId: normalizeId(conflict?.id),
  };
}

function makeProposal({ action, issue, patch, confidence, reasonCodes }) {
  return {
    type: 'recurring_series_repair',
    action,
    recurringGroupId: issue.recurringGroupId,
    targetSessionId: issue.sessionId,
    executionPolicy: 'proposal_only',
    mutatesData: false,
    confirmation: {
      required: true,
      canExecute: false,
      mode: 'manual_review',
    },
    suggestedPatch: patch,
    reasonCodes,
    confidence,
  };
}

function patchFromSlot(slot, fallback = {}) {
  const start = slot?.startTime ?? slot?.sessionDate;
  return {
    trainerId: normalizeId(slot?.trainerId ?? fallback.trainerId),
    time: timeValue(start),
    duration: Number(fallback.duration) || 60,
  };
}

function findTrainerConflict(session, comparisonSessions) {
  const trainerId = normalizeId(session?.trainerId);
  if (!trainerId) return null;
  return comparisonSessions.find((candidate) => (
    normalizeId(candidate?.id) !== normalizeId(session?.id)
    && normalizeId(candidate?.trainerId) === trainerId
    && CONFLICT_STATUSES.has(normalizeStatus(candidate?.status))
    && overlaps(session, candidate)
  )) || null;
}

export function buildRecurringOptimizationProposals({
  actor = null,
  recurringGroupId = null,
  seriesSessions = [],
  comparisonSessions = [],
  candidateSlots = [],
  clientPreferences = {},
  trainerLoad = [],
  now = new Date(),
} = {}) {
  const safeNow = now instanceof Date ? now : new Date(now);
  const groupId = String(recurringGroupId || seriesSessions[0]?.recurringGroupId || 'unknown');
  const futureSessions = seriesSessions
    .filter((session) => isFutureMutable(session, safeNow))
    .sort((a, b) => startDateFor(a) - startDateFor(b));

  const issues = [];
  const proposals = [];

  futureSessions.forEach((session) => {
    const conflict = findTrainerConflict(session, comparisonSessions);
    if (conflict) {
      const issue = makeIssue({ code: 'TRAINER_CONFLICT', severity: 'high', session, conflict });
      const ranked = bestSlot(candidateSlots, clientPreferences);
      issues.push(issue);
      if (ranked?.slot) {
        proposals.push(makeProposal({
          action: 'repair_series_conflict',
          issue,
          patch: patchFromSlot(ranked.slot, session),
          confidence: ranked.score,
          reasonCodes: ['TRAINER_CONFLICT'],
        }));
      }
      return;
    }

    if (!normalizeId(session?.trainerId)) {
      const issue = makeIssue({ code: 'TRAINER_GAP', severity: 'high', session });
      const trainerId = leastLoadedTrainer(trainerLoad);
      issues.push(issue);
      if (trainerId) {
        proposals.push(makeProposal({
          action: 'assign_series_trainer',
          issue,
          patch: { trainerId },
          confidence: 0.8,
          reasonCodes: ['TRAINER_GAP'],
        }));
      }
      return;
    }

    const ranked = bestSlot(candidateSlots, clientPreferences);
    if (ranked?.slot && ranked.score > Math.max(0.74, scoreCurrentSession(session, clientPreferences))) {
      const issue = makeIssue({ code: 'PREFERENCE_DRIFT', severity: 'medium', session });
      issues.push(issue);
      proposals.push(makeProposal({
        action: 'improve_series_preference_fit',
        issue,
        patch: patchFromSlot(ranked.slot, session),
        confidence: ranked.score,
        reasonCodes: ['PREFERENCE_DRIFT'],
      }));
    }
  });

  return {
    ok: true,
    actorRole: actor?.role || 'unknown',
    summary: {
      recurringGroupId: groupId,
      evaluatedFutureSessions: futureSessions.length,
      issueCount: issues.length,
      proposalCount: proposals.length,
    },
    issues,
    proposals,
  };
}