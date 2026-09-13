import {
  getActiveRenewalAlerts,
  getCriticalAlerts,
  markAlertAsContacted,
  markAlertAsRenewed,
  dismissAlert,
  getRenewalAlertStats,
  getUserAlerts,
  createManualAlert,
  checkClientsForRenewalAlerts
} from '../services/renewalAlertService.mjs';
import {
  assertRenewalClientAccess,
  getRenewalAlertScope,
  loadAuthorizedRenewalAlert,
  sendRenewalAccessError,
} from '../services/renewalAlertAccess.mjs';

/**
 * Renewal Alert Controller
 * Handles renewal alert operations for trainers
 */

/**
 * Get all active renewal alerts
 * GET /api/renewal-alerts
 */
export async function getAlerts(req, res) {
  try {
    const { minUrgency, limit } = req.query;

    const options = { clientIds: await getRenewalAlertScope(req) };
    if (minUrgency) options.minUrgency = parseInt(minUrgency);
    if (limit) options.limit = parseInt(limit);

    const alerts = await getActiveRenewalAlerts(options);

    res.json({
      success: true,
      data: alerts
    });

  } catch (error) {
    console.error('Error getting renewal alerts:', error);
    sendRenewalAccessError(res, error, 'Renewal alerts are temporarily unavailable');
  }
}

/**
 * Get critical alerts (urgency >= 8)
 * GET /api/renewal-alerts/critical
 */
export async function getCriticalRenewalAlerts(req, res) {
  try {
    const alerts = await getCriticalAlerts({ clientIds: await getRenewalAlertScope(req) });

    res.json({
      success: true,
      data: alerts,
      count: alerts.length
    });

  } catch (error) {
    console.error('Error getting critical alerts:', error);
    sendRenewalAccessError(res, error, 'Critical alerts are temporarily unavailable');
  }
}

/**
 * Mark alert as contacted
 * PUT /api/renewal-alerts/:id/contacted
 */
export async function markAsContacted(req, res) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const authorized = await loadAuthorizedRenewalAlert(req, id);

    const alert = await markAlertAsContacted(authorized.alertId, req.user.id, notes, {
      alert: authorized.alert,
    });

    res.json({
      success: true,
      data: alert,
      message: 'Alert marked as contacted'
    });

  } catch (error) {
    console.error('Error marking alert as contacted:', error);
    sendRenewalAccessError(res, error, 'Renewal alert is temporarily unavailable');
  }
}

/**
 * Mark alert as renewed
 * PUT /api/renewal-alerts/:id/renewed
 */
export async function markAsRenewed(req, res) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const authorized = await loadAuthorizedRenewalAlert(req, id);

    const alert = await markAlertAsRenewed(authorized.alertId, notes, {
      alert: authorized.alert,
    });

    res.json({
      success: true,
      data: alert,
      message: 'Alert marked as renewed - great work!'
    });

  } catch (error) {
    console.error('Error marking alert as renewed:', error);
    sendRenewalAccessError(res, error, 'Renewal alert is temporarily unavailable');
  }
}

/**
 * Dismiss alert
 * PUT /api/renewal-alerts/:id/dismiss
 */
export async function dismissRenewalAlert(req, res) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const authorized = await loadAuthorizedRenewalAlert(req, id);

    const alert = await dismissAlert(authorized.alertId, notes, {
      alert: authorized.alert,
    });

    res.json({
      success: true,
      data: alert,
      message: 'Alert dismissed'
    });

  } catch (error) {
    console.error('Error dismissing alert:', error);
    sendRenewalAccessError(res, error, 'Renewal alert is temporarily unavailable');
  }
}

/**
 * Get renewal alert statistics
 * GET /api/renewal-alerts/stats
 */
export async function getStats(req, res) {
  try {
    const { startDate, endDate } = req.query;

    const options = { clientIds: await getRenewalAlertScope(req) };
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);

    const stats = await getRenewalAlertStats(options);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error getting renewal alert stats:', error);
    sendRenewalAccessError(res, error, 'Renewal alert statistics are temporarily unavailable');
  }
}

/**
 * Get alerts for specific user
 * GET /api/renewal-alerts/user/:userId
 */
export async function getAlertsForUser(req, res) {
  try {
    const { userId } = req.params;
    const { activeOnly } = req.query;
    const authorizedUserId = await assertRenewalClientAccess(req, userId);

    const alerts = await getUserAlerts(authorizedUserId, activeOnly === 'true');

    res.json({
      success: true,
      data: alerts
    });

  } catch (error) {
    console.error('Error getting user alerts:', error);
    sendRenewalAccessError(res, error, 'User alerts are temporarily unavailable');
  }
}

/**
 * Create manual alert
 * POST /api/renewal-alerts/manual
 */
export async function createManualRenewalAlert(req, res) {
  try {
    const { userId, notes, urgencyScore, sessionsRemaining, daysSinceLastSession } = req.body;

    const authorizedUserId = await assertRenewalClientAccess(req, userId);

    const alert = await createManualAlert(authorizedUserId, req.user.id, {
      notes,
      urgencyScore,
      sessionsRemaining,
      daysSinceLastSession
    });

    res.status(201).json({
      success: true,
      data: alert,
      message: 'Manual alert created successfully'
    });

  } catch (error) {
    console.error('Error creating manual alert:', error);
    sendRenewalAccessError(res, error, 'Manual alert creation is temporarily unavailable');
  }
}

/**
 * Run renewal alert check (admin only)
 * POST /api/renewal-alerts/check
 */
export async function runAlertCheck(req, res) {
  try {
    // Only allow admin/trainer to run this
    if (req.user.role !== 'admin' && req.user.role !== 'trainer') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const summary = await checkClientsForRenewalAlerts();

    res.json({
      success: true,
      data: summary,
      message: 'Renewal alert check completed'
    });

  } catch (error) {
    console.error('Error running alert check:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run alert check',
      error: error.message
    });
  }
}
