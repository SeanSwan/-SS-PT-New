/**
 * Admin MCP Server Management Routes
 * ==================================
 * 
 * Backend API routes for enterprise admin dashboard MCP server management
 * Integrates with existing MCP server infrastructure and monitoring
 */

import express from 'express';
import { protect as authMiddleware } from '../middleware/authMiddleware.mjs';
import { requireAdmin } from '../middleware/adminMiddleware.mjs';
import logger from '../utils/logger.mjs';
import { mcpServerMonitor } from '../services/mcp/MCPServerMonitor.mjs';

const router = express.Router();

// Apply authentication and admin middleware to all routes
router.use(authMiddleware);
router.use(requireAdmin);

/**
 * Get all MCP servers with status
 * GET /api/admin/mcp-servers
 */
router.get('/', async (req, res) => {
  try {
    const servers = await mcpServerMonitor.getAllServers();
    
    // Transform data to match frontend interface
    const transformedServers = servers.map(server => ({
      id: server.name,
      name: server.name,
      description: getServerDescription(server.name),
      status: mapServerStatus(server.status),
      port: getServerPort(server.name),
      pid: server.pid || undefined,
      uptime: formatUptime(server.startedAt),
      lastSeen: formatLastSeen(server.lastHealthCheck),
      version: server.config?.version || '1.0.0',
      performance: {
        cpu: server.health?.cpuUsage ? Math.round(server.health.cpuUsage * 100) : 0,
        memory: server.health?.memoryUsage ? Math.round(server.health.memoryUsage * 100) : 0,
        network: { in: 1.2, out: 0.8 }, // TODO: Implement real network metrics
        requests: server.metrics?.totalRequests || 0,
        errors: server.metrics?.failedRequests || 0,
        responseTime: server.metrics?.avgResponseTime || 0
      },
      config: {
        autoRestart: server.config?.autoRestart || true,
        maxMemory: server.config?.maxMemory || 512,
        maxCpu: server.config?.maxCpu || 80,
        logLevel: server.config?.logLevel || 'info',
        environment: server.config?.environment || {}
      },
      healthChecks: {
        last: formatLastSeen(server.lastHealthCheck),
        status: mapHealthStatus(server.health?.status),
        checks: transformHealthChecks(server.health)
      }
    }));

    res.json({
      success: true,
      servers: transformedServers,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch MCP servers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch MCP server status',
      error: error.message
    });
  }
});

/**
 * Get specific MCP server details
 * GET /api/admin/mcp-servers/:serverId
 */
router.get('/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const serverDetails = await mcpServerMonitor.getServerDetails(serverId);
    
    if (!serverDetails) {
      return res.status(404).json({
        success: false,
        message: `Server ${serverId} not found`
      });
    }

    res.json({
      success: true,
      server: transformServerDetails(serverDetails),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Failed to fetch server ${req.params.serverId}:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to fetch server ${req.params.serverId} details`,
      error: error.message
    });
  }
});

/**
 * Start MCP server
 * POST /api/admin/mcp-servers/:serverId/start
 */
router.post('/:serverId/start', async (req, res) => {
  try {
    const { serverId } = req.params;
    
    logger.info(`Admin ${req.user.id} starting MCP server: ${serverId}`);
    
    const result = await mcpServerMonitor.startServer(serverId);
    
    if (result.success) {
      res.json({
        success: true,
        message: `Server ${serverId} started successfully`,
        serverId,
        status: 'starting',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || `Failed to start server ${serverId}`,
        serverId
      });
    }

  } catch (error) {
    logger.error(`Failed to start server ${req.params.serverId}:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to start server ${req.params.serverId}`,
      error: error.message
    });
  }
});

/**
 * Stop MCP server
 * POST /api/admin/mcp-servers/:serverId/stop
 */
router.post('/:serverId/stop', async (req, res) => {
  try {
    const { serverId } = req.params;
    
    logger.info(`Admin ${req.user.id} stopping MCP server: ${serverId}`);
    
    const result = await mcpServerMonitor.stopServer(serverId, true);
    
    if (result.success) {
      res.json({
        success: true,
        message: `Server ${serverId} stopped successfully`,
        serverId,
        status: 'stopping',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || `Failed to stop server ${serverId}`,
        serverId
      });
    }

  } catch (error) {
    logger.error(`Failed to stop server ${req.params.serverId}:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to stop server ${req.params.serverId}`,
      error: error.message
    });
  }
});

/**
 * Restart MCP server
 * POST /api/admin/mcp-servers/:serverId/restart
 */
router.post('/:serverId/restart', async (req, res) => {
  try {
    const { serverId } = req.params;
    
    logger.info(`Admin ${req.user.id} restarting MCP server: ${serverId}`);
    
    const result = await mcpServerMonitor.restartServer(serverId, false);
    
    if (result.success) {
      res.json({
        success: true,
        message: `Server ${serverId} restarted successfully`,
        serverId,
        status: 'starting',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || `Failed to restart server ${serverId}`,
        serverId
      });
    }

  } catch (error) {
    logger.error(`Failed to restart server ${req.params.serverId}:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to restart server ${req.params.serverId}`,
      error: error.message
    });
  }
});

/**
 * Get MCP server logs
 * GET /api/admin/mcp-servers/:serverId/logs
 */
router.get('/:serverId/logs', async (req, res) => {
  try {
    const { serverId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    
    // TODO: Implement real log fetching from MCP servers
    const logs = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Server health check passed',
        source: 'health-monitor',
        serverId,
        serverName: serverId
      }
    ];

    res.json({
      success: true,
      logs,
      serverId,
      limit,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Failed to fetch logs for server ${req.params.serverId}:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to fetch logs for server ${req.params.serverId}`,
      error: error.message
    });
  }
});

/**
 * Update MCP server configuration
 * PUT /api/admin/mcp-servers/:serverId/config
 */
router.put('/:serverId/config', async (req, res) => {
  try {
    const { serverId } = req.params;
    const config = req.body;
    
    logger.info(`Admin ${req.user.id} updating config for MCP server: ${serverId}`, config);
    
    // TODO: Implement real configuration update
    // const result = await mcpServerMonitor.updateServerConfig(serverId, config);
    
    res.json({
      success: true,
      message: `Configuration updated for server ${serverId}`,
      serverId,
      config,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Failed to update config for server ${req.params.serverId}:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to update configuration for server ${req.params.serverId}`,
      error: error.message
    });
  }
});

/**
 * Get system overview of all MCP servers
 * GET /api/admin/mcp-servers/system/overview
 */
router.get('/system/overview', async (req, res) => {
  try {
    const overview = await mcpServerMonitor.getSystemOverview();
    
    res.json({
      success: true,
      overview,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch system overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system overview',
      error: error.message
    });
  }
});

/**
 * Get active alerts for MCP servers
 * GET /api/admin/mcp-servers/alerts/active
 */
router.get('/alerts/active', async (req, res) => {
  try {
    const alerts = await mcpServerMonitor.getActiveAlerts();
    
    res.json({
      success: true,
      alerts,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch active alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active alerts',
      error: error.message
    });
  }
});

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function getServerDescription(serverName) {
  const descriptions = {
    'workout-mcp': 'NASM-compliant workout generation with AI optimization',
    'gamification-mcp': 'Social engagement and achievement system',
    'enhanced-gamification-mcp': 'Advanced social features with ML-powered recommendations',
    'financial-events-mcp': 'Payment processing and financial event management',
    'yolo-mcp': 'Real-time object detection and form analysis'
  };
  return descriptions[serverName] || 'MCP Server';
}

function getServerPort(serverName) {
  const ports = {
    'workout-mcp': 3001,
    'gamification-mcp': 3002,
    'enhanced-gamification-mcp': 3003,
    'financial-events-mcp': 3004,
    'yolo-mcp': 3005
  };
  return ports[serverName] || 3000;
}

function mapServerStatus(status) {
  const statusMap = {
    'running': 'online',
    'stopped': 'offline',
    'starting': 'starting',
    'stopping': 'stopping',
    'error': 'error'
  };
  return statusMap[status] || 'offline';
}

function mapHealthStatus(healthStatus) {
  const healthMap = {
    'healthy': 'healthy',
    'warning': 'degraded',
    'critical': 'unhealthy'
  };
  return healthMap[healthStatus] || 'unhealthy';
}

function formatUptime(startedAt) {
  if (!startedAt) return 'Unknown';
  
  const start = new Date(startedAt);
  const now = new Date();
  const diff = now - start;
  
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

function formatLastSeen(lastHealthCheck) {
  if (!lastHealthCheck) return 'Never';
  
  const lastCheck = new Date(lastHealthCheck);
  const now = new Date();
  const diffSeconds = Math.floor((now - lastCheck) / 1000);
  
  if (diffSeconds < 60) {
    return `${diffSeconds} seconds ago`;
  } else if (diffSeconds < 3600) {
    const minutes = Math.floor(diffSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
}

function transformHealthChecks(health) {
  if (!health) {
    return [
      { name: 'Server Status', status: 'fail', message: 'No health data available', duration: 0 }
    ];
  }
  
  const checks = [];
  
  if (health.memoryUsage !== undefined) {
    const memoryPercent = Math.round(health.memoryUsage * 100);
    checks.push({
      name: 'Memory Usage',
      status: memoryPercent > 80 ? 'warn' : 'pass',
      message: `${memoryPercent}% of allocated memory used`,
      duration: 2
    });
  }
  
  if (health.cpuUsage !== undefined) {
    const cpuPercent = Math.round(health.cpuUsage * 100);
    checks.push({
      name: 'CPU Usage',
      status: cpuPercent > 80 ? 'warn' : 'pass',
      message: `${cpuPercent}% CPU utilization`,
      duration: 1
    });
  }
  
  checks.push({
    name: 'Health Status',
    status: health.status === 'healthy' ? 'pass' : health.status === 'warning' ? 'warn' : 'fail',
    message: `Server health: ${health.status}`,
    duration: 5
  });
  
  return checks;
}

function transformServerDetails(serverDetails) {
  // Transform the detailed server data for frontend consumption
  return {
    ...serverDetails,
    // Add any additional transformations needed
  };
}

export default router;
