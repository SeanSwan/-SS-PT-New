/**
 * Accessibility Routes
 * API endpoints for accessibility testing and compliance
 */

import express from 'express';
import { accessibilityTesting } from '../../services/accessibility/AccessibilityTesting.mjs';
import { accessibilityAwareAuth } from '../../utils/monitoring/accessibilityAuth.mjs';
import { requirePermissionWithAccessibility } from '../../middleware/p0Monitoring.mjs';
import { piiSafeLogger } from '../../utils/monitoring/piiSafeLogging.mjs';

const router = express.Router();

/**
 * @route   POST /api/master-prompt/accessibility/test-feature
 * @desc    Run accessibility test for specific feature
 * @access  Private
 */
router.post('/test-feature', async (req, res) => {
  try {
    const { featureName, options = {} } = req.body;
    
    if (!featureName) {
      return res.status(400).json({
        success: false,
        message: 'Feature name is required'
      });
    }
    
    const testResult = await accessibilityTesting.runAccessibilityTest(
      featureName,
      { ...options, userId: req.user?.id }
    );
    
    // Track accessibility test
    piiSafeLogger.trackAccessibilityUsage('feature_tested', req.user?.id, {
      feature: featureName,
      score: testResult.score,
      status: testResult.status
    });
    
    res.json({
      success: true,
      data: testResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    piiSafeLogger.error('Accessibility test failed', {
      error: error.message,
      feature: req.body.featureName
    });
    
    res.status(500).json({
      success: false,
      message: 'Accessibility test failed',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/master-prompt/accessibility/report
 * @desc    Generate comprehensive accessibility report
 * @access  Private
 */
router.get('/report', async (req, res) => {
  try {
    const { feature } = req.query;
    
    const report = await accessibilityTesting.generateAccessibilityReport(feature || null);
    
    // Track report generation
    piiSafeLogger.trackAccessibilityUsage('report_generated', req.user?.id, {
      feature: feature || 'all',
      overallStatus: report.overallStatus,
      averageScore: report.summary.averageScore
    });
    
    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    piiSafeLogger.error('Accessibility report generation failed', {
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate accessibility report',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/master-prompt/accessibility/validate-compliance
 * @desc    Validate accessibility compliance for CI/CD
 * @access  Private (Admin)
 */
router.post('/validate-compliance',
  requirePermissionWithAccessibility('system_monitoring'),
  async (req, res) => {
    try {
      const { featureName, options = {} } = req.body;
      
      if (!featureName) {
        return res.status(400).json({
          success: false,
          message: 'Feature name is required for compliance validation'
        });
      }
      
      const compliance = await accessibilityTesting.validateAccessibilityCompliance(
        featureName,
        { ...options, userId: req.user.id }
      );
      
      res.json({
        success: true,
        data: compliance,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      piiSafeLogger.error('Accessibility compliance validation failed', {
        error: error.message,
        feature: req.body.featureName
      });
      
      res.status(500).json({
        success: false,
        message: 'Compliance validation failed',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/master-prompt/accessibility/test-config
 * @desc    Get accessibility testing configuration
 * @access  Private
 */
router.get('/test-config', async (req, res) => {
  try {
    const config = {
      cypressConfig: accessibilityTesting.generateCypressA11yConfig(),
      wcagLevel: 'AA',
      rules: Object.keys(accessibilityTesting.accessibilityRules),
      features: Object.keys(accessibilityTesting.aiFeatureRequirements),
      complianceMatrix: accessibilityTesting.generateComplianceMatrix()
    };
    
    res.json({
      success: true,
      data: config,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    piiSafeLogger.error('Failed to get accessibility test config', {
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve accessibility configuration',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/master-prompt/accessibility/save-config
 * @desc    Save accessibility test configuration files
 * @access  Private (Admin)
 */
router.post('/save-config',
  requirePermissionWithAccessibility('system_monitoring'),
  async (req, res) => {
    try {
      const { outputDir = './accessibility-tests' } = req.body;
      
      const result = await accessibilityTesting.saveTestConfiguration(outputDir);
      
      piiSafeLogger.trackUserAction('accessibility_config_saved', req.user.id, {
        outputDir,
        filesGenerated: result.testFiles.length
      });
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      piiSafeLogger.error('Failed to save accessibility config', {
        error: error.message,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to save accessibility configuration',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/master-prompt/accessibility/user-permissions
 * @desc    Get user permissions with accessibility context
 * @access  Private
 */
router.get('/user-permissions', async (req, res) => {
  try {
    const userRole = req.user?.role || 'user';
    const permissions = accessibilityAwareAuth.getUserPermissions(userRole);
    const navigation = accessibilityAwareAuth.generateAccessibleNavigation(
      userRole,
      req.user?.accessibilityPreferences || {}
    );
    
    res.json({
      success: true,
      data: {
        role: userRole,
        permissions,
        navigation,
        accessibilitySupport: true
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    piiSafeLogger.error('Failed to get user permissions', {
      error: error.message,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user permissions',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/master-prompt/accessibility/check-permission
 * @desc    Check specific permission with accessibility context
 * @access  Private
 */
router.post('/check-permission', async (req, res) => {
  try {
    const { feature } = req.body;
    
    if (!feature) {
      return res.status(400).json({
        success: false,
        message: 'Feature parameter is required'
      });
    }
    
    const userRole = req.user?.role || 'user';
    const hasPermission = accessibilityAwareAuth.checkPermission(
      feature,
      userRole,
      { userId: req.user?.id, accessibility: req.user?.accessibilityPreferences }
    );
    
    if (!hasPermission) {
      const error = accessibilityAwareAuth.generateAccessibilityError(
        feature,
        {
          userId: req.user?.id,
          userRole,
          preferredLanguage: req.user?.preferredLanguage,
          accessibilityPreferences: req.user?.accessibilityPreferences
        }
      );
      
      return res.status(403).json({
        success: false,
        message: 'Permission denied',
        data: error
      });
    }
    
    res.json({
      success: true,
      data: {
        hasPermission: true,
        feature,
        role: userRole
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    piiSafeLogger.error('Permission check failed', {
      error: error.message,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Permission check failed',
      error: error.message
    });
  }
});

export default router;
