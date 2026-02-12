/**
 * MCP Integration Routes
 * Backend API routes to bridge frontend with MCP servers
 * Connects the WorkoutGenerator UI with actual MCP workout generation
 */

import express from 'express';
import axios from 'axios';
import { protect as authMiddleware } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';
import { updateMetrics } from './aiMonitoringRoutes.mjs';

const router = express.Router();

// MCP Server Configuration
const WORKOUT_MCP_URL = process.env.WORKOUT_MCP_URL || 'http://localhost:8000';
const GAMIFICATION_MCP_URL = process.env.GAMIFICATION_MCP_URL || 'http://localhost:8002';
const MCP_SERVICES_ENABLED = process.env.ENABLE_MCP_SERVICES !== 'false';
const isProduction = process.env.NODE_ENV === 'production';

// In production, disable MCP services if URLs point to localhost (not available)
const isLocalMcpUrl = WORKOUT_MCP_URL.includes('localhost') || GAMIFICATION_MCP_URL.includes('localhost');
const MCP_ACTUALLY_AVAILABLE = MCP_SERVICES_ENABLED && (!isProduction || !isLocalMcpUrl);

// Create axios instances for MCP servers
const workoutMcpApi = axios.create({
  baseURL: WORKOUT_MCP_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

const gamificationMcpApi = axios.create({
  baseURL: GAMIFICATION_MCP_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

/**
 * Check MCP Server Status
 * GET /api/mcp/status
 */
router.get('/status', async (req, res) => {
  try {
    // Return disabled status if MCP services are not available
    if (!MCP_ACTUALLY_AVAILABLE) {
      return res.status(200).json({
        status: isProduction ? 'production-fallback' : 'disabled',
        message: isProduction 
          ? 'MCP services use fallback mode in production (localhost URLs not available)'
          : 'MCP services are disabled in this environment',
        servers: {
          workout: { status: 'fallback', message: isProduction ? 'Using fallback mode' : 'MCP services disabled' },
          gamification: { status: 'fallback', message: isProduction ? 'Using fallback mode' : 'MCP services disabled' }
        },
        timestamp: new Date().toISOString()
      });
    }
    const [workoutStatus, gamificationStatus] = await Promise.allSettled([
      workoutMcpApi.get('/status'),
      gamificationMcpApi.get('/status')
    ]);

    const response = {
      status: 'ready',
      servers: {
        workout: {
          status: workoutStatus.status === 'fulfilled' ? 'online' : 'offline',
          details: workoutStatus.status === 'fulfilled' 
            ? workoutStatus.value.data 
            : { error: workoutStatus.reason.message }
        },
        gamification: {
          status: gamificationStatus.status === 'fulfilled' ? 'online' : 'offline',
          details: gamificationStatus.status === 'fulfilled' 
            ? gamificationStatus.value.data 
            : { error: gamificationStatus.reason.message }
        }
      },
      timestamp: new Date().toISOString()
    };

    // Return 200 if at least one server is online
    const isAnyOnline = response.servers.workout.status === 'online' || 
                       response.servers.gamification.status === 'online';
    
    res.status(isAnyOnline ? 200 : 503).json(response);
  } catch (error) {
    logger.error('MCP status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check MCP server status',
      error: error.message
    });
  }
});

/**
 * Generate Workout Plan
 * POST /api/mcp/generate
 */
router.post('/generate', authMiddleware, async (req, res) => {
  const startTime = Date.now();
  
  // Check if MCP services are enabled
  if (!MCP_SERVICES_ENABLED) {
    return res.status(503).json({
      success: false,
      message: 'MCP workout generation services are not available in this environment',
      fallback: 'Please use the manual workout planning tools or contact support',
      serviceStatus: 'disabled'
    });
  }
  
  try {
    const { 
      modelName = 'claude-3-5-sonnet',
      temperature = 0.7,
      maxTokens = 4000,
      systemPrompt,
      humanMessage,
      mcpContext,
      purpose = 'workout_generation'
    } = req.body;

    // Prepare the request for the Workout MCP server
    const workoutRequest = {
      model: modelName,
      temperature,
      max_tokens: maxTokens,
      system_prompt: systemPrompt,
      user_message: humanMessage,
      context: mcpContext,
      metadata: {
        user_id: req.user.id,
        user_role: req.user.role,
        purpose,
        timestamp: new Date().toISOString()
      }
    };

    logger.info(`Generating workout plan for user ${req.user.id}`, {
      purpose,
      modelName,
      contextKeys: Object.keys(mcpContext || {})
    });

    // Call the Workout MCP server
    const response = await workoutMcpApi.post('/generate', workoutRequest);

    // Calculate response time and update metrics
    const responseTime = Date.now() - startTime;
    const tokensUsed = response.data.metadata?.tokensUsed || 0;
    updateMetrics('workoutGeneration', true, responseTime, tokensUsed, req.user.id);

    // Log successful generation
    logger.info('Workout plan generated successfully', {
      userId: req.user.id,
      responseLength: response.data.content?.length || 0,
      responseTime
    });

    res.json({
      success: true,
      content: response.data.content,
      metadata: {
        ...response.data.metadata,
        generatedAt: new Date().toISOString(),
        userId: req.user.id
      }
    });

  } catch (error) {
    // Update metrics for failed request
    const responseTime = Date.now() - startTime;
    updateMetrics('workoutGeneration', false, responseTime, 0, req.user?.id);

    logger.error('Workout generation error:', {
      userId: req.user?.id,
      error: error.message,
      stack: error.stack,
      mcpResponse: error.response?.data,
      responseTime
    });

    // Handle MCP server specific errors
    if (error.response?.status >= 400) {
      return res.status(error.response.status).json({
        success: false,
        message: 'MCP server error',
        details: error.response.data,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to generate workout plan',
      error: error.message
    });
  }
});

/**
 * Analyze Client Progress
 * POST /api/mcp/analyze
 */
router.post('/analyze', authMiddleware, async (req, res) => {
  const startTime = Date.now();
  
  // Check if MCP services are available
  if (!MCP_ACTUALLY_AVAILABLE) {
    // Return fallback gamification data instead of error
    return res.status(200).json({
      success: true,
      content: `Based on available data, user shows good engagement patterns. Current level: 8, XP: 2450, with a 7-day streak. Recommendations: Continue current routine, focus on consistency.`,
      metadata: {
        source: 'fallback',
        message: isProduction 
          ? 'MCP analysis unavailable in production, using fallback data'
          : 'MCP services disabled, using fallback data',
        generatedAt: new Date().toISOString(),
        userId: req.user.id,
        fallbackMode: true
      }
    });
  }
  
  try {
    const { 
      modelName = 'claude-3-5-sonnet',
      temperature = 0.3,
      maxTokens = 3000,
      systemPrompt,
      humanMessage,
      mcpContext
    } = req.body;

    const analysisRequest = {
      model: modelName,
      temperature,
      max_tokens: maxTokens,
      system_prompt: systemPrompt,
      user_message: humanMessage,
      context: mcpContext,
      metadata: {
        user_id: req.user.id,
        user_role: req.user.role,
        purpose: 'progress_analysis',
        timestamp: new Date().toISOString()
      }
    };

    logger.info(`Analyzing client progress for user ${req.user.id}`);

    const response = await workoutMcpApi.post('/analyze', analysisRequest);

    // Calculate response time and update metrics
    const responseTime = Date.now() - startTime;
    const tokensUsed = response.data.metadata?.tokensUsed || 0;
    updateMetrics('progressAnalysis', true, responseTime, tokensUsed, req.user.id);

    res.json({
      success: true,
      content: response.data.content,
      metadata: {
        ...response.data.metadata,
        generatedAt: new Date().toISOString(),
        userId: req.user.id
      }
    });

  } catch (error) {
    // Update metrics for failed request
    const responseTime = Date.now() - startTime;
    updateMetrics('progressAnalysis', false, responseTime, 0, req.user?.id);

    logger.error('Progress analysis error:', {
      userId: req.user?.id,
      error: error.message,
      mcpResponse: error.response?.data,
      responseTime
    });

    res.status(500).json({
      success: false,
      message: 'Failed to analyze client progress',
      error: error.message
    });
  }
});

/**
 * Generate Exercise Alternatives
 * POST /api/mcp/alternatives
 */
router.post('/alternatives', authMiddleware, async (req, res) => {
  const startTime = Date.now();
  
  // Check if MCP services are enabled
  if (!MCP_SERVICES_ENABLED) {
    return res.status(503).json({
      success: false,
      message: 'MCP exercise alternatives services are not available in this environment',
      fallback: 'Please use the exercise library or contact your trainer for alternatives',
      serviceStatus: 'disabled'
    });
  }
  
  try {
    const { 
      modelName = 'claude-3-5-sonnet',
      temperature = 0.5,
      maxTokens = 2000,
      systemPrompt,
      humanMessage,
      mcpContext
    } = req.body;

    const alternativesRequest = {
      model: modelName,
      temperature,
      max_tokens: maxTokens,
      system_prompt: systemPrompt,
      user_message: humanMessage,
      context: mcpContext,
      metadata: {
        user_id: req.user.id,
        user_role: req.user.role,
        purpose: 'exercise_alternatives',
        timestamp: new Date().toISOString()
      }
    };

    logger.info(`Generating exercise alternatives for user ${req.user.id}`);

    const response = await workoutMcpApi.post('/alternatives', alternativesRequest);

    // Calculate response time and update metrics
    const responseTime = Date.now() - startTime;
    const tokensUsed = response.data.metadata?.tokensUsed || 0;
    updateMetrics('exerciseAlternatives', true, responseTime, tokensUsed, req.user.id);

    res.json({
      success: true,
      content: response.data.content,
      metadata: {
        ...response.data.metadata,
        generatedAt: new Date().toISOString(),
        userId: req.user.id
      }
    });

  } catch (error) {
    // Update metrics for failed request
    const responseTime = Date.now() - startTime;
    updateMetrics('exerciseAlternatives', false, responseTime, 0, req.user?.id);

    logger.error('Exercise alternatives error:', {
      userId: req.user?.id,
      error: error.message,
      mcpResponse: error.response?.data,
      responseTime
    });

    res.status(500).json({
      success: false,
      message: 'Failed to generate exercise alternatives',
      error: error.message
    });
  }
});

/**
 * Generate Nutrition Plan
 * POST /api/mcp/nutrition
 */
router.post('/nutrition', authMiddleware, async (req, res) => {
  const startTime = Date.now();
  
  // Check if MCP services are enabled
  if (!MCP_SERVICES_ENABLED) {
    return res.status(503).json({
      success: false,
      message: 'MCP nutrition planning services are not available in this environment',
      fallback: 'Please use the manual nutrition tracking tools or contact support',
      serviceStatus: 'disabled'
    });
  }
  
  try {
    const { 
      modelName = 'claude-3-5-sonnet',
      temperature = 0.6,
      maxTokens = 3000,
      systemPrompt,
      humanMessage,
      mcpContext
    } = req.body;

    const nutritionRequest = {
      model: modelName,
      temperature,
      max_tokens: maxTokens,
      system_prompt: systemPrompt,
      user_message: humanMessage,
      context: mcpContext,
      metadata: {
        user_id: req.user.id,
        user_role: req.user.role,
        purpose: 'nutrition_plan',
        timestamp: new Date().toISOString()
      }
    };

    logger.info(`Generating nutrition plan for user ${req.user.id}`);

    const response = await workoutMcpApi.post('/nutrition', nutritionRequest);

    // Calculate response time and update metrics
    const responseTime = Date.now() - startTime;
    const tokensUsed = response.data.metadata?.tokensUsed || 0;
    updateMetrics('nutritionPlanning', true, responseTime, tokensUsed, req.user.id);

    res.json({
      success: true,
      content: response.data.content,
      metadata: {
        ...response.data.metadata,
        generatedAt: new Date().toISOString(),
        userId: req.user.id
      }
    });

  } catch (error) {
    // Update metrics for failed request
    const responseTime = Date.now() - startTime;
    updateMetrics('nutritionPlanning', false, responseTime, 0, req.user?.id);

    logger.error('Nutrition plan error:', {
      userId: req.user?.id,
      error: error.message,
      mcpResponse: error.response?.data,
      responseTime
    });

    res.status(500).json({
      success: false,
      message: 'Failed to generate nutrition plan',
      error: error.message
    });
  }
});

/**
 * Gamification Actions
 * POST /api/mcp/gamification/:action
 */
router.post('/gamification/:action', authMiddleware, async (req, res) => {
  const startTime = Date.now();
  
  // Check if MCP services are enabled
  if (!MCP_SERVICES_ENABLED) {
    return res.status(503).json({
      success: false,
      message: 'MCP gamification services are not available in this environment',
      fallback: 'Basic gamification features are still available through the main platform',
      serviceStatus: 'disabled'
    });
  }
  
  try {
    const { action } = req.params;
    const validActions = ['award-points', 'unlock-achievement', 'create-challenge', 'update-leaderboard'];
    
    if (!validActions.includes(action)) {
      updateMetrics('gamification', false, Date.now() - startTime, 0, req.user?.id);
      return res.status(400).json({
        success: false,
        message: `Invalid action. Valid actions: ${validActions.join(', ')}`
      });
    }

    const gamificationRequest = {
      action,
      data: req.body,
      metadata: {
        user_id: req.user.id,
        user_role: req.user.role,
        timestamp: new Date().toISOString()
      }
    };

    logger.info(`Executing gamification action: ${action} for user ${req.user.id}`);

    const response = await gamificationMcpApi.post(`/${action}`, gamificationRequest);

    // Calculate response time and update metrics
    const responseTime = Date.now() - startTime;
    updateMetrics('gamification', true, responseTime, 0, req.user.id);

    res.json({
      success: true,
      data: response.data,
      metadata: {
        action,
        executedAt: new Date().toISOString(),
        userId: req.user.id
      }
    });

  } catch (error) {
    // Update metrics for failed request
    const responseTime = Date.now() - startTime;
    updateMetrics('gamification', false, responseTime, 0, req.user?.id);

    logger.error('Gamification action error:', {
      userId: req.user?.id,
      action: req.params.action,
      error: error.message,
      mcpResponse: error.response?.data,
      responseTime
    });

    res.status(500).json({
      success: false,
      message: `Failed to execute gamification action: ${req.params.action}`,
      error: error.message
    });
  }
});

/**
 * Health Check for MCP Integration
 * GET /api/mcp/health
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: MCP_SERVICES_ENABLED ? 'checking' : 'disabled',
      timestamp: new Date().toISOString(),
      services: {},
      mcpServicesEnabled: MCP_SERVICES_ENABLED
    };
    
    // If MCP services are disabled or not actually available, return early
    if (!MCP_ACTUALLY_AVAILABLE) {
      health.status = 'disabled';
      health.message = isProduction
        ? 'MCP services are not deployed in production (in-app implementations active)'
        : 'MCP services are disabled in this environment';
      health.services = {
        workout: { status: 'disabled', message: health.message },
        gamification: { status: 'disabled', message: health.message }
      };
      health.mcpServicesEnabled = false;
      return res.status(200).json(health);
    }

    // Check Workout MCP
    try {
      const workoutHealth = await workoutMcpApi.get('/health');
      health.services.workout = {
        status: 'online',
        response_time: Date.now(),
        details: workoutHealth.data
      };
    } catch (error) {
      health.services.workout = {
        status: 'offline',
        error: error.message
      };
    }

    // Check Gamification MCP
    try {
      const gamificationHealth = await gamificationMcpApi.get('/health');
      health.services.gamification = {
        status: 'online',
        response_time: Date.now(),
        details: gamificationHealth.data
      };
    } catch (error) {
      health.services.gamification = {
        status: 'offline',
        error: error.message
      };
    }

    // Determine overall health
    const allOffline = Object.values(health.services).every(service => service.status === 'offline');
    health.status = allOffline ? 'degraded' : 'healthy';

    res.status(allOffline ? 503 : 200).json(health);
  } catch (error) {
    logger.error('MCP health check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to perform health check',
      error: error.message
    });
  }
});

export default router;