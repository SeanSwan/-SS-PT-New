# MCP Retirement Archive Pass - 2026-05-15

## Scope

This archive pass removes old MCP startup and dashboard/server artifacts from active runtime paths without deleting them. The active SwanStudios app keeps fail-closed compatibility routes and REST-backed adapters where imports still exist.

## Active Runtime Changes

- `package.json`: removed default MCP startup from `start` and `dev:full`.
- `backend/routes/masterPrompt/index.mjs`: removed eager import of the retired MCP route subtree and kept `/mcp` responses fail-closed.
- `backend/services/integration/MasterPromptIntegration.mjs`: removed eager imports of retired MCP server services and reports the MCP feature as retired.
- `frontend/src/components/DashBoard/Pages/admin-dashboard/sections/index.ts`: removed the old admin MCP section barrel export.
- MCP retirement contract tests now assert the default startup scripts and Master Prompt integration do not load the old MCP services.
- `backend/routes/dailyWorkoutFormRoutes.mjs`: removed the env-enabled MCP URL call path; legacy schema fields are still marked processed without contacting retired servers.
- `backend/utils/monitoring/mcpHealthManager.mjs`: rewritten as a no-poll retired compatibility layer.
- `backend/services/monitoring/MCPAnalytics.mjs`: blocked env-var reactivation of real-time MCP polling.
- `frontend/src/config/env-config.ts` and `.env.example`: removed frontend MCP URL reads/defaults and documented disabled legacy flags.

## Archived Files

| Original path | Archive path | Classification |
| --- | --- | --- |
| `backend/routes/masterPrompt/mcpCentric.mjs` | `archive/pending-deletion/2026-05-15/mcp-retirement/backend/routes/masterPrompt/mcpCentric.mjs` | Legacy route subtree, no longer imported by active Master Prompt routes |
| `backend/services/mcp/MCPHealthChecker.mjs` | `archive/pending-deletion/2026-05-15/mcp-retirement/backend/services/mcp/MCPHealthChecker.mjs` | Legacy server monitor, no longer imported by active backend runtime |
| `backend/services/mcp/MCPMetricsCollector.mjs` | `archive/pending-deletion/2026-05-15/mcp-retirement/backend/services/mcp/MCPMetricsCollector.mjs` | Legacy server monitor, no longer imported by active backend runtime |
| `backend/services/mcp/MCPServerMonitor.mjs` | `archive/pending-deletion/2026-05-15/mcp-retirement/backend/services/mcp/MCPServerMonitor.mjs` | Legacy server monitor, no longer imported by active backend runtime |
| `backend/tests/masterPromptIntegrationTest.mjs` | `archive/pending-deletion/2026-05-15/mcp-retirement/backend/tests/masterPromptIntegrationTest.mjs` | Legacy manual MCP integration test |
| `frontend/src/components/McpDashboard.tsx` | `archive/pending-deletion/2026-05-15/mcp-retirement/frontend/src/components/McpDashboard.tsx` | Dormant MCP dashboard, no live route import |
| `frontend/src/components/ui/McpIntegrationWrapper.tsx` | `archive/pending-deletion/2026-05-15/mcp-retirement/frontend/src/components/ui/McpIntegrationWrapper.tsx` | Dormant MCP dashboard dependency |
| `frontend/src/components/ui/McpMonitor.tsx` | `archive/pending-deletion/2026-05-15/mcp-retirement/frontend/src/components/ui/McpMonitor.tsx` | Dormant MCP dashboard dependency |
| `frontend/src/components/ui/McpStatusDot.tsx` | `archive/pending-deletion/2026-05-15/mcp-retirement/frontend/src/components/ui/McpStatusDot.tsx` | Dormant sidebar status widget; only referenced by already-archived dead sidebar |
| `frontend/src/components/ui/McpStatusIndicator.tsx` | `archive/pending-deletion/2026-05-15/mcp-retirement/frontend/src/components/ui/McpStatusIndicator.tsx` | Dormant MCP status widget; only active consumer was dormant MCP dashboard |
| `frontend/src/components/DashBoard/Pages/admin-dashboard/sections/MCPServersSection.tsx` | `archive/pending-deletion/2026-05-15/mcp-retirement/frontend/src/components/DashBoard/Pages/admin-dashboard/sections/MCPServersSection.tsx` | Legacy admin MCP management section, no canonical route import |
| `frontend/src/services/mcp/utils/mcp-error-handler.ts` | `archive/pending-deletion/2026-05-15/mcp-retirement/frontend/src/services/mcp/utils/mcp-error-handler.ts` | Dormant helper after compatibility README cleanup |
| `frontend/src/services/mcpApis.ts` | `archive/pending-deletion/2026-05-15/mcp-retirement/frontend/src/services/mcpApis.ts` | Legacy mock MCP API module; only referenced by already-archived dead dashboard |
| `frontend/src/utils/mcp-auth.ts` | `archive/pending-deletion/2026-05-15/mcp-retirement/frontend/src/utils/mcp-auth.ts` | Dormant auth helper used by archived MCP dashboard widgets |
| `frontend/src/utils/mcpIntegrationTest.ts` | `archive/pending-deletion/2026-05-15/mcp-retirement/frontend/src/utils/mcpIntegrationTest.ts` | Dormant MCP test utility |
| `frontend/src/mcp/` | `archive/pending-deletion/2026-05-15/mcp-retirement/frontend/src/mcp/` | Dormant Redux MCP integration notes/code |
| `scripts/development/START-ALL-MCP-SERVERS.bat` | `archive/pending-deletion/2026-05-15/mcp-retirement/scripts/development/START-ALL-MCP-SERVERS.bat` | Legacy MCP launcher, removed from root npm startup scripts |
| `scripts/check-mcp-health.js` | `archive/pending-deletion/2026-05-15/mcp-retirement/scripts/check-mcp-health.js` | Legacy MCP health checker, no longer required by P0 verification script |
| `backend/scripts/fix-workout-mcp-imports.mjs` | `archive/pending-deletion/2026-05-15/mcp-retirement/backend/scripts/fix-workout-mcp-imports.mjs` | Legacy repair script for archived Python MCP servers |

## Quarantined Outside The Repo

The saved AI Studio export was removed from `frontend/public`, then scanned before keeping it in the repo archive. The scanner found a credential-shaped Google API key pattern, so the raw saved export was moved outside the repo instead of being re-committed.

| Original path | Local quarantine path | Classification |
| --- | --- | --- |
| `frontend/public/MCP Server Username Replacemen _ Google AI Studio.html` | `C:\tmp\swan-mcp-public-export-quarantine-2026-05-15\MCP Server Username Replacemen _ Google AI Studio.html` | Removed from deployable public assets; raw copy quarantined outside repo because secret scan flagged it |
| `frontend/public/MCP Server Username Replacemen _ Google AI Studio_files/` | `C:\tmp\swan-mcp-public-export-quarantine-2026-05-15\MCP Server Username Replacemen _ Google AI Studio_files\` | Removed from deployable public assets; raw copy quarantined outside repo |

## Not Archived

- `backend/routes/mcpRoutes.mjs`, `backend/routes/adminMcpRoutes.mjs`, and `backend/routes/adminEnterpriseRoutes.mjs` stay active as fail-closed compatibility routes.
- `backend/utils/monitoring/mcpHealthManager.mjs` and `backend/services/monitoring/MCPAnalytics.mjs` stay active as fail-closed retired monitoring compatibility layers.
- `frontend/src/services/mcp/*`, `frontend/src/hooks/use*Mcp*.ts`, and `frontend/src/services/gamificationMCPService.ts` stay active because current components still import those compatibility names; they are REST-backed or fail-closed.
- Historical docs mentioning MCP remain for a later documentation cleanup pass.
