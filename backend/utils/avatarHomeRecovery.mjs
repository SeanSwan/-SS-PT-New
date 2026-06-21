const VALID_RECOVERY_SOURCES = ['healthkit', 'google_fit'];

const RECOVERY_METRICS = {
  sleepHours: { min: 0, max: 24, integer: false },
  hrv: { min: 0, max: 300, integer: false },
  restingHR: { min: 20, max: 240, integer: false },
  steps: { min: 0, max: 100000, integer: true },
};

const normalizeMetric = (value, bounds) => {
  if (value === null || value === undefined || value === '') return null;
  const numeric = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value.trim())
      : NaN;
  if (!Number.isFinite(numeric) || numeric < bounds.min || numeric > bounds.max) return undefined;
  return bounds.integer ? Math.floor(numeric) : numeric;
};

const normalizeRecommendationMetric = (value, bounds) => (
  typeof value === 'number' ? normalizeMetric(value, bounds) : null
);

export function computeRecoveryRecommendation(sleepHours, hrv, restingHR) {
  const safeSleepHours = normalizeRecommendationMetric(sleepHours, RECOVERY_METRICS.sleepHours);
  const safeHrv = normalizeRecommendationMetric(hrv, RECOVERY_METRICS.hrv);
  const safeRestingHR = normalizeRecommendationMetric(restingHR, RECOVERY_METRICS.restingHR);
  let score = 0;
  let factors = 0;

  if (safeSleepHours != null && safeSleepHours !== undefined) {
    score += safeSleepHours >= 7 ? 100 : safeSleepHours >= 6 ? 70 : 40;
    factors++;
  }
  if (safeHrv != null && safeHrv !== undefined) {
    score += safeHrv >= 50 ? 100 : safeHrv >= 30 ? 70 : 40;
    factors++;
  }
  if (safeRestingHR != null && safeRestingHR !== undefined) {
    score += safeRestingHR <= 60 ? 100 : safeRestingHR <= 75 ? 70 : 40;
    factors++;
  }

  if (factors === 0) {
    return { score: null, recommendation: 'Sync wearable data for recovery insights' };
  }

  const avg = Math.round(score / factors);
  const recommendation = avg >= 80
    ? 'Great recovery - ready for high-intensity training!'
    : avg >= 60
      ? 'Moderate recovery - consider lighter volume today.'
      : 'Low recovery - prioritize flexibility and rest. Wisdom XP awaits!';

  return { score: avg, recommendation };
}

export const buildAvatarHomeRecoveryData = (payload = {}, syncedAt = new Date().toISOString()) => {
  const source = typeof payload?.source === 'string' ? payload.source.trim() : '';
  if (!VALID_RECOVERY_SOURCES.includes(source)) {
    return { error: `source must be: ${VALID_RECOVERY_SOURCES.join(', ')}`, status: 400, data: null };
  }

  const safeSleepHours = normalizeMetric(payload.sleepHours, RECOVERY_METRICS.sleepHours);
  const safeHrv = normalizeMetric(payload.hrv, RECOVERY_METRICS.hrv);
  const safeRestingHR = normalizeMetric(payload.restingHR, RECOVERY_METRICS.restingHR);
  const safeSteps = normalizeMetric(payload.steps, RECOVERY_METRICS.steps);

  if ([safeSleepHours, safeHrv, safeRestingHR, safeSteps].some((value) => value === undefined)) {
    return { error: 'Invalid recovery metric', status: 400, data: null };
  }

  return {
    error: null,
    status: 200,
    data: {
      sleepHours: safeSleepHours,
      hrv: safeHrv,
      restingHR: safeRestingHR,
      steps: safeSteps,
      source,
      syncedAt,
      recoveryRecommendation: computeRecoveryRecommendation(safeSleepHours, safeHrv, safeRestingHR),
    },
  };
};

export function registerAvatarHomeRecoveryRoutes(router, { requireUnlockedHome, logger }) {
  router.post('/recovery-sync', async (req, res) => {
    const built = buildAvatarHomeRecoveryData(req.body);
    if (built.error) {
      return res.status(built.status).json({ success: false, message: built.error });
    }

    try {
      const { home, error, status } = await requireUnlockedHome(req.user.id);
      if (!home) return res.status(status).json({ success: false, message: error });

      await home.update({ wearableRecoveryData: built.data });

      logger.info(`[AUDIT] User ${req.user.id} synced recovery data from ${built.data.source}`);
      res.json({ success: true, data: { wearableRecoveryData: built.data } });
    } catch (err) {
      logger.error('Recovery sync error:', err.message);
      res.status(500).json({ success: false, message: 'Failed to sync recovery data' });
    }
  });
}
