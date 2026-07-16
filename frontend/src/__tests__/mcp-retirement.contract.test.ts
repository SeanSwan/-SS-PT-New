import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..');
const readFrontendFile = (relativePath: string) =>
  readFileSync(resolve(root, relativePath), 'utf8');

describe('MCP retirement contract', () => {
  it('removes MCP server navigation from the canonical admin dashboard routes', () => {
    const systemWorkspace = readFrontendFile('components/DashBoard/workspaces/SystemWorkspace.tsx');
    const tabs = readFrontendFile('config/dashboard-tabs.ts');

    expect(systemWorkspace).not.toContain("id: 'mcp'");
    expect(systemWorkspace).not.toContain('/dashboard/system/mcp');
    expect(tabs).not.toContain("key: 'mcp-servers'");
    expect(tabs).not.toContain("label: 'MCP Servers'");
  });

  it('keeps dashboard progress sync on backend APIs, not frontend MCP services', () => {
    const progressService = readFrontendFile('services/client-progress-service/index.ts');
    const dashboardHook = readFrontendFile('hooks/useClientDashboardMcp.ts');

    expect(progressService).not.toContain('../mcp/');
    expect(progressService).not.toContain('McpApi');
    expect(dashboardHook).not.toContain('services/mcp');
    expect(dashboardHook).not.toContain('workoutMcpApi');
    expect(dashboardHook).not.toContain('gamificationMcpApi');
  });

  it('keeps workout management hooks from calling localhost MCP servers or returning fake MCP data', () => {
    const source = readFrontendFile('hooks/useWorkoutMcp.ts');

    expect(source).not.toContain('VITE_WORKOUT_MCP_URL');
    expect(source).not.toContain('http://localhost:8000');
    expect(source).not.toContain('/tools/');
    expect(source).not.toContain('Mock recommendations - MCP server unavailable');
    expect(source).not.toContain('Mock progress data - MCP server unavailable');
  });

  it('does not ship localhost MCP defaults or fake online MCP status in frontend utility layers', () => {
    const envConfig = readFrontendFile('config/env-config.ts');
    const mcpUtils = readFrontendFile('utils/mcp-utils.ts');
    const mcpIndex = readFrontendFile('services/mcp/index.ts');

    for (const source of [envConfig, mcpUtils, mcpIndex]) {
      expect(source).not.toContain('http://localhost:8000');
      expect(source).not.toContain('http://localhost:8001');
      expect(source).not.toContain("status: 'online'");
    }

    expect(mcpUtils).not.toContain('workoutMcpApi');
    expect(mcpUtils).not.toContain('gamificationMcpApi');
    expect(mcpIndex).not.toContain('mcpConfig.checkHealth');
  });

  it('keeps legacy MCP-named frontend adapters failed closed on REST APIs', () => {
    const files = [
      'services/mcp/mcpConfig.ts',
      'services/mcp/workoutMcpService.ts',
      'services/mcp/gamificationMcpService.ts',
      'hooks/useMcpIntegration.ts',
      'hooks/useGamificationMcp.ts',
      'services/gamificationMCPService.ts'
    ];

    for (const file of files) {
      const source = readFrontendFile(file);
      expect(source, `${file} should not call legacy MCP routes`).not.toContain('/api/mcp');
      expect(source, `${file} should not call MCP bridge routes`).not.toMatch(/['"`]\/mcp\//);
      expect(source, `${file} should not ship localhost MCP defaults`).not.toContain('localhost:8000');
      expect(source, `${file} should not ship localhost gamification MCP defaults`).not.toContain('localhost:11000');
      expect(source, `${file} should not return mock MCP data`).not.toMatch(/mock|fallback data/i);
    }
  });

  it('does not call the legacy /api/mcp bridge from the active AI dashboard service', () => {
    const files = [
      'services/enhancedClientDashboardService.ts',
    ];

    for (const file of files) {
      expect(readFrontendFile(file), `${file} should not call /api/mcp`).not.toContain('/api/mcp');
    }
  });

  it('keeps old MCP-heavy UI surfaces out of active frontend source', () => {
    const archivedSources = [
      'components/AIDashboard',
      'components/AIFeaturesDashboard',
      'components/WorkoutGenerator',
      'components/ProgressAnalysis/ProgressAnalysis.tsx',
      'components/ExerciseAlternatives/ExerciseAlternatives.tsx',
      'components/NutritionPlanning/NutritionPlanning.tsx',
      'pages/OverwatchGamificationHub.tsx',
    ];

    for (const file of archivedSources) {
      expect(existsSync(resolve(root, file)), `${file} should stay archived outside frontend/src`).toBe(false);
    }
  });
});
