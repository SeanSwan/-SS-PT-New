# MCP System Map

**Assessed:** 2026-02-12
**Purpose:** Map all MCP dependencies for safe decommission

---

## Architecture Overview

External Python MCP servers (workout, gamification, nutrition, alternatives, yolo) were designed to run on
separate ports (8000-8005). They are NOT deployed in production — all features have been migrated to in-app
implementations. The MCP infrastructure remains in the codebase and generates log noise every 60 seconds.

---

## Log Noise Source Chain

```
server.mjs
  └─ core/routes.mjs (line 124)
       └─ masterPrompt/index.mjs
            └─ masterPrompt/ethicalAI.mjs
                 ├─ EthicalAIReview.mjs → imports mcpHealthManager (singleton created)
                 └─ EthicalAIPipeline.mjs → imports MCPAnalytics → imports mcpHealthManager
```

**On import**, `mcpHealthManager` singleton constructor calls `startMonitoring()` which creates a
`setInterval` every 60s that HTTP-GETs `localhost:8000-8005`. All 5 fail with ECONNREFUSED, generating:

- `MCP service unavailable: workout` (warn)
- `MCP service unavailable: gamification` (warn)
- `MCP service unavailable: nutrition` (warn)
- `MCP service unavailable: alternatives` (warn)
- `MCP service unavailable: yolo` (warn)
- `MCP alerting skipped for <server>: expected production unavailability` (debug)
- `Health check completed for all MCP servers` (info)

Total: **~12 log lines every 60 seconds = ~17,280 noise lines per day**

MCPAnalytics also runs a 30s `setInterval` for `generateRealTimeReport()` (low noise, but wasteful).

---

## Backend Files

### Health Check / Monitoring (NOISE SOURCE)
| File | Role | Intervals | Log Noise |
|------|------|-----------|-----------|
| `backend/utils/monitoring/mcpHealthManager.mjs` | Singleton health checker | 60s (prod) / 30s (dev) | HIGH — 12 lines/cycle |
| `backend/services/monitoring/MCPAnalytics.mjs` | Analytics + real-time metrics | 30s report cycle | LOW — empty map iteration |

### Route Handlers (ALREADY HANDLE FALLBACK)
| File | Endpoints | Fallback Behavior |
|------|-----------|-------------------|
| `backend/routes/mcpRoutes.mjs` | `/api/mcp/*` | Returns `production-fallback` when localhost URLs in prod |
| `backend/routes/adminMcpRoutes.mjs` | `/api/admin/mcp-*` | Returns mock/fallback data |
| `backend/routes/masterPrompt/mcpCentric.mjs` | MCP-centric prompt routing | Has error handling |

### Services (IMPORT mcpHealthManager)
| File | Imports | Risk |
|------|---------|------|
| `backend/services/ai/EthicalAIReview.mjs` | `mcpHealthManager` | Triggers singleton |
| `backend/services/ai/pipeline/EthicalAIPipeline.mjs` | `mcpAnalytics` | Triggers both singletons |
| `backend/services/ai/MasterPromptModelManager.mjs` | `mcpAnalytics` | Triggers both singletons |

### Route Registration (core/routes.mjs)
| Line | Mount | Notes |
|------|-------|-------|
| 264 | `app.use('/api/admin', adminMcpRoutes)` | Mounted once |
| 286 | `app.use('/api/admin', adminMcpRoutes)` | **DUPLICATE mount** |
| 312 | `app.use('/api/mcp', mcpRoutes)` | MCP API bridge |

### Python MCP Servers (NOT DEPLOYED)
| Directory | Port | Status |
|-----------|------|--------|
| `backend/mcp_server/workout_mcp_server/` | 8000 | Not running |
| `backend/mcp_server/gamification_mcp_server/` | 8002 | Not running |
| `backend/mcp_server/enhanced_gamification_mcp/` | 8003 | Not running |
| `backend/mcp_server/yolo_mcp_server/` | 8005 | Not running |
| `backend/mcp_server/render_mcp_server/` | — | Not running |

### Database
| File | Impact |
|------|--------|
| `backend/migrations/20250509-add-mcp-fields-to-progress.mjs` | Schema only — DO NOT REMOVE |
| `backend/models/DailyWorkoutForm.mjs` | `mcpProcessed` boolean field — leave in place |

---

## Frontend Files

### Services
| File | Purpose | Fallback |
|------|---------|----------|
| `frontend/src/services/mcp/mcpConfig.ts` | Health check + status | Cached, graceful |
| `frontend/src/services/mcp/workoutMcpService.ts` | Workout API bridge | Mock data fallback |
| `frontend/src/services/mcp/gamificationMcpService.ts` | Gamification API bridge | Mock data fallback |
| `frontend/src/services/mcpApis.ts` | Legacy mock APIs | Already fallback |

### Hooks
| File | Purpose |
|------|---------|
| `frontend/src/hooks/useClientDashboardMcp.ts` | Client dashboard data |
| `frontend/src/hooks/useMcpIntegration.ts` | Global MCP status |
| `frontend/src/hooks/useWorkoutMcp.ts` | Workout data |
| `frontend/src/hooks/useGamificationMcp.ts` | Gamification data |

### UI Components
| File | Purpose | MUI Violation |
|------|---------|---------------|
| `frontend/src/components/ui/McpMonitor.tsx` | Admin health dashboard | Yes |
| `frontend/src/components/ui/McpStatusIndicator.tsx` | Floating status | Yes |
| `frontend/src/components/ui/McpStatusDot.tsx` | Sidebar status dot | Yes |
| `frontend/src/components/ui/McpIntegrationWrapper.tsx` | Error/offline wrapper | No |
| `frontend/src/components/DashBoard/Pages/admin-dashboard/sections/MCPServersSection.tsx` | Admin section | No |
| `frontend/src/components/AIDashboard/AIDashboard.tsx` | AI dashboard | No |

### Config
| File | Key | Current Value |
|------|-----|---------------|
| `frontend/.env.production` | `VITE_ENABLE_MCP_SERVICES` | `true` (should be `false`) |

---

## Deploy Config

### render.yaml — 4 MCP Worker Services
```yaml
swanstudios-mcp-yolo (Python, port 8002)
swanstudios-mcp-workout (Python, port 8001)
swanstudios-mcp-gamification (Python, port 8003)
swanstudios-mcp-render (Python)
```
**Status:** Not actively deployed, but defined in manifest. Should be removed.

### package.json (root)
```json
"start:mcp": "start cmd.exe /K scripts/development/START-ALL-MCP-SERVERS.bat"
```
**Status:** Dev-only script. Low priority cleanup.

---

## Env Vars

| Variable | Location | Current | Target |
|----------|----------|---------|--------|
| `ENABLE_MCP_SERVICES` | Backend runtime | defaults `true` | defaults `false` in prod |
| `ENABLE_MCP_HEALTH_CHECKS` | mcpHealthManager | defaults `true` | defaults `false` in prod |
| `ENABLE_MCP_HEALTH_ALERTS` | mcpHealthManager | defaults `true` | defaults `false` in prod |
| `WORKOUT_MCP_URL` | mcpRoutes.mjs | `localhost:8000` | No change needed (already handled) |
| `GAMIFICATION_MCP_URL` | mcpRoutes.mjs | `localhost:8002` | No change needed |
| `VITE_ENABLE_MCP_SERVICES` | Frontend build | `true` | `false` |

---

## Safe vs Unsafe Changes

### SAFE TO CHANGE (no feature impact)
- Disable health check interval in production (noise source)
- Disable MCPAnalytics real-time monitoring in production
- Set `VITE_ENABLE_MCP_SERVICES=false` in frontend production env
- Remove MCP worker services from render.yaml

### DO NOT CHANGE (required by in-app features or DB)
- Database migration (schema in use)
- `mcpProcessed` model field
- Auth middleware, payment routes, session attribution
- Any route/controller not in the MCP namespace

### DEPRECATE FIRST, REMOVE LATER
- MCP route handlers (keep returning fallback data)
- Frontend MCP services (already have mock fallback)
- MCP UI components (can be hidden via flag)
