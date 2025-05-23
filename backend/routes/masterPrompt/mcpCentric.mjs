/**
 * MCP-Centric Routes
 * API endpoints for individual MCP server monitoring and management
 * MCP-First Architecture Implementation
 */

import express from 'express';
import { mcpServerMonitor } from '../../services/mcp/MCPServerMonitor.mjs';
import { mcpHealthChecker } from '../../services/mcp/MCPHealthChecker.mjs';
import { mcpMetricsCollector } from '../../services/mcp/MCPMetricsCollector.mjs';
import { requirePermissionWithAccessibility } from '../../middleware/p0Monitoring.mjs';
import { piiSafeLogger } from '../../utils/monitoring/piiSafeLogging.mjs';

const router = express.Router();

/**
 * @route   GET /api/master-prompt/mcp/servers
 * @desc    Get all registered MCP servers and their status
 * @access  Private (Admin)
 */
router.get('/servers',
  requirePermissionWithAccessibility('system_monitoring'),
  async (req, res) => {
    try {
      const servers = await mcpServerMonitor.getAllServers();
      const enrichedServers = await Promise.all(
        servers.map(async (server) => ({
          ...server,
          health: await mcpHealthChecker.checkServerHealth(server.name),
          metrics: await mcpMetricsCollector.getRecentMetrics(server.name, '1h')
        }))
      );
      
      res.json({
        success: true,
        data: {
          servers: enrichedServers,
          summary: {
            total: servers.length,
            healthy: enrichedServers.filter(s => s.health.status === 'healthy').length,
            warning: enrichedServers.filter(s => s.health.status === 'warning').length,
            critical: enrichedServers.filter(s => s.health.status === 'critical').length
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      piiSafeLogger.error('Failed to get MCP servers', {
        error: error.message,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve MCP servers',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/master-prompt/mcp/server/:name
 * @desc    Get detailed information about specific MCP server
 * @access  Private (Admin)
 */
router.get('/server/:name',
  requirePermissionWithAccessibility('system_monitoring'),
  async (req, res) => {
    try {
      const { name } = req.params;
      const { timeframe = '24h' } = req.query;
      
      const serverInfo = await mcpServerMonitor.getServerDetails(name);
      if (!serverInfo) {
        return res.status(404).json({
          success: false,
          message: `MCP server '${name}' not found`
        });
      }
      
      const healthHistory = await mcpHealthChecker.getHealthHistory(name, timeframe);
      const metrics = await mcpMetricsCollector.getDetailedMetrics(name, timeframe);
      const tools = await mcpServerMonitor.getServerTools(name);
      
      res.json({
        success: true,
        data: {
          server: serverInfo,
          health: healthHistory,
          metrics,
          tools,
          lastUpdated: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      piiSafeLogger.error('Failed to get MCP server details', {
        error: error.message,
        serverName: req.params.name,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve server details',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/master-prompt/mcp/server/:name/health-check
 * @desc    Trigger manual health check for specific MCP server
 * @access  Private (Admin)
 */
router.post('/server/:name/health-check',
  requirePermissionWithAccessibility('system_monitoring'),
  async (req, res) => {
    try {
      const { name } = req.params;
      const { comprehensive = false } = req.body;
      
      const healthResult = comprehensive
        ? await mcpHealthChecker.runComprehensiveHealthCheck(name)
        : await mcpHealthChecker.checkServerHealth(name);
      
      // Track manual health check
      piiSafeLogger.trackMCPOperation('health_check', name, {
        triggered: 'manual',
        comprehensive,
        status: healthResult.status,
        userId: req.user.id
      });
      
      res.json({
        success: true,
        data: healthResult,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      piiSafeLogger.error('MCP health check failed', {
        error: error.message,
        serverName: req.params.name,
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

/**
 * @route   GET /api/master-prompt/mcp/metrics/summary
 * @desc    Get aggregated metrics across all MCP servers
 * @access  Private (Admin)
 */
router.get('/metrics/summary',
  requirePermissionWithAccessibility('system_monitoring'),
  async (req, res) => {
    try {
      const { timeframe = '1h' } = req.query;
      
      const summary = await mcpMetricsCollector.getAggregatedMetrics(timeframe);
      
      res.json({
        success: true,
        data: summary,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      piiSafeLogger.error('Failed to get MCP metrics summary', {
        error: error.message,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve metrics summary',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/master-prompt/mcp/tools
 * @desc    Get all available MCP tools across servers
 * @access  Private
 */
router.get('/tools', async (req, res) => {
  try {
    const { category, server } = req.query;
    
    const tools = await mcpServerMonitor.getAllAvailableTools({ category, server });
    
    res.json({
      success: true,
      data: {
        tools,
        summary: {
          totalTools: tools.length,
          byServer: tools.reduce((acc, tool) => {
            acc[tool.server] = (acc[tool.server] || 0) + 1;
            return acc;
          }, {}),
          byCategory: tools.reduce((acc, tool) => {
            acc[tool.category] = (acc[tool.category] || 0) + 1;
            return acc;
          }, {})
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    piiSafeLogger.error('Failed to get MCP tools', {
      error: error.message,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve MCP tools',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/master-prompt/mcp/tool/:toolName/invoke
 * @desc    Invoke specific MCP tool
 * @access  Private
 */
router.post('/tool/:toolName/invoke', async (req, res) => {
  try {
    const { toolName } = req.params;
    const { serverName, args = {} } = req.body;
    
    if (!serverName) {
      return res.status(400).json({
        success: false,
        message: 'Server name is required'
      });
    }
    
    // Track tool invocation
    piiSafeLogger.trackMCPOperation('tool_invocation', serverName, {
      tool: toolName,
      userId: req.user.id,
      argsProvided: Object.keys(args).length
    });
    
    const result = await mcpServerMonitor.invokeTool(serverName, toolName, args);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    piiSafeLogger.error('MCP tool invocation failed', {
      error: error.message,
      toolName: req.params.toolName,
      serverName: req.body.serverName,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Tool invocation failed',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/master-prompt/mcp/server/:name/restart
 * @desc    Restart specific MCP server
 * @access  Private (Admin)
 */
router.post('/server/:name/restart',
  requirePermissionWithAccessibility('system_monitoring'),
  async (req, res) => {
    try {
      const { name } = req.params;
      const { force = false } = req.body;
      
      const result = await mcpServerMonitor.restartServer(name, { force });
      
      piiSafeLogger.trackMCPOperation('server_restart', name, {
        force,
        success: result.success,
        userId: req.user.id
      });
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      piiSafeLogger.error('MCP server restart failed', {
        error: error.message,
        serverName: req.params.name,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Server restart failed',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/master-prompt/mcp/server/register
 * @desc    Register new MCP server
 * @access  Private (Admin)
 */
router.post('/server/register',
  requirePermissionWithAccessibility('system_monitoring'),
  async (req, res) => {
    try {
      const { name, config, autoStart = true } = req.body;
      
      if (!name || !config) {
        return res.status(400).json({
          success: false,
          message: 'Server name and configuration are required'
        });
      }
      
      const result = await mcpServerMonitor.registerServer(name, config, autoStart);
      
      piiSafeLogger.trackUserAction('mcp_server_registered', req.user.id, {
        serverName: name,
        autoStart,
        success: result.success
      });
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      piiSafeLogger.error('MCP server registration failed', {
        error: error.message,
        serverName: req.body.name,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Server registration failed',
        error: error.message
      });
    }
  }
);

/**
 * @route   DELETE /api/master-prompt/mcp/server/:name
 * @desc    Unregister MCP server
 * @access  Private (Admin)
 */
router.delete('/server/:name',
  requirePermissionWithAccessibility('system_monitoring'),
  async (req, res) => {
    try {
      const { name } = req.params;
      const { gracefulShutdown = true } = req.body;
      
      const result = await mcpServerMonitor.unregisterServer(name, gracefulShutdown);
      
      piiSafeLogger.trackUserAction('mcp_server_unregistered', req.user.id, {
        serverName: name,
        gracefulShutdown,
        success: result.success
      });
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      piiSafeLogger.error('MCP server unregistration failed', {
        error: error.message,
        serverName: req.params.name,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Server unregistration failed',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/master-prompt/mcp/cost-analysis
 * @desc    Get cost analysis across MCP servers
 * @access  Private (Admin)
 */
router.get('/cost-analysis',
  requirePermissionWithAccessibility('system_monitoring'),
  async (req, res) => {
    try {
      const { timeframe = '7d', breakdown = true } = req.query;
      
      const costAnalysis = await mcpMetricsCollector.getCostAnalysis({
        timeframe,
        includeBreakdown: breakdown === 'true'
      });
      
      res.json({
        success: true,
        data: costAnalysis,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      piiSafeLogger.error('Failed to get MCP cost analysis', {
        error: error.message,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve cost analysis',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/master-prompt/mcp/system-overview
 * @desc    Get comprehensive MCP system overview
 * @access  Private (Admin)
 */
router.get('/system-overview',
  requirePermissionWithAccessibility('system_monitoring'),
  async (req, res) => {
    try {
      const overview = {
        servers: await mcpServerMonitor.getSystemOverview(),
        health: await mcpHealthChecker.getSystemHealthSummary(),
        metrics: await mcpMetricsCollector.getSystemMetricsSummary(),
        costs: await mcpMetricsCollector.getCostSummary(),
        alerts: await mcpServerMonitor.getActiveAlerts(),
        lastUpdated: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: overview,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      piiSafeLogger.error('Failed to get MCP system overview', {
        error: error.message,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve system overview',
        error: error.message
      });
    }
  }
);

export default router;