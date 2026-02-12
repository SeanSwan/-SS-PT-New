# MCP Decommission Changelog

**Date:** 2026-02-12
**Deploy classification:** Critical (monitoring + config change)

---

## Summary

Disabled legacy MCP server health checks, monitoring intervals, and external service dependencies
in production. All features previously backed by MCP servers have already been migrated to in-app
implementations. This change eliminates ~17,280 noise log lines per day and removes unused Render
worker service definitions.

---

## Files Changed

### Backend

#### `backend/utils/monitoring/mcpHealthManager.mjs`
- **What:** Changed health check and alerting defaults from opt-OUT to opt-IN in production
- **Why:** The 60-second health check interval was HTTP-GETting 5 localhost ports every cycle,
  all returning ECONNREFUSED, generating 12+ warn/debug log lines per cycle
- **How:** Added `ENABLE_MCP_SERVICES` as master switch. In production, health checks now require
  explicit `ENABLE_MCP_HEALTH_CHECKS=true` AND `ENABLE_MCP_SERVICES` not disabled.
  Development behavior unchanged (still opt-out).
- **Risk:** None — health checks were already failing silently with fallback data

#### `backend/services/monitoring/MCPAnalytics.mjs`
- **What:** Gated `startRealTimeMonitoring()` behind same MCP master switch
- **Why:** The 30-second `setInterval` for `generateRealTimeReport()` was running but iterating
  an empty metrics Map (wasteful CPU, minor log noise)
- **How:** Check `ENABLE_MCP_SERVICES` with production-aware defaults before starting interval
- **Risk:** None — no consumers depend on the real-time report EventEmitter in production

### Frontend

#### `frontend/.env.production`
- **What:** Set `VITE_ENABLE_MCP_SERVICES=false`
- **Why:** Frontend was checking MCP health endpoints and displaying stale status indicators
- **How:** Build-time flag, requires redeploy to take effect
- **Risk:** None — frontend MCP services already return mock/fallback data when disabled

### Deploy Config

#### `render.yaml`
- **What:** Removed 3 MCP worker service definitions (yolo, workout, gamification)
- **Why:** Python MCP servers were never deployed in production but remained in the manifest,
  risking accidental cost if Render processed the YAML
- **How:** Replaced service blocks with decommission comment pointing to this plan
- **Risk:** None — services were not running

---

## Files NOT Changed (by design)

| File | Reason |
|------|--------|
| `backend/routes/mcpRoutes.mjs` | Already returns `production-fallback` data gracefully |
| `backend/routes/adminMcpRoutes.mjs` | Returns mock analytics for admin dashboard |
| `backend/controllers/authController.mjs` | Auth logic untouched |
| `backend/webhooks/stripeWebhook.mjs` | Payment logic untouched |
| `backend/migrations/20250509-add-mcp-fields-to-progress.mjs` | Schema in use — never remove |
| `backend/models/DailyWorkoutForm.mjs` | `mcpProcessed` field preserved |
| Frontend MCP services/hooks/components | Still return mock data when disabled |

---

## Expected Production Behavior After Deploy

| Before | After |
|--------|-------|
| 12+ MCP log lines every 60s | Zero MCP health-check log lines |
| `MCP service unavailable: workout` (warn) | `MCP Health Monitoring DISABLED via configuration` (once at startup) |
| `MCP alerting skipped ... expected production unavailability` (debug) | `MCP Analytics real-time monitoring DISABLED` (once at startup) |
| `GET /api/mcp/status` → `production-fallback` | Same (no change) |
| `GET /api/mcp/health` → `disabled` | Same (no change) |
| Frontend MCP status indicators | Disabled (no calls) |

---

## Rollback

```bash
git revert <THIS_COMMIT> --no-edit
git push origin main
# Wait 2-5 min for Render redeploy
# MCP health checks will resume (harmless but noisy)
```

**Security floor:** This commit does NOT touch auth, RBAC, or payment code.
Rolling it back is safe and does not affect the security floor at `714cfa03`.
