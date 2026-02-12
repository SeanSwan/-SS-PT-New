# MCP Decommission Plan

**Date:** 2026-02-12
**Classification:** Critical (touches monitoring + config)
**Rollback-ready commit:** `0c59fbd3`
**Security floor:** Never roll back past `714cfa03`

---

## Problem Statement

Legacy MCP server infrastructure generates ~17,280 noise log lines per day in production.
Five Python MCP servers (workout, gamification, nutrition, alternatives, yolo) are NOT deployed,
but the Node.js backend still runs health checks against localhost every 60 seconds, producing
`MCP service unavailable` warnings for each server.

All MCP-backed features have been migrated to in-app implementations. The MCP code paths are
dead weight causing log pollution and wasted CPU cycles.

---

## Execution Phases

### Phase A: Disable MCP Runtime (backend code changes)

**Goal:** Stop all MCP health-check intervals and external HTTP calls in production.
**Mechanism:** Make `ENABLE_MCP_SERVICES` the single master kill switch. Default to OFF in production.

**Files changed:**
1. `backend/utils/monitoring/mcpHealthManager.mjs`
   - Change `enableHealthChecks` and `enableHealthAlerting` to default OFF in production
   - Check `ENABLE_MCP_SERVICES` as master switch
   - Result: No more `setInterval` health checks, no HTTP calls to localhost

2. `backend/services/monitoring/MCPAnalytics.mjs`
   - Gate `startRealTimeMonitoring()` behind same flag
   - Result: No more 30s report cycle

**Risk:** LOW — health checks were already failing silently with fallback data.
**Rollback:** `git revert` the commit.

### Phase B: Clean Frontend Config

**Goal:** Stop frontend from attempting MCP health checks and displaying stale MCP status.

**Files changed:**
1. `frontend/.env.production` — Set `VITE_ENABLE_MCP_SERVICES=false`

**Risk:** LOW — frontend MCP services already have mock/fallback data when disabled.
**Rollback:** Change back to `true` and redeploy.

### Phase C: Clean Deploy Config

**Goal:** Remove MCP worker service definitions from Render manifest.

**Files changed:**
1. `render.yaml` — Remove 4 MCP worker service definitions

**Risk:** LOW — services are not running. Removing prevents accidental cost if Render tries to spin them up.
**Rollback:** Re-add the YAML blocks.

### Phase D: Documentation

**Deliverables:**
1. `MCP-SYSTEM-MAP.md` — Full dependency map (this doc's companion)
2. `MCP-REMOVAL-CHANGELOG.md` — What changed and why
3. Update `POST-DEPLOY-SMOKE-RESULTS.md` with post-decommission smoke
4. Update `SECURITY-REGRESSION-TRACKER.md` confirming no security regressions

---

## No-Breaking-Change Guardrails

| Protected Area | Verification |
|----------------|-------------|
| Payment/session attribution | Stripe webhook, session grant logic untouched |
| Auth token/security fixes | authController.mjs, authMiddleware.mjs untouched |
| Routes used by in-app features | MCP routes still respond with fallback data |
| Database schema | Migration file and model fields preserved |
| Frontend features | Mock/fallback data still returned when MCP disabled |

---

## Validation Plan

### Automated
- `cd backend && npm test` — existing test suite
- `cd frontend && npx vitest run` — frontend tests

### Playwright Production Smoke (after deploy)
1. `/api/health` — healthy, DB connected, store ready
2. Admin dashboard load
3. Login/logout (admin, trainer, client)
4. Store packages load, checkout requires auth
5. Session create/book/cancel
6. `/api/mcp/status` — returns `production-fallback` (not error)
7. `/api/mcp/health` — returns `disabled` status (not 500)
8. Verify NO `MCP service unavailable` in Render logs for 5+ minutes

### Security Quick Sweep
- SEC-01: Inactive login blocked
- SEC-02: Active login works
- RBAC-01: Client cannot list users
- PAY-01: Checkout requires auth
- INF-01: Security headers active
