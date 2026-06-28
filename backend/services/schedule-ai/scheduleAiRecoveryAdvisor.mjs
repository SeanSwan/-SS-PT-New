const COMPLETED_STATUSES = new Set(['completed']);
const MIN_COMPLETED_FOR_HARD_BLOCK = 4;
const MIN_RATED_FOR_HARD_BLOCK = 3;

function normalizeId(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function metric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function mean(values) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
}

function riskLevel(score) {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

function isCompletedSession(session) {
  return COMPLETED_STATUSES.has(normalizeStatus(session?.status)) || Boolean(session?.completedAt);
}

function effortRating(session) {
  return metric(session?.intensity) ?? metric(session?.avgRPE) ?? metric(session?.rpe);
}

function splitMovementList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => /^[a-z _-]{2,32}$/.test(item))
    .slice(0, 4);
}

function normalizeRegion(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function activePainRows(painEntries = []) {
  return painEntries
    .filter((entry) => entry && entry.isActive !== false && !entry.resolvedAt)
    .map((entry) => ({
      bodyRegion: normalizeRegion(entry.bodyRegion),
      painLevel: metric(entry.painLevel) ?? 0,
      painType: normalizeRegion(entry.painType),
      aggravatingMovements: splitMovementList(entry.aggravatingMovements),
    }))
    .filter((entry) => entry.bodyRegion && entry.painLevel > 0);
}

function plannedFocusRegions(plannedSession = {}) {
  const explicit = plannedSession.plannedFocusRegions
    ?? plannedSession.focusRegions
    ?? plannedSession.bodyRegions
    ?? plannedSession.targetRegions
    ?? [];
  const values = Array.isArray(explicit) ? explicit : String(explicit).split(',');
  return values.map(normalizeRegion).filter(Boolean);
}

function dataCompleteness({ completedSessions, ratedSessions, activePain }) {
  const enoughForHardBlock = completedSessions.length >= MIN_COMPLETED_FOR_HARD_BLOCK
    && ratedSessions.length >= MIN_RATED_FOR_HARD_BLOCK
    && activePain.length > 0;
  const level = enoughForHardBlock
    ? 'high'
    : completedSessions.length >= 2 && ratedSessions.length >= 1
      ? 'medium'
      : 'low';
  return {
    level,
    completedSessionCount: completedSessions.length,
    ratedSessionCount: ratedSessions.length,
    activePainEntryCount: activePain.length,
    enoughForHardBlock,
  };
}

function affectedRegionsFor(activePain, focusRegions) {
  if (!focusRegions.length) return [];
  const focus = new Set(focusRegions);
  return [...new Set(activePain
    .filter((entry) => focus.has(entry.bodyRegion) || entry.aggravatingMovements.some((movement) => focus.has(movement)))
    .map((entry) => entry.bodyRegion))];
}

function recoveryRisk({ completedSessions, activePain }) {
  const ratings = completedSessions.map(effortRating).filter((value) => value !== null);
  const durations = completedSessions.map((session) => metric(session?.duration)).filter((value) => value !== null);
  const averageEffort = mean(ratings);
  const averageDuration = mean(durations) ?? 0;
  const maxPain = activePain.length ? Math.max(...activePain.map((entry) => entry.painLevel)) : 0;
  const score = clampScore(Math.max(
    maxPain * 10,
    (averageEffort ?? 0) * 10,
    averageDuration > 75 ? 55 : 0,
  ));
  return {
    level: riskLevel(score),
    score,
    averageEffort: averageEffort === null ? null : Math.round(averageEffort * 10) / 10,
    maxPainLevel: maxPain || null,
  };
}

function advisoryModeFor({ completeness, risk }) {
  if (completeness.enoughForHardBlock && risk.level === 'high') return 'trainer_review_required';
  if (completeness.level === 'low') return 'collect_more_data';
  if (risk.level !== 'low') return 'soft_caution';
  return 'normal_monitoring';
}

function guidanceFor({ advisoryMode, affectedRegions }) {
  if (advisoryMode === 'trainer_review_required') {
    return {
      decision: 'trainer_review',
      affectedRegions,
      reasons: ['HIGH_RECOVERY_RISK', 'ENOUGH_DATA_FOR_HARD_BLOCK_REVIEW'],
    };
  }
  if (advisoryMode === 'collect_more_data') {
    return {
      decision: 'collect_more_data',
      affectedRegions,
      reasons: ['INSUFFICIENT_RECOVERY_HISTORY'],
    };
  }
  if (advisoryMode === 'soft_caution') {
    return {
      decision: 'modify',
      affectedRegions,
      reasons: ['RECOVERY_CAUTION'],
    };
  }
  return {
    decision: 'proceed',
    affectedRegions,
    reasons: ['NO_RECOVERY_BLOCKER_DETECTED'],
  };
}

function recommendationsFor({ advisoryMode, completeness, affectedRegions }) {
  if (advisoryMode === 'collect_more_data') {
    return [
      'Record recent completed sessions with intensity or RPE before using recovery risk as a hard scheduling gate.',
      'Confirm current pain status with the client before increasing session load.',
    ];
  }
  if (advisoryMode === 'trainer_review_required') {
    return [
      'Require trainer review before scheduling loaded work for affected regions.',
      'Modify the next session toward pain-free movement, controlled intensity, and flexibility work as appropriate.',
    ];
  }
  if (affectedRegions.length || completeness.activePainEntryCount > 0) {
    return ['Keep the session adjustable and review active pain entries before progressing load.'];
  }
  return ['Continue logging duration and intensity so recovery guidance stays evidence-based.'];
}

export function buildScheduleRecoveryAdvisory({
  actor = null,
  plannedSession = {},
  recentSessions = [],
  painEntries = [],
} = {}) {
  const completedSessions = recentSessions.filter(isCompletedSession);
  const ratedSessions = completedSessions.filter((session) => effortRating(session) !== null);
  const activePain = activePainRows(painEntries);
  const completeness = dataCompleteness({ completedSessions, ratedSessions, activePain });
  const risk = recoveryRisk({ completedSessions, activePain });
  const affectedRegions = affectedRegionsFor(activePain, plannedFocusRegions(plannedSession));
  const advisoryMode = advisoryModeFor({ completeness, risk });
  const hardBlockAllowed = completeness.enoughForHardBlock && advisoryMode === 'trainer_review_required';

  return {
    ok: true,
    type: 'recovery_safety_advisory',
    actorRole: actor?.role || 'unknown',
    targetClientId: normalizeId(plannedSession.clientId ?? plannedSession.userId),
    targetSessionId: normalizeId(plannedSession.id),
    executionPolicy: 'read_only',
    mutatesData: false,
    hardBlockAllowed,
    advisoryMode,
    dataCompleteness: completeness,
    risk: {
      level: risk.level,
      score: risk.score,
    },
    scheduleGuidance: guidanceFor({ advisoryMode, affectedRegions }),
    evidence: {
      recentSessionCount: recentSessions.length,
      completedSessionCount: completedSessions.length,
      ratedSessionCount: ratedSessions.length,
      averageEffort: risk.averageEffort,
      maxPainLevel: risk.maxPainLevel,
      activePainRegions: activePain.slice(0, 5),
    },
    recommendations: recommendationsFor({ advisoryMode, completeness, affectedRegions }),
  };
}