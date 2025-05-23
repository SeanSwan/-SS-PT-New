/**
 * Gamification Routes
 * API endpoints for ethical gamification and engagement systems
 * Addictive Gamification Strategy Implementation
 */

import express from 'express';
import { gamificationEngine } from '../../services/gamification/GamificationEngine.mjs';
import { ethicalGamification } from '../../services/gamification/EthicalGamification.mjs';
import { requirePermissionWithAccessibility } from '../../middleware/p0Monitoring.mjs';
import { piiSafeLogger } from '../../utils/monitoring/piiSafeLogging.mjs';

const router = express.Router();

/**
 * @route   GET /api/master-prompt/gamification/status
 * @desc    Get user's gamification status and progress
 * @access  Private
 */
router.get('/status', async (req, res) => {
  try {
    const userId = req.user.id;
    const status = await gamificationEngine.getUserGamificationStatus(userId);
    
    // Track gamification access
    piiSafeLogger.trackGamificationEngagement('status_checked', userId, {
      level: status.level,
      totalPoints: status.totalPoints,
      streak: status.currentStreak
    });
    
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    piiSafeLogger.error('Failed to get gamification status', {
      error: error.message,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve gamification status',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/master-prompt/gamification/award-points
 * @desc    Award points for specific actions (internal use)
 * @access  Private (Admin/System)
 */
router.post('/award-points',
  requirePermissionWithAccessibility('system_monitoring'),
  async (req, res) => {
    try {
      const { userId, points, action, metadata = {} } = req.body;
      
      if (!userId || !points || !action) {
        return res.status(400).json({
          success: false,
          message: 'UserId, points, and action are required'
        });
      }
      
      const result = await gamificationEngine.awardPoints(userId, points, action, metadata);
      
      // Track points award
      piiSafeLogger.trackGamificationEngagement('points_awarded', userId, {
        points,
        action,
        newTotal: result.totalPoints,
        levelUp: result.levelUp
      });
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      piiSafeLogger.error('Failed to award points', {
        error: error.message,
        userId: req.body.userId
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to award points',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/master-prompt/gamification/achievements
 * @desc    Get available and earned achievements
 * @access  Private
 */
router.get('/achievements', async (req, res) => {
  try {
    const userId = req.user.id;
    const achievements = await gamificationEngine.getUserAchievements(userId);
    
    res.json({
      success: true,
      data: achievements,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    piiSafeLogger.error('Failed to get achievements', {
      error: error.message,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve achievements',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/master-prompt/gamification/leaderboard
 * @desc    Get leaderboard (with privacy options)
 * @access  Private
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { timeframe = 'weekly', category = 'overall', limit = 10 } = req.query;
    const userId = req.user.id;
    
    const leaderboard = await gamificationEngine.getLeaderboard({
      timeframe,
      category,
      limit: Math.min(parseInt(limit), 50), // Max 50
      requestingUserId: userId
    });
    
    // Track leaderboard access
    piiSafeLogger.trackGamificationEngagement('leaderboard_viewed', userId, {
      timeframe,
      category,
      userRank: leaderboard.userRank
    });
    
    res.json({
      success: true,
      data: leaderboard,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    piiSafeLogger.error('Failed to get leaderboard', {
      error: error.message,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve leaderboard',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/master-prompt/gamification/check-ethical-compliance
 * @desc    Run ethical gamification compliance check
 * @access  Private (Admin)
 */
router.post('/check-ethical-compliance',
  requirePermissionWithAccessibility('system_monitoring'),
  async (req, res) => {
    try {
      const { userId, feature } = req.body;
      
      const compliance = await ethicalGamification.checkCompliance(userId, feature);
      
      piiSafeLogger.trackUserAction('ethical_gamification_check', req.user.id, {
        targetUserId: userId,
        feature,
        passed: compliance.passed,
        score: compliance.score
      });
      
      res.json({
        success: true,
        data: compliance,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      piiSafeLogger.error('Ethical gamification check failed', {
        error: error.message,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Ethical compliance check failed',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/master-prompt/gamification/engagement-metrics
 * @desc    Get engagement metrics for analysis
 * @access  Private (Admin/Trainer)
 */
router.get('/engagement-metrics',
  requirePermissionWithAccessibility('progress_analysis'),
  async (req, res) => {
    try {
      const { timeframe = '30d', segment } = req.query;
      
      const metrics = await gamificationEngine.getEngagementMetrics({
        timeframe,
        segment,
        requestingRole: req.user.role
      });
      
      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      piiSafeLogger.error('Failed to get engagement metrics', {
        error: error.message,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve engagement metrics',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/master-prompt/gamification/configure-rules
 * @desc    Configure gamification rules and thresholds
 * @access  Private (Admin)
 */
router.post('/configure-rules',
  requirePermissionWithAccessibility('system_monitoring'),
  async (req, res) => {
    try {
      const { rules, ethicalConstraints } = req.body;
      
      if (!rules) {
        return res.status(400).json({
          success: false,
          message: 'Rules configuration is required'
        });
      }
      
      // Validate ethical constraints
      const validation = await ethicalGamification.validateRules(rules, ethicalConstraints);
      
      if (!validation.passed) {
        return res.status(400).json({
          success: false,
          message: 'Rules failed ethical validation',
          data: validation
        });
      }
      
      const result = await gamificationEngine.updateRules(rules, ethicalConstraints);
      
      piiSafeLogger.trackUserAction('gamification_rules_updated', req.user.id, {
        rulesUpdated: Object.keys(rules).length,
        ethicalScore: validation.score
      });
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      piiSafeLogger.error('Failed to configure gamification rules', {
        error: error.message,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to configure rules',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/master-prompt/gamification/process-action
 * @desc    Process user action for gamification (automated)
 * @access  Private
 */
router.post('/process-action', async (req, res) => {
  try {
    const { action, metadata = {} } = req.body;
    const userId = req.user.id;
    
    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'Action is required'
      });
    }
    
    // Check for addiction patterns before processing
    const ethicalCheck = await ethicalGamification.checkActionEthics(userId, action, metadata);
    
    if (!ethicalCheck.approved) {
      return res.status(429).json({
        success: false,
        message: 'Action temporarily restricted',
        data: {
          reason: ethicalCheck.reason,
          cooldownMinutes: ethicalCheck.cooldownMinutes,
          supportMessage: ethicalCheck.supportMessage
        }
      });
    }
    
    const result = await gamificationEngine.processUserAction(userId, action, metadata);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    piiSafeLogger.error('Failed to process gamification action', {
      error: error.message,
      userId: req.user?.id,
      action: req.body.action
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to process action',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/master-prompt/gamification/health-check
 * @desc    Check gamification system health and ethical compliance
 * @access  Private (Admin)
 */
router.get('/health-check',
  requirePermissionWithAccessibility('system_monitoring'),
  async (req, res) => {
    try {
      const healthStatus = {
        systemHealth: await gamificationEngine.getSystemHealth(),
        ethicalCompliance: await ethicalGamification.getComplianceStatus(),
        activeEngagement: await gamificationEngine.getActiveEngagementStats(),
        lastUpdated: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: healthStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      piiSafeLogger.error('Gamification health check failed', {
        error: error.message,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Health check failed',
        error: error.message
      });
    }
  }
);

export default router;