import { RenewalAlert, User, Session, sequelize } from '../models/index.mjs';
import { Op } from 'sequelize';

/**
 * Renewal Alert Service
 * Proactively identifies clients at risk of not renewing
 * Calculates urgency scores and creates alerts for trainers
 */

/**
 * Calculate urgency score (1-10 scale)
 * Formula: Sessions component (0-5) + Inactivity component (0-5) = 1-10 total
 *
 * @param {number} sessionsRemaining - Number of sessions left in package
 * @param {number} daysSinceLastSession - Days since client's last session
 * @returns {number} Urgency score 1-10
 */
export function calculateUrgencyScore(sessionsRemaining, daysSinceLastSession) {
  let score = 0;

  // Sessions Remaining Component (0-5 points)
  if (sessionsRemaining === 0) {
    score += 5; // Out of sessions - CRITICAL
  } else if (sessionsRemaining === 1) {
    score += 4; // One session left - URGENT
  } else if (sessionsRemaining === 2) {
    score += 3; // Two sessions left - HIGH
  } else if (sessionsRemaining === 3) {
    score += 2; // Three sessions left - MEDIUM
  } else if (sessionsRemaining <= 5) {
    score += 1; // 4-5 sessions left - LOW
  }
  // 6+ sessions = 0 points (not urgent yet)

  // Inactivity Component (0-5 points)
  if (daysSinceLastSession >= 14) {
    score += 5; // 2+ weeks inactive - CRITICAL
  } else if (daysSinceLastSession >= 10) {
    score += 4; // 10-13 days - URGENT
  } else if (daysSinceLastSession >= 7) {
    score += 3; // 1 week - HIGH
  } else if (daysSinceLastSession >= 5) {
    score += 2; // 5-6 days - MEDIUM
  } else if (daysSinceLastSession >= 3) {
    score += 1; // 3-4 days - LOW
  }
  // 0-2 days = 0 points (recently active)

  // Ensure score is at least 1 if there's any urgency
  return Math.max(1, Math.min(score, 10));
}

/**
 * Check all clients and create/update renewal alerts
 * This should be run as a cron job (daily recommended)
 *
 * @returns {Object} Summary of alerts created/updated
 */
export async function checkClientsForRenewalAlerts() {
  const transaction = await sequelize.transaction();

  try {
    // Get all active clients with their session packages
    const clients = await User.findAll({
      where: {
        role: 'client',
        isActive: true
      },
      include: [{
        model: Session,
        as: 'sessions',
        where: {
          status: { [Op.in]: ['active', 'scheduled', 'completed'] }
        },
        required: false,
        order: [['sessionDate', 'DESC']]
      }],
      transaction
    });

    const summary = {
      totalClientsChecked: clients.length,
      alertsCreated: 0,
      alertsUpdated: 0,
      criticalAlerts: 0,
      urgentAlerts: 0,
      errors: []
    };

    for (const client of clients) {
      try {
        // Calculate sessions remaining from their active package
        // This assumes client has a currentPackage or we calculate from Sessions
        const completedSessions = client.sessions?.filter(s => s.status === 'completed').length || 0;
        const totalSessions = client.totalSessions || 0; // Assumes User model has totalSessions field
        const sessionsRemaining = Math.max(0, totalSessions - completedSessions);

        // Get last session date
        const lastSession = client.sessions && client.sessions.length > 0
          ? client.sessions.find(s => s.status === 'completed')
          : null;

        const lastSessionDate = lastSession ? new Date(lastSession.sessionDate) : null;
        const daysSinceLastSession = lastSessionDate
          ? Math.floor((new Date() - lastSessionDate) / (1000 * 60 * 60 * 24))
          : 999; // If no sessions, treat as highly inactive

        // Calculate urgency score
        const urgencyScore = calculateUrgencyScore(sessionsRemaining, daysSinceLastSession);

        // Only create alerts for urgency >= 3 (medium or higher)
        if (urgencyScore >= 3) {
          // Check if alert already exists
          const existingAlert = await RenewalAlert.findOne({
            where: {
              userId: client.id,
              status: 'active'
            },
            transaction
          });

          if (existingAlert) {
            // Update existing alert if urgency changed
            if (existingAlert.urgencyScore !== urgencyScore) {
              await existingAlert.update({
                sessionsRemaining,
                lastSessionDate,
                daysSinceLastSession,
                urgencyScore,
                updatedAt: new Date()
              }, { transaction });

              summary.alertsUpdated++;

              if (urgencyScore >= 8) summary.criticalAlerts++;
              else if (urgencyScore >= 6) summary.urgentAlerts++;
            }
          } else {
            // Create new alert
            await RenewalAlert.create({
              userId: client.id,
              sessionsRemaining,
              lastSessionDate,
              daysSinceLastSession,
              urgencyScore,
              status: 'active',
              alertTriggeredDate: new Date()
            }, { transaction });

            summary.alertsCreated++;

            if (urgencyScore >= 8) summary.criticalAlerts++;
            else if (urgencyScore >= 6) summary.urgentAlerts++;
          }
        } else {
          // Urgency is low - dismiss any active alerts
          await RenewalAlert.update(
            { status: 'dismissed', dismissedAt: new Date() },
            {
              where: {
                userId: client.id,
                status: 'active'
              },
              transaction
            }
          );
        }

      } catch (clientError) {
        console.error(`Error processing client ${client.id}:`, clientError);
        summary.errors.push({
          clientId: client.id,
          error: clientError.message
        });
      }
    }

    await transaction.commit();
    return summary;

  } catch (error) {
    await transaction.rollback();
    console.error('Error in checkClientsForRenewalAlerts:', error);
    throw error;
  }
}

/**
 * Get all active renewal alerts sorted by urgency
 *
 * @param {Object} options - Query options
 * @returns {Array} Array of renewal alerts with client data
 */
export async function getActiveRenewalAlerts(options = {}) {
  const queryOptions = {
    where: {
      status: 'active'
    },
    include: [{
      model: User,
      as: 'user',
      attributes: ['id', 'username', 'email', 'firstName', 'lastName', 'phone']
    }],
    order: [['urgencyScore', 'DESC'], ['alertTriggeredDate', 'ASC']]
  };

  // Filter by urgency threshold
  if (options.minUrgency) {
    queryOptions.where.urgencyScore = {
      [Op.gte]: options.minUrgency
    };
  }

  // Limit results
  if (options.limit) {
    queryOptions.limit = options.limit;
  }

  return await RenewalAlert.findAll(queryOptions);
}

/**
 * Get critical alerts (urgency >= 8)
 *
 * @returns {Array} Array of critical renewal alerts
 */
export async function getCriticalAlerts() {
  return await getActiveRenewalAlerts({ minUrgency: 8 });
}

/**
 * Mark alert as contacted
 *
 * @param {string} alertId - Alert ID
 * @param {string} contactedBy - User ID of trainer who contacted client
 * @param {string} notes - Contact notes
 * @returns {Object} Updated alert
 */
export async function markAlertAsContacted(alertId, contactedBy, notes = '') {
  const alert = await RenewalAlert.findByPk(alertId);
  if (!alert) {
    throw new Error('Alert not found');
  }

  await alert.update({
    status: 'contacted',
    contactedAt: new Date(),
    contactedBy,
    contactNotes: notes
  });

  return alert;
}

/**
 * Mark alert as renewed (client purchased new package)
 *
 * @param {string} alertId - Alert ID
 * @param {string} notes - Renewal notes
 * @returns {Object} Updated alert
 */
export async function markAlertAsRenewed(alertId, notes = '') {
  const alert = await RenewalAlert.findByPk(alertId);
  if (!alert) {
    throw new Error('Alert not found');
  }

  await alert.update({
    status: 'renewed',
    renewedAt: new Date(),
    renewalNotes: notes
  });

  return alert;
}

/**
 * Dismiss alert (client not interested or other reason)
 *
 * @param {string} alertId - Alert ID
 * @param {string} notes - Dismissal reason
 * @returns {Object} Updated alert
 */
export async function dismissAlert(alertId, notes = '') {
  const alert = await RenewalAlert.findByPk(alertId);
  if (!alert) {
    throw new Error('Alert not found');
  }

  await alert.update({
    status: 'dismissed',
    dismissedAt: new Date(),
    dismissalNotes: notes
  });

  return alert;
}

/**
 * Get renewal alert statistics
 *
 * @param {Object} options - Date range options
 * @returns {Object} Statistics object
 */
export async function getRenewalAlertStats(options = {}) {
  const whereClause = {};

  if (options.startDate) {
    whereClause.alertTriggeredDate = {
      [Op.gte]: options.startDate
    };
  }

  if (options.endDate) {
    whereClause.alertTriggeredDate = {
      ...whereClause.alertTriggeredDate,
      [Op.lte]: options.endDate
    };
  }

  const [totalAlerts, activeAlerts, contactedAlerts, renewedAlerts, dismissedAlerts] = await Promise.all([
    RenewalAlert.count({ where: whereClause }),
    RenewalAlert.count({ where: { ...whereClause, status: 'active' } }),
    RenewalAlert.count({ where: { ...whereClause, status: 'contacted' } }),
    RenewalAlert.count({ where: { ...whereClause, status: 'renewed' } }),
    RenewalAlert.count({ where: { ...whereClause, status: 'dismissed' } })
  ]);

  // Calculate conversion rate (renewed / (contacted + renewed + dismissed))
  const totalResolved = contactedAlerts + renewedAlerts + dismissedAlerts;
  const conversionRate = totalResolved > 0 ? ((renewedAlerts / totalResolved) * 100).toFixed(2) : 0;

  // Get urgency distribution
  const urgencyDistribution = await RenewalAlert.findAll({
    where: { ...whereClause, status: 'active' },
    attributes: [
      'urgencyScore',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['urgencyScore'],
    raw: true
  });

  return {
    total: totalAlerts,
    active: activeAlerts,
    contacted: contactedAlerts,
    renewed: renewedAlerts,
    dismissed: dismissedAlerts,
    conversionRate: parseFloat(conversionRate),
    urgencyDistribution: urgencyDistribution.reduce((acc, item) => {
      acc[item.urgencyScore] = parseInt(item.count);
      return acc;
    }, {})
  };
}

/**
 * Get alerts for specific user
 *
 * @param {string} userId - User ID
 * @param {boolean} activeOnly - Only return active alerts
 * @returns {Array} Array of renewal alerts
 */
export async function getUserAlerts(userId, activeOnly = false) {
  const whereClause = { userId };

  if (activeOnly) {
    whereClause.status = 'active';
  }

  return await RenewalAlert.findAll({
    where: whereClause,
    order: [['alertTriggeredDate', 'DESC']]
  });
}

/**
 * Create manual renewal alert
 * For trainers to manually flag clients who need attention
 *
 * @param {string} userId - Client user ID
 * @param {string} createdBy - Trainer user ID
 * @param {Object} alertData - Alert data
 * @returns {Object} Created alert
 */
export async function createManualAlert(userId, createdBy, alertData) {
  // Check if active alert already exists
  const existingAlert = await RenewalAlert.findOne({
    where: {
      userId,
      status: 'active'
    }
  });

  if (existingAlert) {
    // Update existing alert with manual notes
    await existingAlert.update({
      urgencyScore: alertData.urgencyScore || existingAlert.urgencyScore,
      notes: `${existingAlert.notes || ''}\n[Manual flag by trainer ${createdBy}]: ${alertData.notes || 'Flagged for follow-up'}`.trim()
    });
    return existingAlert;
  }

  // Create new manual alert
  return await RenewalAlert.create({
    userId,
    sessionsRemaining: alertData.sessionsRemaining || 0,
    lastSessionDate: alertData.lastSessionDate || new Date(),
    daysSinceLastSession: alertData.daysSinceLastSession || 0,
    urgencyScore: alertData.urgencyScore || 5,
    status: 'active',
    alertTriggeredDate: new Date(),
    notes: `[Manual alert created by trainer ${createdBy}]: ${alertData.notes || 'Flagged for follow-up'}`
  });
}
