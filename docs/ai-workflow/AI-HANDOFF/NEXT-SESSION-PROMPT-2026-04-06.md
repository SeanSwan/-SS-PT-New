# Next Session Prompt — Phase 4-5 Implementation
## Copy everything below this line and paste as your first message in the new session

---

We're continuing the SwanStudios site refactor. Phases 0-3 are complete and deployed. Read these files to get full context:

**Session state files (read in this order):**
1. `CLAUDE.md` — project protocols (includes Opus-Codex debate protocol)
2. `docs/ai-workflow/AI-HANDOFF/MASTER-FIX-PLAN-2026-04-06.md` — the full fix plan with corrected root causes
3. `docs/ai-workflow/AI-HANDOFF/OPUS-CODEX-DEBATE-2026-04-06.md` — 16-round debate transcript. Scroll to FINAL CONSENSUS for the original plan agreement, then Rounds 10-16 for the Phase 3 debate (all consensus reached).

**What's done (all deployed to production on main):**

Phase 0 — P0 Blockers (commit `ec6fd34b`):
- Sessions 404: added /upcoming/:userId and /history/:userId with IDOR-safe trainer scoping
- Remotion crash: fixed styled-components error #12 (css tagged template for keyframes)
- Movement analysis 500: normalized trainer_assessment enum to admin_dashboard
- Workout plan 500: fixed route shadowing (swapped mount order), removed duplicate CRUD from workoutRoutes
- Equipment scan: graceful 503 fallback when GOOGLE_API_KEY missing, check before rate limiter
- StoreV3: confirmed 0 records in DB — needs data seeding (Sean's decision on packages)
- Mobile builder: 375px/430px breakpoints, 44px touch targets, exerciseName display

Phase 1 — Code Quality + Privacy Audit (commit `0e0b568c`):
- TabErrorBoundary: instance-level reported flag (React 18 Strict Mode guard)
- OUTLET_ROUTES: derived from PILLAR_TABS to prevent route drift
- AuthContext: useMemo on contextValue + useCallback on login/register/updateUser/services
- AI Village privacy audit: removed 5 Chinese models, now 15-brain with 1 Chinese model remaining (MiniMax M2.7 for design debates only)

Phase 2 — Security (verified, zero code changes):
- All 5 security items already in place (boot camp validation, auth rate limiting, helmet/CSP, IDOR middleware, PII stripping)

Phase 3 — UX/Mobile Refactor (commit `b4982295`):
- WCAG contrast tokens: added --text-placeholder, --text-disabled, --text-muted-icon to tokens.css. Bumped --status-error-bg 0.15→0.25
- 9 contrast failures fixed across 7 files (SessionAllocationManager, SmartImage, KeywordResearchWidget, AdminClientManagementView, SocialPostGenerator, EmailDigestBuilder)
- Z-index scale: 9 tiers (--z-dropdown:1260 through --z-celebration:1400) in tokens.css. Migrated 3 extreme outliers (GlobalClientSelector 99999, TimeDropdown 999999, CustomSelect 999999)
- Sidebar close fix: nav-item.tsx was calling nonexistent setIsDashboardDrawerOpened from read-only useMenuState hook. Now uses useMenuActions().handleDrawerOpen(false). Confirmed TS2339 error resolved.
- New ContainedScrollList component: frontend/src/components/ui/ContainedScrollList.tsx — typed generic scroll container with controlled/uncontrolled search, loading skeletons, grid columns, mobile bottom-sheet, 44px touch targets
- UX-4 widget audit (documented, no code): MetricCard unused, SystemHealthPanel duplicated at 2 detail levels
- UX-5 mock data audit (documented, no code): 5 files render fake data on API failure (VulnerabilityScannerPanel, SecurityScoreCard, RecentActivityFeed, RevenueChart, EnterpriseBusinessIntelligenceSuite). Sean wants NO mock data — real API data or clean empty states only. Remediation deferred but flagged.

**What remains — implement these 2 phases:**

Phase 4: Architecture Patterns (Day 5-7)
- ARCH-1: DB transaction locking — LLM API calls NEVER inside database transactions. Pattern: generate outside → open transaction → read → write → commit → close
- ARCH-2: SSE reconnection — new EventSource with lastEventId query param, backend replays missed events from event store
- ARCH-3: Exercise memory SWR — useExerciseMemory hook with optimistic update, conflict guard, isReadOnly during active generation

Phase 5: Design System Lock (Day 6-8)
- DESIGN-1: Design tokens CSS file with locked Crystalline Swan tokens (tokens.css already has foundation from Phase 3 — may need accessible animation tokens: --color-swan-lavender-base, --color-ice-wing-peak)
- DESIGN-2: Thinking indicator — crystalline diamond shimmer (clip-path polygon, NOT rotation). Zero rotation transforms for GPU compositing. Staggered animation: 0s, 0.2s, 0.4s
- DESIGN-3: Coach Assistant chat UI — glassmorphism container (backdrop-filter blur 16px). Coach bubble: Royal Depth bg + Ice Wing left border 3px. User bubble: Carbon bg + Wing Purple right border 3px
- DESIGN-4: Sidebar specs — desktop 380px fixed (Carbon bg, Ice Wing hover border), mobile 85vw/max 360px drawer (drag-handle iOS compliant), 64px item height for touch targets

**Key files to read for Phase 4 implementation:**
- `backend/services/workoutService.mjs` — check for LLM calls inside transactions (ARCH-1)
- `backend/services/` — any service using Sequelize transactions with external API calls
- `frontend/src/` — search for EventSource or SSE usage (ARCH-2)
- `frontend/src/components/WorkoutManagement/` — exercise memory patterns (ARCH-3)

**Protocol reminders:**
- After implementing each phase, write changes to `docs/ai-workflow/AI-HANDOFF/OPUS-CODEX-DEBATE-2026-04-06.md` and ask Sean if Codex should review
- Codex reviews via the shared .md file — Sean relays responses between Opus and Codex
- Continue round numbering from Round 17
- Build test: `cd frontend && npm run build` (tsc --noEmit OOMs on this repo, use Vite build for verification)
- Commit style: `type(scope): description` — push to main for Render auto-deploy

Start with Phase 4.
