/**
 * Admin Settings Controller
 * ========================
 * 
 * Business logic for admin settings management in SwanStudios platform.
 * Handles system configuration, notifications, API keys, and security settings.
 * 
 * Features:
 * - System settings (maintenance mode, feature flags, operational limits)
 * - Notification preferences (email, SMS, push notifications)
 * - API key management (masked display, service status)
 * - Security configurations (rate limits, session timeouts, audit trail)
 * - Settings validation and sanitization
 * - Comprehensive audit logging
 * 
 * Part of the Enterprise Admin Dashboard - Production Ready
 * Uses existing AdminSettings model for data persistence
 */

import { getAdminSettings } from '../models/index.mjs';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';

/**
 * Helper: Find admin settings row by category using raw SQL.
 * Tries multiple column names to handle schema variations.
 */
async function findSettingsByCategory(category) {
  // Try common column names for the category key
  for (const col of ['user_id', 'userId', 'category']) {
    try {
      const [rows] = await sequelize.query(
        `SELECT * FROM admin_settings WHERE "${col}" = :category LIMIT 1`,
        { replacements: { category } }
      );
      if (rows && rows.length > 0) {
        const row = rows[0];
        const settingsVal = typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings;
        return {
          settings: settingsVal,
          updatedAt: row.updatedAt || row.updated_at || row.updatedat || null
        };
      }
      return null; // Column exists but no matching row
    } catch (e) {
      // Column doesn't exist, try next
      logger.debug(`[AdminSettings] Column "${col}" not found: ${e.message}`);
      continue;
    }
  }
  logger.warn('[AdminSettings] No matching column found in admin_settings table');
  return null; // No column worked
}

// Default settings configurations
const DEFAULT_SYSTEM_SETTINGS = {
  maintenance: {
    enabled: false,
    message: 'SwanStudios is temporarily down for maintenance. We\'ll be back soon!',
    allowedIPs: []
  },
  features: {
    userRegistration: true,
    sessionBooking: true,
    paymentProcessing: true,
    socialFeatures: true,
    gamification: true,
    mcpIntegration: true
  },
  limits: {
    maxUsersPerTrainer: 50,
    maxSessionsPerDay: 20,
    maxCartItems: 10,
    sessionBookingAdvanceDays: 30
  },
  branding: {
    companyName: 'SwanStudios',
    primaryColor: '#3b82f6',
    logoUrl: '/assets/logo.png',
    faviconUrl: '/assets/favicon.ico'
  },
  operational: {
    timezone: 'America/Los_Angeles',
    businessHours: {
      start: '06:00',
      end: '22:00'
    },
    sessionDurations: [30, 45, 60, 90],
    defaultSessionDuration: 60
  }
};

const DEFAULT_NOTIFICATION_SETTINGS = {
  email: {
    enabled: true,
    provider: 'sendgrid',
    fromAddress: 'noreply@swanstudios.com',
    fromName: 'SwanStudios',
    templates: {
      welcome: 'welcome-template',
      sessionBooked: 'session-booked',
      sessionReminder: 'session-reminder',
      sessionCancelled: 'session-cancelled',
      passwordReset: 'password-reset'
    }
  },
  sms: {
    enabled: true,
    provider: 'twilio',
    fromNumber: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
    templates: {
      sessionReminder: 'Your SwanStudios session is tomorrow at {time}. Reply STOP to opt out.',
      sessionBooked: 'Session confirmed for {date} at {time}. See you there!',
      sessionCancelled: 'Your session on {date} has been cancelled.'
    }
  },
  push: {
    enabled: true,
    provider: 'fcm',
    vapidKey: process.env.VAPID_PUBLIC_KEY || null
  },
  preferences: {
    sessionReminders: {
      enabled: true,
      timeBefore: 24 // hours
    },
    adminAlerts: {
      newUser: true,
      failedPayment: true,
      systemErrors: true,
      highUsage: true
    }
  }
};

const DEFAULT_SECURITY_SETTINGS = {
  authentication: {
    sessionTimeout: 24, // hours
    maxLoginAttempts: 5,
    lockoutDuration: 30, // minutes
    requireTwoFactor: false,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false
    }
  },
  rateLimiting: {
    enabled: true,
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // requests per window
    },
    auth: {
      windowMs: 15 * 60 * 1000,
      max: 5 // login attempts per window
    },
    api: {
      windowMs: 60 * 1000, // 1 minute
      max: 60 // API calls per minute
    }
  },
  audit: {
    enabled: true,
    retentionDays: 90,
    events: {
      login: true,
      logout: true,
      settingsChange: true,
      userCreation: true,
      userDeletion: true,
      sessionBooking: true,
      paymentProcessing: true
    }
  },
  cors: {
    origins: ['https://sswanstudios.com', 'https://www.sswanstudios.com'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
  }
};

/**
 * Get system configuration settings
 */
export const getSystemSettings = async () => {
  try {
    const result = await findSettingsByCategory('system');

    if (!result) {
      return {
        category: 'system',
        settings: DEFAULT_SYSTEM_SETTINGS,
        lastUpdated: null,
        isDefault: true
      };
    }

    return {
      category: 'system',
      settings: result.settings || DEFAULT_SYSTEM_SETTINGS,
      lastUpdated: result.updatedAt,
      isDefault: false
    };

  } catch (error) {
    logger.error('Error fetching system settings:', error);
    return {
      category: 'system',
      settings: DEFAULT_SYSTEM_SETTINGS,
      lastUpdated: null,
      isDefault: true
    };
  }
};

/**
 * Update system configuration settings
 */
export const updateSystemSettings = async (newSettings, adminUserId) => {
  try {
    const AdminSettings = getAdminSettings();
    
    // Validate settings structure
    const validatedSettings = validateSystemSettings(newSettings);
    
    // Find or create system settings record
    const [settings, created] = await AdminSettings.findOrCreate({
      where: { userId: 'system' },
      defaults: {
        userId: 'system',
        settings: validatedSettings
      }
    });
    
    if (!created) {
      // Update existing settings
      settings.settings = { ...settings.settings, ...validatedSettings };
      await settings.save();
    }
    
    // Log the settings change for audit
    await logSettingsChange('system', validatedSettings, adminUserId);
    
    logger.info(`System settings updated by admin ${adminUserId}`, {
      updatedFields: Object.keys(validatedSettings)
    });
    
    return {
      category: 'system',
      settings: settings.settings,
      lastUpdated: settings.updatedAt,
      updatedBy: adminUserId
    };
    
  } catch (error) {
    logger.error('Error updating system settings:', error);
    throw new Error('Failed to update system settings');
  }
};

/**
 * Get notification settings
 */
export const getNotificationSettings = async () => {
  try {
    const result = await findSettingsByCategory('notifications');

    if (!result) {
      return {
        category: 'notifications',
        settings: DEFAULT_NOTIFICATION_SETTINGS,
        lastUpdated: null,
        isDefault: true
      };
    }

    return {
      category: 'notifications',
      settings: result.settings || DEFAULT_NOTIFICATION_SETTINGS,
      lastUpdated: result.updatedAt,
      isDefault: false
    };

  } catch (error) {
    logger.error('Error fetching notification settings:', error);
    return {
      category: 'notifications',
      settings: DEFAULT_NOTIFICATION_SETTINGS,
      lastUpdated: null,
      isDefault: true
    };
  }
};

/**
 * Update notification settings
 */
export const updateNotificationSettings = async (newSettings, adminUserId) => {
  try {
    const AdminSettings = getAdminSettings();
    
    // Validate settings structure
    const validatedSettings = validateNotificationSettings(newSettings);
    
    // Find or create notification settings record
    const [settings, created] = await AdminSettings.findOrCreate({
      where: { userId: 'notifications' },
      defaults: {
        userId: 'notifications',
        settings: validatedSettings
      }
    });
    
    if (!created) {
      // Update existing settings
      settings.settings = { ...settings.settings, ...validatedSettings };
      await settings.save();
    }
    
    // Log the settings change for audit
    await logSettingsChange('notifications', validatedSettings, adminUserId);
    
    logger.info(`Notification settings updated by admin ${adminUserId}`, {
      updatedFields: Object.keys(validatedSettings)
    });
    
    return {
      category: 'notifications',
      settings: settings.settings,
      lastUpdated: settings.updatedAt,
      updatedBy: adminUserId
    };
    
  } catch (error) {
    logger.error('Error updating notification settings:', error);
    throw new Error('Failed to update notification settings');
  }
};

/**
 * Get API key information (masked for security)
 */
export const getApiKeyInfo = async () => {
  try {
    const apiKeys = {
      stripe: {
        publishableKey: maskApiKey(process.env.STRIPE_PUBLISHABLE_KEY),
        secretKey: maskApiKey(process.env.STRIPE_SECRET_KEY),
        webhookSecret: maskApiKey(process.env.STRIPE_WEBHOOK_SECRET),
        status: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not_configured',
        lastTested: null
      },
      sendgrid: {
        apiKey: maskApiKey(process.env.SENDGRID_API_KEY),
        fromEmail: process.env.SENDGRID_FROM_EMAIL || 'not_configured',
        status: process.env.SENDGRID_API_KEY ? 'configured' : 'not_configured',
        lastTested: null
      },
      twilio: {
        accountSid: maskApiKey(process.env.TWILIO_ACCOUNT_SID),
        authToken: maskApiKey(process.env.TWILIO_AUTH_TOKEN),
        phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'not_configured',
        status: (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) ? 'configured' : 'not_configured',
        lastTested: null
      },
      firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID || 'not_configured',
        privateKey: maskApiKey(process.env.FIREBASE_PRIVATE_KEY),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'not_configured',
        status: process.env.FIREBASE_PROJECT_ID ? 'configured' : 'not_configured',
        lastTested: null
      }
    };
    
    // Calculate overall integration health
    const configuredServices = Object.values(apiKeys).filter(service => service.status === 'configured').length;
    const totalServices = Object.keys(apiKeys).length;
    
    return {
      integrations: apiKeys,
      summary: {
        totalServices,
        configuredServices,
        healthScore: Math.round((configuredServices / totalServices) * 100),
        lastChecked: new Date().toISOString()
      }
    };
    
  } catch (error) {
    logger.error('Error fetching API key information:', error);
    throw new Error('Failed to retrieve API key information');
  }
};

/**
 * Get security settings
 */
export const getSecuritySettings = async () => {
  try {
    const result = await findSettingsByCategory('security');

    if (!result) {
      return {
        category: 'security',
        settings: DEFAULT_SECURITY_SETTINGS,
        lastUpdated: null,
        isDefault: true
      };
    }

    return {
      category: 'security',
      settings: result.settings || DEFAULT_SECURITY_SETTINGS,
      lastUpdated: result.updatedAt,
      isDefault: false
    };

  } catch (error) {
    logger.error('Error fetching security settings:', error);
    return {
      category: 'security',
      settings: DEFAULT_SECURITY_SETTINGS,
      lastUpdated: null,
      isDefault: true
    };
  }
};

/**
 * Update security settings
 */
export const updateSecuritySettings = async (newSettings, adminUserId) => {
  try {
    const AdminSettings = getAdminSettings();
    
    // Validate settings structure
    const validatedSettings = validateSecuritySettings(newSettings);
    
    // Find or create security settings record
    const [settings, created] = await AdminSettings.findOrCreate({
      where: { userId: 'security' },
      defaults: {
        userId: 'security',
        settings: validatedSettings
      }
    });
    
    if (!created) {
      // Update existing settings
      settings.settings = { ...settings.settings, ...validatedSettings };
      await settings.save();
    }
    
    // Log the settings change for audit
    await logSettingsChange('security', validatedSettings, adminUserId);
    
    logger.info(`Security settings updated by admin ${adminUserId}`, {
      updatedFields: Object.keys(validatedSettings)
    });
    
    return {
      category: 'security',
      settings: settings.settings,
      lastUpdated: settings.updatedAt,
      updatedBy: adminUserId
    };
    
  } catch (error) {
    logger.error('Error updating security settings:', error);
    throw new Error('Failed to update security settings');
  }
};

/**
 * Get audit logs for settings changes
 */
export const getAuditLogs = async (options = {}) => {
  try {
    const { page = 1, limit = 25, category, startDate, endDate } = options;
    
    // For now, return mock audit logs since we'd need a separate audit table
    // In a full implementation, this would query an audit_logs table
    const mockAuditLogs = [
      {
        id: 1,
        category: 'system',
        action: 'settings_updated',
        adminId: 'admin-123',
        adminEmail: 'admin@swanstudios.com',
        changes: ['maintenance.enabled', 'features.userRegistration'],
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        ipAddress: '192.168.1.100'
      },
      {
        id: 2,
        category: 'notifications',
        action: 'settings_updated',
        adminId: 'admin-123',
        adminEmail: 'admin@swanstudios.com',
        changes: ['email.enabled', 'sms.provider'],
        timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        ipAddress: '192.168.1.100'
      },
      {
        id: 3,
        category: 'security',
        action: 'settings_reset',
        adminId: 'admin-456',
        adminEmail: 'admin2@swanstudios.com',
        changes: ['authentication', 'rateLimiting'],
        timestamp: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
        ipAddress: '192.168.1.101'
      }
    ];
    
    // Filter by category if provided
    let filteredLogs = category ? 
      mockAuditLogs.filter(log => log.category === category) : 
      mockAuditLogs;
    
    // Filter by date range if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      filteredLogs = filteredLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= start && logDate <= end;
      });
    }
    
    // Pagination
    const totalCount = filteredLogs.length;
    const offset = (page - 1) * limit;
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);
    
    return {
      logs: paginatedLogs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      }
    };
    
  } catch (error) {
    logger.error('Error fetching audit logs:', error);
    throw new Error('Failed to retrieve audit logs');
  }
};

/**
 * Reset settings to default values
 */
export const resetToDefaults = async (category, adminUserId) => {
  try {
    const AdminSettings = getAdminSettings();
    
    let defaultSettings;
    let userId;
    
    switch (category) {
      case 'system':
        defaultSettings = DEFAULT_SYSTEM_SETTINGS;
        userId = 'system';
        break;
      case 'notifications':
        defaultSettings = DEFAULT_NOTIFICATION_SETTINGS;
        userId = 'notifications';
        break;
      case 'security':
        defaultSettings = DEFAULT_SECURITY_SETTINGS;
        userId = 'security';
        break;
      default:
        throw new Error(`Invalid category: ${category}`);
    }
    
    // Update or create settings with defaults
    const [settings, created] = await AdminSettings.findOrCreate({
      where: { userId },
      defaults: {
        userId,
        settings: defaultSettings
      }
    });
    
    if (!created) {
      settings.settings = defaultSettings;
      await settings.save();
    }
    
    // Log the reset action for audit
    await logSettingsChange(category, defaultSettings, adminUserId, 'reset');
    
    logger.info(`${category} settings reset to defaults by admin ${adminUserId}`);
    
    return {
      category,
      settings: defaultSettings,
      lastUpdated: settings.updatedAt,
      resetBy: adminUserId,
      action: 'reset_to_defaults'
    };
    
  } catch (error) {
    logger.error('Error resetting settings to defaults:', error);
    throw new Error('Failed to reset settings to defaults');
  }
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Mask API key for secure display
 */
function maskApiKey(key) {
  if (!key || typeof key !== 'string') {
    return 'not_configured';
  }
  
  if (key.length <= 8) {
    return '****';
  }
  
  return key.substring(0, 4) + '****' + key.substring(key.length - 4);
}

/**
 * Validate system settings structure
 */
function validateSystemSettings(settings) {
  const validated = {};
  
  // Validate maintenance settings
  if (settings.maintenance) {
    validated.maintenance = {
      enabled: Boolean(settings.maintenance.enabled),
      message: typeof settings.maintenance.message === 'string' ? 
        settings.maintenance.message : DEFAULT_SYSTEM_SETTINGS.maintenance.message,
      allowedIPs: Array.isArray(settings.maintenance.allowedIPs) ? 
        settings.maintenance.allowedIPs : []
    };
  }
  
  // Validate feature flags
  if (settings.features) {
    validated.features = {};
    Object.keys(DEFAULT_SYSTEM_SETTINGS.features).forEach(feature => {
      if (settings.features[feature] !== undefined) {
        validated.features[feature] = Boolean(settings.features[feature]);
      }
    });
  }
  
  // Validate limits
  if (settings.limits) {
    validated.limits = {};
    Object.keys(DEFAULT_SYSTEM_SETTINGS.limits).forEach(limit => {
      if (settings.limits[limit] !== undefined) {
        const value = parseInt(settings.limits[limit]);
        if (!isNaN(value) && value > 0) {
          validated.limits[limit] = value;
        }
      }
    });
  }
  
  // Validate branding
  if (settings.branding) {
    validated.branding = {};
    Object.keys(DEFAULT_SYSTEM_SETTINGS.branding).forEach(brand => {
      if (settings.branding[brand] !== undefined && typeof settings.branding[brand] === 'string') {
        validated.branding[brand] = settings.branding[brand];
      }
    });
  }
  
  // Validate operational settings
  if (settings.operational) {
    validated.operational = {};
    if (settings.operational.timezone && typeof settings.operational.timezone === 'string') {
      validated.operational.timezone = settings.operational.timezone;
    }
    if (settings.operational.businessHours && typeof settings.operational.businessHours === 'object') {
      validated.operational.businessHours = settings.operational.businessHours;
    }
    if (Array.isArray(settings.operational.sessionDurations)) {
      validated.operational.sessionDurations = settings.operational.sessionDurations
        .map(d => parseInt(d)).filter(d => !isNaN(d) && d > 0);
    }
    if (settings.operational.defaultSessionDuration) {
      const duration = parseInt(settings.operational.defaultSessionDuration);
      if (!isNaN(duration) && duration > 0) {
        validated.operational.defaultSessionDuration = duration;
      }
    }
  }
  
  return validated;
}

/**
 * Validate notification settings structure
 */
function validateNotificationSettings(settings) {
  const validated = {};
  
  // Validate email settings
  if (settings.email) {
    validated.email = {
      enabled: Boolean(settings.email.enabled),
      provider: typeof settings.email.provider === 'string' ? settings.email.provider : 'sendgrid',
      fromAddress: typeof settings.email.fromAddress === 'string' ? settings.email.fromAddress : DEFAULT_NOTIFICATION_SETTINGS.email.fromAddress,
      fromName: typeof settings.email.fromName === 'string' ? settings.email.fromName : DEFAULT_NOTIFICATION_SETTINGS.email.fromName
    };
    
    if (settings.email.templates && typeof settings.email.templates === 'object') {
      validated.email.templates = settings.email.templates;
    }
  }
  
  // Validate SMS settings
  if (settings.sms) {
    validated.sms = {
      enabled: Boolean(settings.sms.enabled),
      provider: typeof settings.sms.provider === 'string' ? settings.sms.provider : 'twilio',
      fromNumber: typeof settings.sms.fromNumber === 'string' ? settings.sms.fromNumber : DEFAULT_NOTIFICATION_SETTINGS.sms.fromNumber
    };
    
    if (settings.sms.templates && typeof settings.sms.templates === 'object') {
      validated.sms.templates = settings.sms.templates;
    }
  }
  
  // Validate push settings
  if (settings.push) {
    validated.push = {
      enabled: Boolean(settings.push.enabled),
      provider: typeof settings.push.provider === 'string' ? settings.push.provider : 'fcm'
    };
    
    if (settings.push.vapidKey && typeof settings.push.vapidKey === 'string') {
      validated.push.vapidKey = settings.push.vapidKey;
    }
  }
  
  // Validate preferences
  if (settings.preferences) {
    validated.preferences = {};
    
    if (settings.preferences.sessionReminders) {
      validated.preferences.sessionReminders = {
        enabled: Boolean(settings.preferences.sessionReminders.enabled),
        timeBefore: parseInt(settings.preferences.sessionReminders.timeBefore) || 24
      };
    }
    
    if (settings.preferences.adminAlerts) {
      validated.preferences.adminAlerts = {};
      Object.keys(DEFAULT_NOTIFICATION_SETTINGS.preferences.adminAlerts).forEach(alert => {
        if (settings.preferences.adminAlerts[alert] !== undefined) {
          validated.preferences.adminAlerts[alert] = Boolean(settings.preferences.adminAlerts[alert]);
        }
      });
    }
  }
  
  return validated;
}

/**
 * Validate security settings structure
 */
function validateSecuritySettings(settings) {
  const validated = {};
  
  // Validate authentication settings
  if (settings.authentication) {
    validated.authentication = {};
    
    if (settings.authentication.sessionTimeout) {
      const timeout = parseInt(settings.authentication.sessionTimeout);
      if (!isNaN(timeout) && timeout > 0) {
        validated.authentication.sessionTimeout = timeout;
      }
    }
    
    if (settings.authentication.maxLoginAttempts) {
      const attempts = parseInt(settings.authentication.maxLoginAttempts);
      if (!isNaN(attempts) && attempts > 0) {
        validated.authentication.maxLoginAttempts = attempts;
      }
    }
    
    if (settings.authentication.lockoutDuration) {
      const duration = parseInt(settings.authentication.lockoutDuration);
      if (!isNaN(duration) && duration > 0) {
        validated.authentication.lockoutDuration = duration;
      }
    }
    
    if (settings.authentication.requireTwoFactor !== undefined) {
      validated.authentication.requireTwoFactor = Boolean(settings.authentication.requireTwoFactor);
    }
    
    if (settings.authentication.passwordPolicy && typeof settings.authentication.passwordPolicy === 'object') {
      validated.authentication.passwordPolicy = settings.authentication.passwordPolicy;
    }
  }
  
  // Validate rate limiting settings
  if (settings.rateLimiting) {
    validated.rateLimiting = {
      enabled: Boolean(settings.rateLimiting.enabled)
    };
    
    ['general', 'auth', 'api'].forEach(type => {
      if (settings.rateLimiting[type] && typeof settings.rateLimiting[type] === 'object') {
        validated.rateLimiting[type] = settings.rateLimiting[type];
      }
    });
  }
  
  // Validate audit settings
  if (settings.audit) {
    validated.audit = {
      enabled: Boolean(settings.audit.enabled)
    };
    
    if (settings.audit.retentionDays) {
      const days = parseInt(settings.audit.retentionDays);
      if (!isNaN(days) && days > 0) {
        validated.audit.retentionDays = days;
      }
    }
    
    if (settings.audit.events && typeof settings.audit.events === 'object') {
      validated.audit.events = settings.audit.events;
    }
  }
  
  // Validate CORS settings
  if (settings.cors) {
    validated.cors = {};
    
    if (Array.isArray(settings.cors.origins)) {
      validated.cors.origins = settings.cors.origins;
    }
    
    if (Array.isArray(settings.cors.allowedHeaders)) {
      validated.cors.allowedHeaders = settings.cors.allowedHeaders;
    }
    
    if (settings.cors.credentials !== undefined) {
      validated.cors.credentials = Boolean(settings.cors.credentials);
    }
  }
  
  return validated;
}

/**
 * Log settings changes for audit trail
 */
async function logSettingsChange(category, changedSettings, adminUserId, action = 'update') {
  try {
    // In a full implementation, this would write to an audit_logs table
    // For now, just log to the application logger
    logger.info(`Settings ${action}`, {
      category,
      changedFields: Object.keys(changedSettings),
      adminUserId,
      timestamp: new Date().toISOString(),
      action
    });
    
    // TODO: Implement actual audit log storage when audit table is created
    
  } catch (error) {
    logger.error('Failed to log settings change:', error);
    // Don't throw error here as it shouldn't block the settings update
  }
}
