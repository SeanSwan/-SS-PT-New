/**
 * Ethical AI Routes
 * API endpoints for ethical AI review and bias detection
 */

import express from 'express';
import { ethicalAIReview } from '../../services/ai/EthicalAIReview.mjs';
import { ethicalAIPipeline } from '../../services/ai/pipeline/EthicalAIPipeline.mjs';
import { requirePermissionWithAccessibility } from '../../middleware/p0Monitoring.mjs';
import { piiSafeLogger } from '../../utils/monitoring/piiSafeLogging.mjs';

const router = express.Router();

/**
 * @route   POST /api/master-prompt/ethical-ai/review-workout
 * @desc    Review workout generation for ethical compliance
 * @access  Private
 */
router.post('/review-workout', async (req, res) => {
  try {
    const { workoutPlan, clientProfile } = req.body;
    
    if (!workoutPlan || !clientProfile) {
      return res.status(400).json({
        success: false,
        message: 'Workout plan and client profile are required'
      });
    }
    
    const ethicalReview = await ethicalAIReview.reviewWorkoutGeneration(
      workoutPlan,
      clientProfile
    );
    
    // Track ethical review
    piiSafeLogger.trackAIGeneration('workout_generation', clientProfile.userId, {
      ethicalReview: ethicalReview,
      passed: ethicalReview.passed,
      score: ethicalReview.overallScore
    });
    
    res.json({
      success: true,
      data: ethicalReview,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    piiSafeLogger.error('Ethical AI workout review failed', {
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Ethical review failed',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/master-prompt/ethical-ai/review-nutrition
 * @desc    Review nutrition plan for ethical compliance
 * @access  Private
 */
router.post('/review-nutrition', async (req, res) => {
  try {
    const { nutritionPlan, clientProfile } = req.body;
    
    if (!nutritionPlan || !clientProfile) {
      return res.status(400).json({
        success: false,
        message: 'Nutrition plan and client profile are required'
      });
    }
    
    const ethicalReview = await ethicalAIReview.reviewNutritionGeneration(
      nutritionPlan,
      clientProfile
    );
    
    res.json({
      success: true,
      data: ethicalReview,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    piiSafeLogger.error('Ethical AI nutrition review failed', {
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Ethical review failed',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/master-prompt/ethical-ai/run-pipeline
 * @desc    Run comprehensive ethical AI pipeline
 * @access  Private (Admin)
 */
router.post('/run-pipeline',
  requirePermissionWithAccessibility('system_monitoring'),
  async (req, res) => {
    try {
      const { config = {} } = req.body;
      
      const pipelineResults = await ethicalAIPipeline.runEthicalPipeline(config);
      
      // Track pipeline execution
      piiSafeLogger.trackMCPOperation('ethical_pipeline', 'executed', {
        passed: pipelineResults.passed,
        score: pipelineResults.overallScore,
        requiresHumanReview: pipelineResults.requiresHumanReview,
        userId: req.user.id
      });
      
      res.json({
        success: true,
        data: pipelineResults,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      piiSafeLogger.error('Ethical AI pipeline failed', {
        error: error.message,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Ethical AI pipeline failed',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/master-prompt/ethical-ai/pipeline-config
 * @desc    Get ethical AI pipeline configuration options
 * @access  Private (Admin)
 */
router.get('/pipeline-config',
  requirePermissionWithAccessibility('system_monitoring'),
  async (req, res) => {
    try {
      const config = {
        stages: ethicalAIPipeline.pipelineConfig.stages,
        thresholds: ethicalAIPipeline.pipelineConfig.thresholds,
        deployment: ethicalAIPipeline.pipelineConfig.deployment,
        cicdTemplates: Object.keys(ethicalAIPipeline.cicdTemplates),
        packageJsonScripts: ethicalAIPipeline.generatePackageJsonScripts()
      };
      
      res.json({
        success: true,
        data: config,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      piiSafeLogger.error('Failed to get pipeline config', {
        error: error.message
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve pipeline configuration',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/master-prompt/ethical-ai/generate-pipeline
 * @desc    Generate CI/CD pipeline configuration for platform
 * @access  Private (Admin)
 */
router.post('/generate-pipeline',
  requirePermissionWithAccessibility('system_monitoring'),
  async (req, res) => {
    try {
      const { platform, outputPath = './generated-pipelines' } = req.body;
      
      if (!platform) {
        return res.status(400).json({
          success: false,
          message: 'Platform parameter is required'
        });
      }
      
      const result = await ethicalAIPipeline.savePipelineConfig(platform, outputPath);
      
      piiSafeLogger.trackUserAction('pipeline_generated', req.user.id, {
        platform,
        path: result.path
      });
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      piiSafeLogger.error('Pipeline generation failed', {
        error: error.message,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Pipeline generation failed',
        error: error.message
      });
    }
  }
);

export default router;
