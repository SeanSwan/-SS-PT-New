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

    const options = {};
    if (minUrgency) options.minUrgency = parseInt(minUrgency);
    if (limit) options.limit = parseInt(limit);

    const alerts = await getActiveRenewalAlerts(options);

    res.json({
      success: true,
      data: alerts
    });

  } catch (error) {
    console.error('Error getting renewal alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get renewal alerts',
      error: error.message
    });
  }
}

/**
 * Get critical alerts (urgency >= 8)
 * GET /api/renewal-alerts/critical
 */
export async function getCriticalRenewalAlerts(req, res) {
  try {
    const alerts = await getCriticalAlerts();

    res.json({
      success: true,
      data: alerts,
      count: alerts.length
    });

  } catch (error) {
    console.error('Error getting critical alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get critical alerts',
      error: error.message
    });
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

    const alert = await markAlertAsContacted(id, req.user.id, notes);

    res.json({
      success: true,
      data: alert,
      message: 'Alert marked as contacted'
    });

  } catch (error) {
    console.error('Error marking alert as contacted:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark alert as contacted',
      error: error.message
    });
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

    const alert = await markAlertAsRenewed(id, notes);

    res.json({
      success: true,
      data: alert,
      message: 'Alert marked as renewed - great work!'
    });

  } catch (error) {
    console.error('Error marking alert as renewed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark alert as renewed',
      error: error.message
    });
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

    const alert = await dismissAlert(id, notes);

    res.json({
      success: true,
      data: alert,
      message: 'Alert dismissed'
    });

  } catch (error) {
    console.error('Error dismissing alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to dismiss alert',
      error: error.message
    });
  }
}

/**
 * Get renewal alert statistics
 * GET /api/renewal-alerts/stats
 */
export async function getStats(req, res) {
  try {
    const { startDate, endDate } = req.query;

    const options = {};
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);

    const stats = await getRenewalAlertStats(options);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error getting renewal alert stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get stats',
      error: error.message
    });
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

    const alerts = await getUserAlerts(userId, activeOnly === 'true');

    res.json({
      success: true,
      data: alerts
    });

  } catch (error) {
    console.error('Error getting user alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user alerts',
      error: error.message
    });
  }
}

/**
 * Create manual alert
 * POST /api/renewal-alerts/manual
 */
export async function createManualRenewalAlert(req, res) {
  try {
    const { userId, notes, urgencyScore, sessionsRemaining, daysSinceLastSession } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    const alert = await createManualAlert(userId, req.user.id, {
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
    res.status(500).json({
      success: false,
      message: 'Failed to create manual alert',
      error: error.message
    });
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
