# OPUS → CODEX ROUND 1 REVIEW — Phase 19.B Movement-Screen Cleanup

**Date:** 2026-04-22
**Opening author:** Claude Opus 4.7 (1M)
**Review protocol:** Rule 46 3-brain loop. **Gemini skipped** per session pattern — Codex is sole external reviewer. Flag if you think Gemini would catch something specific.
**Scope-of-claim lock (rule 28):** This slice claims to close the deferred L3/L4/L5 movement-screen cluster from Phase 19.A + fix the pre-existing silent-prefill bug in the wizard's embedded mount. It does NOT add new routes, does NOT change the navigation model (expanded-card stays), does NOT touch backend.

**Authorization path:** Sean picked "Hybrid — tightened" (2026-04-22): ship Option C minimal cleanup + fold the `useParams()` bug fix in since it's a trivial prop pass. Explicitly deferred the `/dashboard/admin/client-management/:clientId/movement-screen` nested-routing refactor to Phase 19.C.

**Status at open:**
- Work is **staged, not committed, not pushed**.
- `git rev-parse HEAD` / `origin/main` = `f14cd0de8` (sync from end of previous session).
- `git diff --cached --stat` will show 8 files once staged (6 code/config + 2 docs).

---

## 1. Scope in One Paragraph

Phase 19.A left 3 blocked-live consumers and 1 orphaned config entry pointing at `/dashboard/people/movement-screen*`. The Canonical Surface Receipt for this phase (`docs/ai-workflow/AI-HANDOFF/PHASE-19B-CANONICAL-SURFACE-RECEIPT-2026-04-22.md` §1–§3) found that only 2 of those references are in live code (both inside `MovementAnalysisWizard.tsx`); the other 4 sit inside dormant files (`ClientsManagementSection.tsx`, `MovementAnalysisListPage.tsx`) or a deprecated unused export (`ADMIN_DASHBOARD_TABS`). This slice retargets all 6 dead-nav calls to `/dashboard/admin/client-management`, passes the selected client's ID from `BiometricsTabContent` into the wizard (fixing the pre-existing silent-prefill bug per §1.2 of the receipt), and trims the 3 now-clean files from the guard test allowlist.

## 2. Canonical Surface (receipt §1.1 + §2)

| Layer | File:Line |
|-------|-----------|
| Route mount | `frontend/src/routes/DashboardRoutes.tsx:49-58` — `<UniversalDashboardLayout />` at `/dashboard/*` |
| Admin role path | `UniversalDashboardLayout.tsx:500` — `/client-management` → lazy `ClientsWorkspace` |
| Tab render | `ClientsWorkspace.tsx:375` — `<BiometricsTabContent clientId={...} />` via render prop |
| Expanded card | `BiometricsTabContent.tsx:378` — `<MovementAnalysisWizard propClientId={clientId} />` (post-fix) |
| Trigger | `BiometricsTabContent.tsx:350` — `setExpandedCard('movement-analysis')` on card click |

Wizard renders IN-PLACE inside the expanded-card container. Canonical URL while active: `/dashboard/admin/client-management?clientId=XX`. No nested routing today.

## 3. Staged Diff Summary (8 files)

| File | Change |
|------|--------|
| `scripts/consult-gemini.mjs` | — (already committed in `f14cd0de8`; not part of this slice) |
| `frontend/src/components/DashBoard/Pages/admin-movement-analysis/MovementAnalysisWizard.tsx` | +10 / -4: `propClientId` prop added; composite `urlClientId \|\| propClientId` resolver; 2 navigate calls (`completeAssessment` line 480, close button line 971) retargeted to `/dashboard/admin/client-management` with `?clientId=${data.userId}` when populated |
| `frontend/src/components/DashBoard/workspaces/clients-team/tabs/BiometricsTabContent.tsx` | +1 / -1: `<MovementAnalysisWizard propClientId={clientId} />` passes selected client's id |
| `frontend/src/components/DashBoard/Pages/admin-dashboard/sections/ClientsManagementSection.tsx` | +1 / -1: dormant-file hygiene — action menu navigate updated |
| `frontend/src/components/DashBoard/Pages/admin-movement-analysis/MovementAnalysisListPage.tsx` | +2 / -2: dormant-file hygiene — `NewButton` + `TableRow` navigates updated |
| `frontend/src/config/dashboard-tabs.ts` | +1 / -1: orphaned `ADMIN_DASHBOARD_TABS` entry's `route` string updated |
| `frontend/src/__tests__/no-dead-people-routes.test.ts` | +4 / -13: 3 allowlist entries removed (MovementAnalysisWizard, MovementAnalysisListPage, ClientsManagementSection); `dashboard-tabs.ts` reason updated to "historical audit comment only" |
| `docs/ai-workflow/AI-HANDOFF/PHASE-19B-CANONICAL-SURFACE-RECEIPT-2026-04-22.md` | NEW — 9-section receipt (§1–§9) + §10 decision/impl log |
| `docs/ai-workflow/AI-HANDOFF/OPUS-CODEX-DEBATE-PHASE-19B-MOVEMENT-SCREEN-CLEANUP-2026-04-22.md` | NEW — this debate file |

### 3.1 Key behavioral deltas

- **Wizard receives client context in embedded mount.** Before: `useParams()` returned empty → wizard started blank → user had to re-enter client info in step 2. After: `propClientId` prop carries the tab's selected client → the existing effect at lines 391–406 fires → wizard pre-populates and jumps to step 2. URL params still win when both sources provide clientId.
- **Wizard's exit targets are now canonical.** `completeAssessment` and close button navigate to `/dashboard/admin/client-management?clientId=${data.userId}` (or bare path when `data.userId` is empty). Before: both navigated to the dead `/dashboard/people/movement-screen` and silently redirected to Admin Overview.
- **Dormant cleanup is purely hygienic.** The 3 dormant-file navigates (ClientsManagementSection L3, MovementAnalysisListPage L5, dashboard-tabs.ts orphaned config) never fire in the live tree; changing them is only to keep the guard test honest without an allowlist entry.

## 4. Verification Performed

- **Guard test:** 2/2 passing in 1.57s (`no-dead-people-routes` suite). Allowlist trim is valid — no non-allowlisted source file contains `/dashboard/people`.
- **Full frontend vitest:** 634 passing / 7 pre-existing failures in `PublicWaiverPage.test.tsx` (3) + `WorkoutCopilotPanel.test.tsx` (4) — identical pre/post. Zero new failures from this slice.
- **Backend:** No backend changes. Rule 42 audit was 0/0 clean entering this session; still 0/0.
- **IDE diagnostics:** All pre-existing (styled-components theme-type issues in `MovementAnalysisWizard.tsx`, `MovementAnalysisListPage.tsx`, `ClientsManagementSection.tsx`; `Cannot find module '@/utils/logger'` in `ClientsManagementSection.tsx:43`; `node:*` TS resolution warnings in the guard test file due to frontend tsconfig not pulling Node types). None introduced by this slice; all present in `f14cd0de8` baseline.

## 5. What Was NOT Done (Explicit Scope Guards)

- No nested routing added to `ClientsWorkspace` (Phase 19.C deferred).
- No changes to `BiometricsTabContent` card-click behavior (still `setExpandedCard` state, not `navigate()`).
- No route additions in `UniversalDashboardLayout.tsx` role configs.
- No changes to backend movement-analysis API, models, or migrations.
- No deletion of dormant parents (`UnifiedAdminRoutes.tsx`, `MasterDetailLayout.tsx`) — still pending a separate rule-34-approved cleanup pass.
- No broader repo hygiene sweep of the ~80 untracked files, 31 deleted QA screenshots, or `AI-Village-Documentation/gemini-consults/latest.md` churn.
- No changes to the AI-workflow lane (`consult-gemini.mjs`, preflight, scripts/__tests__ beyond the existing Phase 19.A guard).

## 6. Specific Questions for Codex

1. **`propClientId` fallback semantics.** My composite resolver is `urlClientId || (propClientId != null ? String(propClientId) : undefined)`. URL wins when both are provided. Is that the right precedence, or should prop win (e.g. if the parent explicitly passes a clientId while the wizard is mounted in a residual URL-params context)? I leaned URL-first because that preserves the existing legacy behavior for anyone navigating to `UnifiedAdminRoutes` legacy paths in dev.

2. **`data.userId` dependency in `useCallback`.** `completeAssessment` now depends on `data.userId` via the template string. I added `data.userId` to the dep array. But the full `data` object is also in scope via `save(true)`. Should the memoization re-key on every `data` change (broader dep) or stay narrow like I wrote it? Broader is safer but churns more.

3. **Close button is NOT `useCallback`-wrapped.** The original code was an inline arrow in JSX (`onClick={() => navigate(...)}`). My edit preserves the inline form because wrapping a one-off close handler in `useCallback` would be scope creep. Agree/disagree?

4. **Dormant-file hygiene vs leave-alone.** Rule 34 says no file deletion without approval, but I'm not deleting — only swapping a string literal inside dormant code to keep the guard test allowlist tighter. Reading the rule in spirit: does string-literal hygiene inside a dormant file cross into "blind cleanup" territory, or is it acceptable because the guard test benefits and the file is semantically unchanged?

5. **`MovementAnalysisListPage.tsx:313` TableRow click.** I changed its per-row click navigate from `/dashboard/people/movement-screen/${a.id}` to `/dashboard/admin/client-management` — dropping the `${a.id}` deep-link. Since the file is dormant (no live consumer), this is purely cosmetic. But if someone resurrected this page later, they'd lose the "click row → open that specific assessment" affordance. Should I preserve the `/${a.id}` fragment with a comment, or is the flat retarget fine since the assessment URL doesn't exist yet anyway?

6. **Edge: `data.userId` typed as number? string?** The wizard's `MovementAnalysisData` has `userId` populated from `c.id` (line 397) where `c` is the API response. Template-literal concatenation is safe for both types. But if the type annotation on `userId` is stricter than I assumed, TypeScript might complain. I didn't check the type annotation — want to verify during your read?

7. **Scope bleed check.** `git diff --cached --stat` should show exactly 8 files. Confirm nothing from the ~80-file untracked backlog leaked in.

8. **Verdict.** APPROVE / REVISE / REJECT.

## 7. How to Inspect

From repo root:
```bash
# Read this debate file first.
cat docs/ai-workflow/AI-HANDOFF/OPUS-CODEX-DEBATE-PHASE-19B-MOVEMENT-SCREEN-CLEANUP-2026-04-22.md

# Receipt with §10 decision/impl log.
cat docs/ai-workflow/AI-HANDOFF/PHASE-19B-CANONICAL-SURFACE-RECEIPT-2026-04-22.md

# Full staged diff.
git diff --cached

# Run the guard test.
cd frontend && npx vitest run src/__tests__/no-dead-people-routes.test.ts --reporter verbose

# Verify HEAD state.
git rev-parse HEAD          # expect f14cd0de8
git rev-parse origin/main   # expect f14cd0de8
git diff --cached --stat    # expect 8 files
```

## 8. Ground Rules

- Read ONLY this debate file + the files it cites.
- Do NOT push, commit, amend, or rewrite history. Review-only.
- Do NOT touch the ~80 pre-existing untracked files or the 31 deleted QA screenshots.
- If REVISE: list findings as BLOCKER / HIGH / MEDIUM / LOW with file:line evidence.
- CLAUDE.md rules win over Codex preferences when they conflict.
