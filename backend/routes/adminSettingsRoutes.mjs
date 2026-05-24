/**
 * Admin Settings Routes
 * ====================
 * 
 * Complete admin settings management system for SwanStudios platform.
 * Handles system configuration, notifications, API key management, and security settings.
 * 
 * Features:
 * - System configuration settings (maintenance mode, feature toggles, limits)
 * - Notification settings management (email, SMS, push preferences)
 * - API key management (display masked keys, regenerate, manage integrations)
 * - Security settings (rate limits, session timeouts, audit logs)
 * - Admin preferences and dashboard customization
 * 
 * Part of the Enterprise Admin Dashboard - Production Ready
 * Designed for SwanStudios Platform with comprehensive audit trail
 */

import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import { 
  getSystemSettings,
  updateSystemSettings,
  getNotificationSettings,
  updateNotificationSettings,
  getApiKeyInfo,
  getSecuritySettings,
  updateSecuritySettings,
  getAuditLogs,
  resetToDefaults
} from '../controllers/adminSettingsController.mjs';
import { validationResult, body, query, param } from 'express-validator';
import logger from '../utils/logger.mjs';

const router = express.Router();
const INTERNAL_ERROR = 'internal_error';

// Input validation middleware
const validateSettingsUpdate = [
  body('settings').isObject().withMessage('Settings must be an object'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array()
      });
    }
    next();
  }
];

const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pagination parameters',
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * @route   GET /api/admin/settings/system
 * @desc    Get system configuration settings
 * @access  Admin Only
 */
router.get('/system', protect, adminOnly, async (req, res) => {
  try {
    logger.info(`Admin ${req.user.email} accessing system settings`);
    
    const settings = await getSystemSettings();
    
    res.json({
      success: true,
      message: 'System settings retrieved successfully',
      data: settings,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error fetching system settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve system settings',
      error: INTERNAL_ERROR
    });
  }
});

/**
 * @route   PUT /api/admin/settings/system
 * @desc    Update system configuration settings
 * @access  Admin Only
 */
router.put('/system', protect, adminOnly, validateSettingsUpdate, async (req, res) => {
  try {
    const { settings } = req.body;
    
    logger.info(`Admin ${req.user.email} updating system settings`, {
      updatedFields: Object.keys(settings)
    });
    
    const updatedSettings = await updateSystemSettings(settings, req.user.id);
    
    res.json({
      success: true,
      message: 'System settings updated successfully',
      data: updatedSettings,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error updating system settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update system settings',
      error: INTERNAL_ERROR
    });
  }
});

/**
 * @route   GET /api/admin/settings/notifications
 * @desc    Get notification settings and preferences
 * @access  Admin Only
 */
router.get('/notifications', protect, adminOnly, async (req, res) => {
  try {
    logger.info(`Admin ${req.user.email} accessing notification settings`);
    
    const settings = await getNotificationSettings();
    
    res.json({
      success: true,
      message: 'Notification settings retrieved successfully',
      data: settings,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error fetching notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve notification settings',
      error: INTERNAL_ERROR
    });
  }
});

/**
 * @route   PUT /api/admin/settings/notifications
 * @desc    Update notification settings
 * @access  Admin Only
 */
router.put('/notifications', protect, adminOnly, validateSettingsUpdate, async (req, res) => {
  try {
    const { settings } = req.body;
    
    logger.info(`Admin ${req.user.email} updating notification settings`, {
      updatedFields: Object.keys(settings)
    });
    
    const updatedSettings = await updateNotificationSettings(settings, req.user.id);
    
    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      data: updatedSettings,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error updating notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification settings',
      error: INTERNAL_ERROR
    });
  }
});

/**
 * @route   GET /api/admin/settings/api-keys
 * @desc    Get API key information (masked keys only)
 * @access  Admin Only
 */
router.get('/api-keys', protect, adminOnly, async (req, res) => {
  try {
    logger.info(`Admin ${req.user.email} accessing API key information`);
    
    const apiKeyInfo = await getApiKeyInfo();
    
    res.json({
      success: true,
      message: 'API key information retrieved successfully',
      data: apiKeyInfo,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error fetching API key information:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve API key information',
      error: INTERNAL_ERROR
    });
  }
});

const API_CONNECTIVITY_CHECKS = {
  stripe: {
    label: 'Stripe',
    isConfigured: () => Boolean(process.env.STRIPE_SECRET_KEY),
    missingMessage: 'Stripe API key not configured'
  },
  sendgrid: {
    label: 'SendGrid',
    isConfigured: () => Boolean(process.env.SENDGRID_API_KEY),
    missingMessage: 'SendGrid API key not configured'
  },
  twilio: {
    label: 'Twilio',
    isConfigured: () => Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    missingMessage: 'Twilio credentials not configured'
  }
};

function buildApiConnectivityResult(service) {
  const normalizedService = String(service || '').trim().toLowerCase();
  const check = API_CONNECTIVITY_CHECKS[normalizedService];

  if (!check) {
    return {
      success: false,
      configurationStatus: 'unsupported',
      connectivityVerified: false,
      message: `Unsupported service: ${service}`
    };
  }

  const configured = check.isConfigured();
  return {
    success: false,
    configured,
    configurationStatus: configured ? 'configured_not_verified' : 'not_configured',
    connectivityVerified: false,
    message: configured
      ? `${check.label} credentials are present. Live connectivity verification is not wired for this endpoint.`
      : check.missingMessage,
    lastChecked: new Date().toISOString()
  };
}

/**
 * @route   POST /api/admin/settings/api-keys/test
 * @desc    Test API key connectivity
 * @access  Admin Only
 */
router.post('/api-keys/test', protect, adminOnly, async (req, res) => {
  try {
    const { service } = req.body;
    
    if (!service) {
      return res.status(400).json({
        success: false,
        message: 'Service name is required'
      });
    }
    
    logger.info(`Admin ${req.user.email} testing ${service} API connectivity`);
    
    const testResult = buildApiConnectivityResult(service);
    
    res.json({
      success: true,
      message: `${service} API test completed`,
      data: {
        service,
        testResult
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error testing API connectivity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test API connectivity',
      error: INTERNAL_ERROR
    });
  }
});

/**
 * @route   GET /api/admin/settings/security
 * @desc    Get security settings and configurations
 * @access  Admin Only
 */
router.get('/security', protect, adminOnly, async (req, res) => {
  try {
    logger.info(`Admin ${req.user.email} accessing security settings`);
    
    const settings = await getSecuritySettings();
    
    res.json({
      success: true,
      message: 'Security settings retrieved successfully',
      data: settings,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error fetching security settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve security settings',
      error: INTERNAL_ERROR
    });
  }
});

/**
 * @route   PUT /api/admin/settings/security
 * @desc    Update security settings
 * @access  Admin Only
 */
router.put('/security', protect, adminOnly, validateSettingsUpdate, async (req, res) => {
  try {
    const { settings } = req.body;
    
    logger.info(`Admin ${req.user.email} updating security settings`, {
      updatedFields: Object.keys(settings)
    });
    
    const updatedSettings = await updateSecuritySettings(settings, req.user.id);
    
    res.json({
      success: true,
      message: 'Security settings updated successfully',
      data: updatedSettings,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error updating security settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update security settings',
      error: INTERNAL_ERROR
    });
  }
});

/**
 * @route   GET /api/admin/settings/audit-logs
 * @desc    Get audit logs for settings changes
 * @access  Admin Only
 */
router.get('/audit-logs', protect, adminOnly, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 25, category, startDate, endDate } = req.query;
    
    logger.info(`Admin ${req.user.email} accessing audit logs`, {
      page, limit, category, startDate, endDate
    });
    
    const auditLogs = await getAuditLogs({
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      startDate,
      endDate
    });
    
    res.json({
      success: true,
      message: 'Audit logs retrieved successfully',
      data: auditLogs,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit logs',
      error: INTERNAL_ERROR
    });
  }
});

/**
 * @route   POST /api/admin/settings/reset
 * @desc    Reset settings to default values
 * @access  Admin Only
 */
router.post('/reset', protect, adminOnly, async (req, res) => {
  try {
    const { category } = req.body;
    
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required (system, notifications, security)'
      });
    }
    
    logger.info(`Admin ${req.user.email} resetting ${category} settings to defaults`);
    
    const resetSettings = await resetToDefaults(category, req.user.id);
    
    res.json({
      success: true,
      message: `${category} settings reset to defaults successfully`,
      data: resetSettings,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error resetting settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset settings',
      error: INTERNAL_ERROR
    });
  }
});

/**
 * @route   GET /api/admin/settings/export
 * @desc    Export all settings as JSON
 * @access  Admin Only
 */
router.get('/export', protect, adminOnly, async (req, res) => {
  try {
    logger.info(`Admin ${req.user.email} exporting all settings`);
    
    const [systemSettings, notificationSettings, securitySettings] = await Promise.all([
      getSystemSettings(),
      getNotificationSettings(),
      getSecuritySettings()
    ]);
    
    const exportData = {
      system: systemSettings,
      notifications: notificationSettings,
      security: securitySettings,
      exportedAt: new Date().toISOString(),
      exportedBy: {
        id: req.user.id,
        email: req.user.email
      }
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="swanstudios-settings-${Date.now()}.json"`);
    
    res.json({
      success: true,
      message: 'Settings exported successfully',
      data: exportData
    });
    
  } catch (error) {
    logger.error('Error exporting settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export settings',
      error: INTERNAL_ERROR
    });
  }
});

/**
 * @route   GET /api/admin/settings/health
 * @desc    Get health status of all integrated services
 * @access  Admin Only
 */
router.get('/health', protect, adminOnly, async (req, res) => {
  try {
    logger.info(`Admin ${req.user.email} checking service health`);
    
    const serviceHealth = {
      database: {
        status: 'not_checked',
        healthVerified: false,
        lastChecked: new Date().toISOString(),
        responseTime: null,
        message: 'Database health is not verified by this route.'
      },
      stripe: {
        status: process.env.STRIPE_SECRET_KEY ? 'configured_not_verified' : 'not_configured',
        healthVerified: false,
        lastChecked: new Date().toISOString()
      },
      sendgrid: {
        status: process.env.SENDGRID_API_KEY ? 'configured_not_verified' : 'not_configured',
        healthVerified: false,
        lastChecked: new Date().toISOString()
      },
      twilio: {
        status: (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) ? 'configured_not_verified' : 'not_configured',
        healthVerified: false,
        lastChecked: new Date().toISOString()
      }
    };
    
    res.json({
      success: true,
      message: 'Service configuration report generated',
      data: {
        overall: 'not_verified',
        healthVerified: false,
        services: serviceHealth,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error checking service health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check service health',
      error: INTERNAL_ERROR
    });
  }
});

export default router;
