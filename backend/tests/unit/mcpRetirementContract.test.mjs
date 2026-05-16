import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../..');

const readBackendFile = (relativePath) =>
  fs.readFileSync(path.join(backendRoot, relativePath), 'utf8');

const readRepoFile = (relativePath) =>
  fs.readFileSync(path.resolve(backendRoot, '..', relativePath), 'utf8');

describe('MCP retirement contract', () => {
  it('does not mount the legacy /api/mcp bridge unless explicitly opted in', () => {
    const source = readBackendFile('core/routes.mjs');
    const mcpRoutes = readBackendFile('routes/mcpRoutes.mjs');

    expect(source).not.toContain("app.use('/api/mcp', mcpRoutes);");
    expect(source).toContain('MCP_ROUTES_ENABLED');
    expect(source).toContain("app.all('/api/mcp");
    expect(mcpRoutes).toContain('The legacy MCP bridge is retired');
    expect(mcpRoutes).not.toContain("status: 'online'");
  });

  it('does not auto-enable admin MCP management routes in local development', () => {
    const coreRoutes = readBackendFile('core/routes.mjs');
    const enterpriseRoutes = readBackendFile('routes/adminEnterpriseRoutes.mjs');
    const adminMcpRoutes = readBackendFile('routes/adminMcpRoutes.mjs');

    expect(coreRoutes).toContain("const ADMIN_MCP_ROUTES_ENABLED = process.env.ENABLE_MCP_ROUTES === 'true';");
    expect(coreRoutes).not.toContain("process.env.ENABLE_MCP_ROUTES !== 'false'");
    expect(enterpriseRoutes).not.toContain('MCP_ADMIN_ENABLED');
    expect(enterpriseRoutes).not.toContain("process.env.ENABLE_MCP_ROUTES !== 'false'");
    expect(enterpriseRoutes).toContain("router.all('/mcp-servers'");
    expect(enterpriseRoutes).toContain("router.all('/mcp-servers/*'");
    expect(enterpriseRoutes).toContain('MCP server management is retired');
    expect(enterpriseRoutes).toContain('/api/workout');
    expect(enterpriseRoutes).toContain('/api/v1/gamification');
    expect(enterpriseRoutes).not.toContain("router.get('/mcp-servers'");
    expect(enterpriseRoutes).not.toContain("router.post('/mcp-servers/:serverId/start'");
    expect(enterpriseRoutes).not.toContain("router.post('/mcp-servers/:serverId/stop'");
    expect(enterpriseRoutes).not.toContain("router.post('/mcp-servers/:serverId/restart'");
    expect(enterpriseRoutes).not.toContain("router.get('/mcp-servers/:serverId/logs'");
    expect(enterpriseRoutes).not.toContain("id: 'workout-mcp'");
    expect(enterpriseRoutes).not.toContain("id: 'gamification-mcp'");
    expect(enterpriseRoutes).not.toContain("id: 'financial-events-mcp'");
    expect(enterpriseRoutes).not.toContain("id: 'yolo-mcp'");
    expect(enterpriseRoutes).not.toContain("status: 'warning'");
    expect(enterpriseRoutes).not.toContain("status: 'online'");
    expect(adminMcpRoutes).toContain('router.use(retiredAdminMcpRoute);');
    expect(adminMcpRoutes).not.toContain("router.get('/mcp-analytics'");
    expect(adminMcpRoutes).not.toContain("status: 'active'");
    expect(adminMcpRoutes).not.toContain("status: 'warning'");
    expect(adminMcpRoutes).not.toContain('http://localhost:8000');
    expect(adminMcpRoutes).not.toContain('http://localhost:8001');
    expect(adminMcpRoutes).not.toContain('http://localhost:8002');
    expect(adminMcpRoutes).not.toContain("status: 'online'");
  });

  it('keeps Stripe purchase fulfillment inside SwanStudios APIs instead of external MCP servers', () => {
    const source = readBackendFile('webhooks/stripeWebhook.mjs');

    expect(source).not.toContain('FINANCIAL_EVENTS_MCP_URL');
    expect(source).not.toContain('CLIENT_INSIGHTS_MCP_URL');
    expect(source).not.toContain('SCHEDULING_ASSIST_MCP_URL');
    expect(source).not.toContain('GAMIFICATION_MCP_URL');
    expect(source).not.toContain('/api/award_purchase_points');
  });

  it('keeps daily workout form processing from using default localhost MCP services', () => {
    const source = readBackendFile('routes/dailyWorkoutFormRoutes.mjs');

    expect(source).toContain('[MCP retired]');
    expect(source).toContain('SwanStudios first-party workout and gamification APIs');
    expect(source).not.toContain('ENABLE_MCP_PROCESSING');
    expect(source).not.toContain('GAMIFICATION_MCP_URL');
    expect(source).not.toContain('WORKOUT_MCP_URL');
    expect(source).not.toContain("process.env.GAMIFICATION_MCP_URL || 'http://localhost");
    expect(source).not.toContain("process.env.WORKOUT_MCP_URL || 'http://localhost");
  });

  it('keeps the Master Prompt MCP subtree permanently retired', () => {
    const source = readBackendFile('routes/masterPrompt/index.mjs');
    const integration = readBackendFile('services/integration/MasterPromptIntegration.mjs');

    expect(source).not.toContain("router.use('/mcp', mcpCentricRoutes);");
    expect(source).not.toContain("from './mcpCentric.mjs'");
    expect(source).not.toContain('MCP_ROUTES_ENABLED');
    expect(source).toContain("router.all('/mcp");
    expect(source).toContain('Master Prompt MCP routes are decommissioned');
    expect(source).toContain("status: 'retired'");
    expect(integration).not.toContain("../mcp/");
    expect(integration).toContain("status: 'retired'");
  });

  it('does not start MCP servers from root npm scripts', () => {
    const packageJson = readRepoFile('package.json');
    const serverMonitor = readRepoFile('scripts/monitor-servers.js');

    expect(packageJson).not.toContain('start:mcp');
    expect(packageJson).not.toContain('START-ALL-MCP-SERVERS');
    expect(packageJson).not.toContain('npm:start:mcp');
    expect(serverMonitor).not.toContain('localhost:8001');
    expect(serverMonitor).not.toContain('localhost:8002');
    expect(serverMonitor).not.toContain('localhost:8003');
    expect(serverMonitor).not.toContain('Workout MCP');
  });

  it('does not report retired MCP servers as localhost services from admin status APIs', () => {
    const source = readBackendFile('controllers/adminClientController.mjs');

    expect(source).not.toContain('http://localhost:8000');
    expect(source).not.toContain('http://localhost:8001');
    expect(source).not.toContain('http://localhost:8002');
    expect(source).toContain('decommissioned');
    expect(source).toContain('/api/workout');
    expect(source).toContain('/api/v1/gamification');
  });

  it('keeps legacy MCP monitoring and templates disabled by default', () => {
    const envTemplate = readBackendFile('.env.template');
    const healthManager = readBackendFile('utils/monitoring/mcpHealthManager.mjs');
    const analytics = readBackendFile('services/monitoring/MCPAnalytics.mjs');

    for (const source of [envTemplate, healthManager, analytics]) {
      expect(source).not.toContain('http://localhost:8000');
      expect(source).not.toContain('http://localhost:8002');
      expect(source).not.toContain("ENABLE_MCP_SERVICES !== 'false'");
    }

    expect(envTemplate).toContain('ENABLE_MCP_SERVICES=false');
    expect(healthManager).toContain('Legacy MCP server retired');
    expect(healthManager).not.toContain('setInterval(');
    expect(analytics).toContain('real-time polling disabled');
    expect(analytics).toContain('return false');
  });

  it('blocks old progress sync and admin restart routes instead of touching MCP servers', () => {
    const progressSync = readBackendFile('controllers/progressSyncController.mjs');
    const adminRoutes = readBackendFile('routes/admin.mjs');

    expect(progressSync).not.toContain('node-fetch');
    expect(progressSync).not.toContain('WORKOUT_MCP_URL');
    expect(progressSync).not.toContain('GAMIFICATION_MCP_URL');
    expect(progressSync).toContain('status(410)');
    expect(adminRoutes).toContain('Blocked retired MCP server restart request');
    expect(adminRoutes).toContain('status(410)');
  });
});
