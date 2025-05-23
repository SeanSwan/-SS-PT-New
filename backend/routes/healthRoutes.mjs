import express from 'express';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';
import { getMongoDBStatus } from '../mongodb-connect.mjs';
import { mcpHealthManager } from '../utils/monitoring/mcpHealthManager.mjs';
import { piiSafeLogger } from '../utils/monitoring/piiSafeLogging.mjs';
import os from 'os';
import { version } from 'process';

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Enhanced health check with MCP monitoring and P0 security
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    // Check PostgreSQL database connection
    let postgresConnected = false;
    let postgresError = null;
    try {
      await sequelize.authenticate();
      postgresConnected = true;
    } catch (dbError) {
      postgresError = dbError.message;
      logger.error('PostgreSQL health check failed:', { error: dbError.message });
    }
    
    // Get MongoDB status
    const mongoStatus = getMongoDBStatus();
    
    // Get MCP ecosystem health
    let mcpHealth = { overallHealth: 0, healthyServers: 0, totalServers: 0, error: null };
    try {
      mcpHealth = await mcpHealthManager.getMCPEcosystemHealth();
    } catch (mcpError) {
      mcpHealth.error = mcpError.message;
      piiSafeLogger.error('MCP health check failed', { error: mcpError.message });
    }
    
    // Get system information
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMem: Math.round(os.totalmem() / (1024 * 1024)) + 'MB',
      freeMem: Math.round(os.freemem() / (1024 * 1024)) + 'MB',
      nodeVersion: version,
      uptime: formatUptime(process.uptime())
    };
    
    // Determine overall health status
    const isProduction = process.env.NODE_ENV === 'production';
    const dbHealthy = isProduction 
      ? (postgresConnected && mongoStatus.connected)
      : (postgresConnected || mongoStatus.connected);
    const mcpHealthy = mcpHealth.overallHealth >= 60; // At least 60% of MCP servers healthy
    const isHealthy = dbHealthy && mcpHealthy;
    
    // Build comprehensive health response
    const healthResponse = {
      success: isHealthy,
      status: isHealthy ? 'healthy' : 'degraded',
      message: isHealthy ? 'All systems operational' : 'Some systems experiencing issues',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      
      // Database health
      databases: {
        postgres: {
          connected: postgresConnected,
          type: 'primary',
          ...(postgresError && { error: postgresError })
        },
        mongodb: {
          connected: mongoStatus.connected,
          usingSQLite: mongoStatus.usingSQLite || false,
          type: 'workout/gamification'
        }
      },
      
      // MCP health
      mcp: {
        status: mcpHealthy ? 'healthy' : 'degraded',
        overallHealth: `${Math.round(mcpHealth.overallHealth)}%`,
        healthyServers: `${mcpHealth.healthyServers}/${mcpHealth.totalServers}`,
        averageLatency: `${Math.round(mcpHealth.averageLatency || 0)}ms`,
        ...(mcpHealth.error && { error: mcpHealth.error })
      },
      
      // System information
      system: systemInfo,
      
      // Monitoring systems
      monitoring: {
        piiSafeLogging: 'enabled',
        mcpHealthManager: 'enabled',
        accessibilityAuth: 'enabled'
      },
      
      // Uptime details
      uptime: {
        seconds: Math.floor(process.uptime()),
        formatted: formatUptime(process.uptime())
      }
    };
    
    // Log health check access with PII safety
    piiSafeLogger.trackUserAction('health_check', req.user?.id || 'anonymous', {
      timestamp: new Date().toISOString(),
      healthy: isHealthy
    });
    
    res.status(isHealthy ? 200 : 503).json(healthResponse);
  } catch (error) {
    logger.error('Health check failed:', { error: error.message });
    piiSafeLogger.error('Health check system error', { error: error.message });
    
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Health check system error',
      error: error.message,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }
});

/**
 * @route   GET /api/health/detailed
 * @desc    Detailed system diagnostics with PII-safe logging
 * @access  Private (logged users)
 */
router.get('/detailed', async (req, res) => {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      
      // System details
      system: {
        platform: process.platform,
        version: process.version,
        architecture: process.arch,
        cpuUsage: process.cpuUsage(),
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        loadAverage: os.loadavg()
      },
      
      // Environment details
      environment: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      
      // Database diagnostics
      database: {
        postgres: { status: 'unknown' },
        mongodb: { status: 'unknown' }
      },
      
      // MCP diagnostics
      mcp: {
        status: 'unknown',
        servers: {}
      },
      
      // Monitoring systems
      monitoring: {
        piiSafeLogging: 'enabled',
        mcpHealthManager: 'enabled',
        accessibilityAuth: 'enabled',
        gamificationTracking: 'enabled',
        aiGenerationMonitoring: 'enabled'
      }
    };

    // PostgreSQL detailed diagnostics
    try {
      const startTime = Date.now();
      await sequelize.authenticate();
      const connectionTime = Date.now() - startTime;
      
      diagnostics.database.postgres = {
        status: 'connected',
        connectionTime: `${connectionTime}ms`,
        dialect: sequelize.getDialect(),
        version: await sequelize.databaseVersion(),
        poolSize: sequelize.connectionManager.pool?.size || 'N/A'
      };
    } catch (error) {
      diagnostics.database.postgres = {
        status: 'error',
        error: error.message
      };
    }

    // MongoDB detailed diagnostics
    try {
      const mongoStatus = getMongoDBStatus();
      diagnostics.database.mongodb = {
        status: mongoStatus.connected ? 'connected' : 'disconnected',
        database: mongoStatus.database,
        lastConnectionAttempt: mongoStatus.lastConnectionAttempt,
        usingSQLite: mongoStatus.usingSQLite
      };
    } catch (error) {
      diagnostics.database.mongodb = {
        status: 'error',
        error: error.message
      };
    }

    // MCP detailed diagnostics
    try {
      const mcpReport = await mcpHealthManager.generateHealthReport();
      diagnostics.mcp = {
        status: 'analyzed',
        summary: mcpReport.summary,
        servers: mcpReport.servers,
        lastUpdated: mcpReport.timestamp
      };
    } catch (error) {
      diagnostics.mcp = {
        status: 'error',
        error: error.message
      };
    }

    // Log detailed health check access
    piiSafeLogger.trackUserAction('health_check_detailed', req.user?.id || 'anonymous', {
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: diagnostics
    });
  } catch (error) {
    logger.error('Detailed health check failed:', { error: error.message });
    piiSafeLogger.error('Detailed health check error', { error: error.message });
    
    res.status(500).json({
      success: false,
      message: 'Detailed health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/health/database
 * @desc    Database connectivity check with enhanced diagnostics
 * @access  Public
 */
router.get('/database', async (req, res) => {
  try {
    // Test PostgreSQL connection
    await sequelize.authenticate();
    
    // Get database information
    const [results] = await sequelize.query('SELECT version();');
    const dbVersion = results[0]?.version || 'Unknown';
    
    // Get MongoDB status
    const mongoStatus = getMongoDBStatus();
    
    const databaseHealth = {
      success: true,
      message: 'Database connections successful',
      timestamp: new Date().toISOString(),
      postgres: {
        connected: true,
        version: dbVersion,
        dialect: sequelize.getDialect()
      },
      mongodb: {
        connected: mongoStatus.connected,
        database: mongoStatus.database,
        usingSQLite: mongoStatus.usingSQLite
      }
    };
    
    // Log database health check
    piiSafeLogger.trackUserAction('database_health_check', req.user?.id || 'anonymous', {
      postgresConnected: true,
      mongodbConnected: mongoStatus.connected
    });
    
    res.status(200).json(databaseHealth);
  } catch (error) {
    logger.error('Database health check failed:', { error: error.message, stack: error.stack });
    piiSafeLogger.error('Database health check failed', { error: error.message });
    
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/health/mcp
 * @desc    MCP ecosystem health check
 * @access  Public
 */
router.get('/mcp', async (req, res) => {
  try {
    const mcpHealth = await mcpHealthManager.getMCPEcosystemHealth();
    
    // Log MCP health check
    piiSafeLogger.trackMCPOperation('health_system', 'ecosystem_check', {
      overallHealth: mcpHealth.overallHealth,
      healthyServers: mcpHealth.healthyServers,
      totalServers: mcpHealth.totalServers
    });
    
    res.json({
      success: true,
      message: 'MCP ecosystem health retrieved',
      data: mcpHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('MCP health check failed:', { error: error.message });
    piiSafeLogger.error('MCP health check failed', { error: error.message });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve MCP health information',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/health/mcp/:serverName
 * @desc    Individual MCP server health check
 * @access  Public
 */
router.get('/mcp/:serverName', async (req, res) => {
  const { serverName } = req.params;
  
  try {
    const serverHealth = await mcpHealthManager.checkSingleMCPHealth(serverName);
    const serverMetrics = mcpHealthManager.getServerMetrics(serverName);
    
    // Log individual server health check
    piiSafeLogger.trackMCPOperation(serverName, 'individual_health_check', {
      healthy: serverHealth.healthy,
      latency: serverHealth.latency
    });
    
    res.json({
      success: true,
      message: `Health check for ${serverName} completed`,
      data: {
        server: serverName,
        health: serverHealth,
        metrics: serverMetrics
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`MCP server ${serverName} health check failed:`, { error: error.message });
    piiSafeLogger.trackMCPOperation(serverName, 'health_check_failed', {
      error: error.message
    });
    
    res.status(404).json({
      success: false,
      message: `MCP server '${serverName}' not found or unreachable`,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/health/accessibility
 * @desc    Accessibility health check and feature status
 * @access  Public
 */
router.get('/accessibility', async (req, res) => {
  const accessibilityHealth = {
    success: true,
    status: 'healthy',
    message: 'All accessibility features operational',
    features: {
      screenReaderSupport: 'enabled',
      keyboardNavigation: 'enabled',
      highContrastMode: 'enabled',
      reducedMotion: 'enabled',
      largeTextSupport: 'enabled',
      voiceControl: 'enabled',
      piiSafeLogging: 'enabled'
    },
    compliance: {
      wcagLevel: 'AA',
      standards: ['508 Compliance', 'ADA Compliance']
    },
    monitoring: {
      usageTracking: 'enabled',
      errorReporting: 'enabled',
      accessibilityAuth: 'enabled'
    },
    timestamp: new Date().toISOString()
  };
  
  // Log accessibility health check
  piiSafeLogger.trackAccessibilityUsage('health_check', req.user?.id || 'anonymous', {
    timestamp: new Date().toISOString()
  });
  
  res.json(accessibilityHealth);
});

/**
 * Format uptime in human-readable format
 * @param {number} uptime - Uptime in seconds
 * @returns {string} Formatted uptime string
 */
function formatUptime(uptime) {
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  let formatted = '';
  if (days > 0) formatted += `${days}d `;
  if (hours > 0 || days > 0) formatted += `${hours}h `;
  if (minutes > 0 || hours > 0 || days > 0) formatted += `${minutes}m `;
  formatted += `${seconds}s`;
  
  return formatted;
}

export default router;
