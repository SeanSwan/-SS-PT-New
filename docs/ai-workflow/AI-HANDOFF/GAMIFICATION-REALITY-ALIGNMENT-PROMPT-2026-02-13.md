# Gamification Reality Alignment Prompt (2026-02-13)

Use this prompt with Claude for SwanStudios gamification alignment work.

```md
You are the implementation engineer for SwanStudios. Treat this as a production-hardening + feature-alignment sprint for gamification.

## Mission
Convert our old gamification strategy doc (written ~7 months ago) into a production-accurate implementation plan and code changes that match the CURRENT app architecture, with zero breaking changes.

## Required First Reads (Before Any Code)
1. docs/ai-workflow/gamification/GAMIFICATION-IDEA-VAULT-v1.md
2. docs/ai-workflow/gamification/gamification-rewards.catalog.v1.json
3. docs/ai-workflow/gamification/GAMIFICATION-ENHANCED-INTEGRATION-PLAN-v3.0.md

## Critical Context (Current Truth)
- MCP servers are decommissioned in production. Do NOT re-introduce external MCP dependencies.
- Production defaults keep MCP disabled:
  - backend/routes/mcpRoutes.mjs
  - backend/utils/monitoring/mcpHealthManager.mjs
  - backend/services/monitoring/MCPAnalytics.mjs
  - frontend/.env.production (VITE_ENABLE_MCP_SERVICES=false)
- Active gamification API surface is /api/v1/gamification/* via backend/routes/gamificationV1Routes.mjs.
- Frontend contains legacy/mixed gamification paths (some MCP wrappers, some mock UI, some real API).
- Package names changed over time; never hardcode package names from old docs. Discover from DB/API.
- Keep auth/payment/session integrity untouched (no regressions to login, RBAC, checkout, session grants).

## Objectives
1. Audit and map current gamification reality (backend + frontend + docs), including stale MCP references.
2. Produce an updated gamification architecture aligned to current in-app backend (no MCP server dependency).
3. Implement a minimal, production-ready gamification flow end-to-end:
   - points
   - achievements
   - challenges
   - leaderboard
   - reward redemption
4. Remove or isolate dead/legacy MCP gamification paths without breaking active UI.
5. Align all achievements/rewards to the new vault + catalog format (legacy ID continuity preserved).
6. Align gamification with SwanStudios values:
   - diversity, positivity, safety
   - no toxic or predatory reward loops
   - NASM-aware safety constraints in fitness challenge logic
7. Add documentation + tests + smoke verification.

## Non-Negotiables
- No destructive git operations.
- No force reset / force push.
- No breaking API changes for existing consumers.
- Backward-compatible response shapes where currently used.
- Keep privacy/RBAC strict:
  - no leaking private user data in leaderboard/social
  - enforce role and ownership checks
  - rate-limit abuse-prone actions (point farming, challenge spam).

## Execution Plan
### Phase 1: Reality Audit
- Build an inventory of gamification entry points:
  - backend routes/controllers/models/services
  - frontend pages/hooks/services/slices
  - docs that are stale vs current
- Mark each item as:
  - ACTIVE
  - LEGACY (still referenced)
  - DEAD (safe to deprecate/archive)
- Explicitly identify MCP-era leftovers still in active paths.
- Cross-check current unlock logic and metric availability against `gamification-rewards.catalog.v1.json`.

### Phase 2: Architecture Alignment
- Create/update a single source-of-truth gamification blueprint:
  - canonical API endpoints (use /api/v1/gamification)
  - event flow for points/achievements/challenges/rewards
  - security model (RBAC/ownership/rate limits/auditability)
  - ethical guardrails (burnout prevention, no manipulative loops)
- Include a migration/deprecation map from MCP-era frontend calls to in-app APIs.
- Define the metric dictionary used by unlock rules (e.g., `points_total`, `qualified_referrals_count`, `activity_streak_days`) and map each metric to an actual table/query/service source.

### Phase 3: Implementation (No Breaking Changes)
- Wire frontend gamification views to canonical in-app APIs.
- Replace mock data in active admin/client gamification views with real backend data where feasible.
- Keep any non-routed legacy components behind explicit feature flags or mark deprecated.
- Ensure package/reward logic is data-driven (from DB/API), not hardcoded by old names.
- Implement only `phase: mvp` catalog entries first. Keep non-MVP entries disabled.

### Phase 4: Verification
- Backend tests + targeted gamification tests.
- Frontend build and targeted gamification UI tests.
- Production-safe smoke checklist:
  - /api/health
  - /api/v1/gamification core endpoints
  - /api/mcp/health remains disabled/fallback behavior
  - auth/RBAC/payment/session flows still pass.

### Phase 5: Documentation Deliverables
Create/update:
- docs/ai-workflow/gamification/GAMIFICATION-REALITY-ALIGNMENT-2026-02.md
- docs/ai-workflow/gamification/GAMIFICATION-MCP-DEPRECATION-MAP.md
- docs/ai-workflow/gamification/GAMIFICATION-PRODUCTION-ACCEPTANCE-CHECKLIST.md
- docs/ai-workflow/gamification/GAMIFICATION-CHANGELOG-2026-02.md
- docs/ai-workflow/gamification/GAMIFICATION-IDEA-VAULT-v1.md
- docs/ai-workflow/gamification/gamification-rewards.catalog.v1.json

## Acceptance Criteria
- No active gamification UX path depends on external MCP servers.
- Canonical frontend gamification path uses /api/v1/gamification endpoints.
- Legacy MCP gamification calls are removed from active paths or safely gated.
- Catalog-driven unlock logic exists for MVP entries, with tested metric mapping.
- Tests/build pass.
- No regression in auth, RBAC, checkout, sessions.
- Docs reflect current architecture (not 7-month-old assumptions).

## Output Format Required
1. Findings first (severity-ranked, with file references).
2. Exact files changed.
3. Test/build output summary.
4. Remaining risks and follow-up queue.
5. Rollback-safe notes (revert-only guidance).
```
