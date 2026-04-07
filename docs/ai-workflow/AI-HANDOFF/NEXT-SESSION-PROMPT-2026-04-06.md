# Next Session Prompt — Phase 3-5 Implementation
## Copy everything below this line and paste as your first message in the new session

---

We're continuing the SwanStudios site refactor. Phases 0-2 are complete and deployed. Read these files to get full context:

**Session state files (read in this order):**
1. `CLAUDE.md` — project protocols (includes new Opus-Codex debate protocol)
2. `docs/ai-workflow/AI-HANDOFF/MASTER-FIX-PLAN-2026-04-06.md` — the full fix plan with corrected root causes
3. `docs/ai-workflow/AI-HANDOFF/OPUS-CODEX-DEBATE-2026-04-06.md` — 9-round debate transcript (scroll to FINAL CONSENSUS and Round 9 for current state)

**What's done (deployed to production):**

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
- AI Village privacy audit: removed 5 Chinese models (DeepSeek, StepFun, MiniMax M2.5, Qwen, GLM), now 15-brain with 1 Chinese model remaining (MiniMax M2.7 for design debates only)

Phase 2 — Security (verified, zero code changes):
- All 5 security items already in place (boot camp validation, auth rate limiting, helmet/CSP, IDOR middleware, PII stripping)

**What remains — implement these 3 phases:**

Phase 3: UX/Mobile Refactor (Day 4-7)
- Rolodex pattern: shared ContainedScrollList component for exercise lists, coverage trackers, template browsers
- Contrast audit: WCAG 4.5:1 minimum across dark theme surfaces
- Navigation consistency: standardize drawer/modal close, back-button behavior, z-index stacking
- Dashboard widget consolidation

Phase 4: Architecture Patterns (Day 5-7)
- DB locking: narrow transaction scope, LLM calls NEVER inside transactions
- SSE reconnection: new EventSource with lastEventId, backend event store for replay
- Exercise memory SWR: optimistic update with conflict guard, isReadOnly during generation

Phase 5: Design System Lock (Day 6-8)
- Design tokens CSS file with locked Crystalline Swan tokens
- Thinking indicator: crystalline diamond shimmer (clip-path, not rotation)
- Coach Assistant chat UI: glassmorphism container, coach/user bubble specs
- Sidebar specs: 380px desktop, 85vw mobile drawer

**Protocol reminders:**
- After implementing each phase, write changes to `docs/ai-workflow/AI-HANDOFF/OPUS-CODEX-DEBATE-2026-04-06.md` and ask me if Codex should review
- Codex reviews via the shared .md file — I relay responses between you
- Continue round numbering from Round 10
- AI Village is now 15-brain, privacy-first (see MODELS config in `scripts/validation-orchestrator.mjs`)
- MAX_ROUNDS = 25 for debates in `scripts/lib/recursive-consensus.mjs`

Start with Phase 3.
