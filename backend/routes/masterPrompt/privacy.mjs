/**
 * Privacy & PII Routes
 * API endpoints for PII-safe logging and privacy management
 * Privacy-First Implementation
 */

import express from 'express';
import { piiManager } from '../../services/privacy/PIIManager.mjs';
import { privacyCompliance } from '../../services/privacy/PrivacyCompliance.mjs';
import { dataMinimization } from '../../services/privacy/DataMinimization.mjs';
import { requirePermissionWithAccessibility } from '../../middleware/p0Monitoring.mjs';
import { piiSafeLogger } from '../../utils/monitoring/piiSafeLogging.mjs';

const router = express.Router();

/**
 * @route   GET /api/master-prompt/privacy/status
 * @desc    Get privacy and PII protection status
 * @access  Private
 */
router.get('/status', async (req, res) => {
  try {
    const userId = req.user.id;
    const status = await privacyCompliance.getPrivacyStatus(userId);
    
    // Log privacy status check (PII-safe)
    piiSafeLogger.trackPrivacyAccess('status_checked', userId, {
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    piiSafeLogger.error('Failed to get privacy status', {
      error: error.message
      // Note: Not logging userId here for extra privacy
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve privacy status',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/master-prompt/privacy/scan-pii
 * @desc    Scan content for PII and get sanitization recommendations
 * @access  Private (Admin)
 */
router.post('/scan-pii',
  requirePermissionWithAccessibility('system_monitoring'),
  async (req, res) => {
    try {
      const { content, context = 'general' } = req.body;
      
      if (!content) {
        return res.status(400).json({
          success: false,
          message: 'Content is required for PII scanning'
        });
      }
      
      const scanResult = await piiManager.scanForPII(content, context);
      
      // Track PII scan (without logging actual content)
      piiSafeLogger.trackPrivacyOperation('pii_scan', req.user.id, {
        context,
        piiFound: scanResult.piiDetected,
        risksCount: scanResult.risks.length,
        confidence: scanResult.confidence
      });
      
      res.json({
        success: true,
        data: scanResult,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      piiSafeLogger.error('PII scan failed', {
        error: error.message,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'PII scan failed',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/master-prompt/privacy/sanitize
 * @desc    Sanitize content by removing/masking PII
 * @access  Private (Admin/System)
 */
router.post('/sanitize',
  requirePermissionWithAccessibility('system_monitoring'),
  async (req, res) => {
    try {
      const { content, method = 'mask', preserveFormat = true } = req.body;
      
      if (!content) {
        return res.status(400).json({
          success: false,
          message: 'Content is required for sanitization'
        });
      }
      
      const sanitized = await piiManager.sanitizeContent(content, {
        method,
        preserveFormat
      });
      
      // Track sanitization (without logging original content)
      piiSafeLogger.trackPrivacyOperation('content_sanitized', req.user.id, {
        method,
        itemsProcessed: sanitized.itemsProcessed,
        piiRemoved: sanitized.piiRemoved
      });
      
      res.json({
        success: true,
        data: sanitized,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      piiSafeLogger.error('Content sanitization failed', {
        error: error.message,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Content sanitization failed',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/master-prompt/privacy/user-data/:userId
 * @desc    Get user's data inventory for privacy compliance
 * @access  Private (Admin/User Self)
 */
router.get('/user-data/:userId',
  requirePermissionWithAccessibility('personal_data_access'),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user.id;
      
      // Check if user can access this data
      const canAccess = userId === requestingUserId || req.user.role === 'admin';
      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only access your own data'
        });
      }
      
      const dataInventory = await privacyCompliance.getUserDataInventory(userId);
      
      // Track data access (PII-safe)
      piiSafeLogger.trackPrivacyAccess('data_inventory_accessed', requestingUserId, {
        targetUserId: userId,
        selfAccess: userId === requestingUserId
      });
      
      res.json({
        success: true,
        data: dataInventory,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      piiSafeLogger.error('Failed to get user data inventory', {
        error: error.message,
        requestingUserId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user data inventory',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/master-prompt/privacy/export-data
 * @desc    Export user data for GDPR compliance
 * @access  Private (User Self)
 */
router.post('/export-data', async (req, res) => {
  try {
    const userId = req.user.id;
    const { format = 'json', includeMetadata = true } = req.body;
    
    const exportResult = await privacyCompliance.exportUserData(userId, {
      format,
      includeMetadata
    });
    
    // Track data export
    piiSafeLogger.trackPrivacyOperation('data_exported', userId, {
      format,
      includeMetadata,
      dataSize: exportResult.size,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      data: exportResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    piiSafeLogger.error('Data export failed', {
      error: error.message,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Data export failed',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/master-prompt/privacy/delete-user-data
 * @desc    Delete user data (Right to be forgotten)
 * @access  Private (User Self/Admin)
 */
router.delete('/delete-user-data',
  requirePermissionWithAccessibility('personal_data_access'),
  async (req, res) => {
    try {
      const { userId, confirmToken, retentionOverride = false } = req.body;
      const requestingUserId = req.user.id;
      
      // Validate deletion request
      const validation = await privacyCompliance.validateDeletionRequest(
        userId || requestingUserId,
        requestingUserId,
        confirmToken
      );
      
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.reason,
          data: validation
        });
      }
      
      const deletionResult = await privacyCompliance.deleteUserData(
        userId || requestingUserId,
        {
          requestingUserId,
          retentionOverride,
          confirmToken
        }
      );
      
      // Track deletion (minimal logging)
      piiSafeLogger.trackPrivacyOperation('data_deleted', requestingUserId, {
        selfDeletion: !userId || userId === requestingUserId,
        retentionOverride,
        itemsDeleted: deletionResult.itemsDeleted
      });
      
      res.json({
        success: true,
        data: deletionResult,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      piiSafeLogger.error('Data deletion failed', {
        error: error.message,
        requestingUserId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Data deletion failed',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/master-prompt/privacy/consent-status
 * @desc    Get user's consent status for various data processing
 * @access  Private
 */
router.get('/consent-status', async (req, res) => {
  try {
    const userId = req.user.id;
    const consentStatus = await privacyCompliance.getConsentStatus(userId);
    
    res.json({
      success: true,
      data: consentStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    piiSafeLogger.error('Failed to get consent status', {
      error: error.message,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve consent status',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/master-prompt/privacy/update-consent
 * @desc    Update user's consent preferences
 * @access  Private
 */
router.post('/update-consent', async (req, res) => {
  try {
    const userId = req.user.id;
    const { consents } = req.body;
    
    if (!consents || typeof consents !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Valid consent object is required'
      });
    }
    
    const result = await privacyCompliance.updateConsent(userId, consents);
    
    // Track consent changes
    piiSafeLogger.trackPrivacyOperation('consent_updated', userId, {
      consentTypes: Object.keys(consents),
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    piiSafeLogger.error('Consent update failed', {
      error: error.message,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Consent update failed',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/master-prompt/privacy/audit-log
 * @desc    Get privacy-related audit log for user or system
 * @access  Private (Admin/User Self)
 */
router.get('/audit-log',
  requirePermissionWithAccessibility('privacy_audit'),
  async (req, res) => {
    try {
      const { timeframe = '30d', userId, action } = req.query;
      const requestingUserId = req.user.id;
      
      // Users can only see their own audit logs unless they're admin
      const targetUserId = req.user.role === 'admin' ? userId : requestingUserId;
      
      const auditLog = await privacyCompliance.getAuditLog({
        userId: targetUserId,
        timeframe,
        action,
        requestingUserId
      });
      
      res.json({
        success: true,
        data: auditLog,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      piiSafeLogger.error('Failed to get privacy audit log', {
        error: error.message,
        requestingUserId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve audit log',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/master-prompt/privacy/compliance-report
 * @desc    Generate privacy compliance report
 * @access  Private (Admin)
 */
router.get('/compliance-report',
  requirePermissionWithAccessibility('system_monitoring'),
  async (req, res) => {
    try {
      const { timeframe = '30d', detailed = false } = req.query;
      
      const report = await privacyCompliance.generateComplianceReport({
        timeframe,
        includeDetails: detailed === 'true'
      });
      
      piiSafeLogger.trackUserAction('privacy_report_generated', req.user.id, {
        timeframe,
        detailed
      });
      
      res.json({
        success: true,
        data: report,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      piiSafeLogger.error('Privacy compliance report failed', {
        error: error.message,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to generate compliance report',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/master-prompt/privacy/data-minimization
 * @desc    Run data minimization process
 * @access  Private (Admin)
 */
router.post('/data-minimization',
  requirePermissionWithAccessibility('system_monitoring'),
  async (req, res) => {
    try {
      const { dryRun = false, categories } = req.body;
      
      const result = await dataMinimization.runMinimization({
        dryRun,
        categories,
        requestingUserId: req.user.id
      });
      
      piiSafeLogger.trackPrivacyOperation('data_minimization', req.user.id, {
        dryRun,
        categories: categories || 'all',
        itemsProcessed: result.itemsProcessed,
        itemsDeleted: result.itemsDeleted
      });
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      piiSafeLogger.error('Data minimization failed', {
        error: error.message,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Data minimization failed',
        error: error.message
      });
    }
  }
);

export default router;