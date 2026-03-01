/**
 * Measurement Schedule Service
 * ─────────────────────────────────────────────────────────────
 * Tracks measurement and weigh-in due dates for clients.
 *
 *   GREEN (#22c55e): > 25% of interval remaining
 *   YELLOW (#eab308): ≤ 25% remaining
 *   RED (#ef4444): past due
 *
 * Phase 11A — Client Measurements & Schedule Tracking
 */
import { Op } from 'sequelize';

/**
 * Calculate status for a single schedule item.
 *
 * @param {Date|string|null} lastDate
 * @param {number} intervalDays
 * @returns {{ status: 'green'|'yellow'|'red', daysRemaining: number, dueDate: string|null }}
 */
export function getCheckStatus(lastDate, intervalDays) {
  if (!lastDate || !intervalDays) {
    return { status: 'red', daysRemaining: 0, dueDate: null };
  }

  const last = new Date(lastDate);
  const due = new Date(last);
  due.setDate(due.getDate() + intervalDays);

  const now = new Date();
  const msRemaining = due.getTime() - now.getTime();
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

  const threshold = Math.ceil(intervalDays * 0.25);

  let status;
  if (daysRemaining <= 0) {
    status = 'red';
  } else if (daysRemaining <= threshold) {
    status = 'yellow';
  } else {
    status = 'green';
  }

  return {
    status,
    daysRemaining,
    dueDate: due.toISOString().split('T')[0],
  };
}

/**
 * Get measurement + weigh-in status for a client user.
 *
 * @param {Object} user — User instance or plain object
 * @returns {{ measurementStatus: Object, weighInStatus: Object }}
 */
export function getMeasurementStatus(user) {
  return {
    measurementStatus: getCheckStatus(user.lastFullMeasurementDate, user.measurementIntervalDays || 30),
    weighInStatus: getCheckStatus(user.lastWeighInDate, user.weighInIntervalDays || 7),
  };
}

/**
 * Get clients with upcoming or overdue checks, sorted by urgency (RED first).
 *
 * @param {typeof import('../models/User.mjs').default} UserModel
 * @param {number} [limit=20]
 * @returns {Promise<Array>}
 */
export async function getClientsWithUpcomingChecks(UserModel, limit = 20) {
  const clients = await UserModel.findAll({
    where: { role: 'client', isActive: true },
    attributes: [
      'id', 'firstName', 'lastName', 'email',
      'lastFullMeasurementDate', 'lastWeighInDate',
      'measurementIntervalDays', 'weighInIntervalDays',
    ],
    raw: true,
  });

  const enriched = clients.map(client => {
    const { measurementStatus, weighInStatus } = getMeasurementStatus(client);
    // Urgency score: red=0 (most urgent), yellow=1, green=2
    const urgencyMap = { red: 0, yellow: 1, green: 2 };
    const minUrgency = Math.min(
      urgencyMap[measurementStatus.status],
      urgencyMap[weighInStatus.status],
    );
    return { ...client, measurementStatus, weighInStatus, urgency: minUrgency };
  });

  // Sort by urgency ascending (red first), then by soonest due date
  enriched.sort((a, b) => {
    if (a.urgency !== b.urgency) return a.urgency - b.urgency;
    const aDays = Math.min(a.measurementStatus.daysRemaining, a.weighInStatus.daysRemaining);
    const bDays = Math.min(b.measurementStatus.daysRemaining, b.weighInStatus.daysRemaining);
    return aDays - bDays;
  });

  // Filter out green clients (only return yellow + red) unless there aren't enough
  const urgent = enriched.filter(c => c.urgency < 2);
  return (urgent.length >= limit ? urgent : enriched).slice(0, limit);
}

/**
 * Sync measurement schedule dates after a new measurement is created.
 *
 * @param {typeof import('../models/User.mjs').default} UserModel
 * @param {number} userId
 * @param {Object} measurement — BodyMeasurement instance or plain object
 */
export async function syncMeasurementDates(UserModel, userId, measurement) {
  const updates = {};
  const date = measurement.measurementDate || new Date();

  // Check if this is a full measurement (has circumference data) or weight-only
  const circumferenceFields = [
    'neck', 'shoulders', 'chest', 'upperChest', 'underChest',
    'rightBicep', 'leftBicep', 'rightForearm', 'leftForearm',
    'naturalWaist', 'umbilicus', 'lowerWaist', 'hips',
    'rightThigh', 'leftThigh', 'rightCalf', 'leftCalf',
  ];

  const hasCircumference = circumferenceFields.some(f => measurement[f] != null);
  const hasWeight = measurement.weight != null;

  if (hasCircumference) {
    updates.lastFullMeasurementDate = date;
  }
  if (hasWeight) {
    updates.lastWeighInDate = date;
  }

  if (Object.keys(updates).length > 0) {
    await UserModel.update(updates, { where: { id: userId } });
  }
}
