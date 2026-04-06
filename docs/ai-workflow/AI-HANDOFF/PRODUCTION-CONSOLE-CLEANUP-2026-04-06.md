# Production Console Cleanup - 2026-04-06

> PURPOSE: Capture the production console-noise cleanup, validation, and a compact review prompt for Claude.
> AUTHOR: Codex | LAST MODIFIED: 2026-04-06
> STATUS: Implemented locally and validated. Review only.

## Task

Clean up the remaining production console noise reported after the earlier admin-overview/error pass:

- `PerformanceTierProvider.tsx:105 [PerformanceTier] Device capable -> enhanced`
- `spaRoutingFix.js:11 SPA Service Worker registered: ...`
- repeated Oracle `/api/oracle/news` cancelation errors
- repeated `/api/gamification/activity-feed` `500`

## Scope Of This Pass

This pass only changed the frontend loggers that were still writing directly to the browser console:

- `frontend/src/core/perf/PerformanceTierProvider.tsx`
- `frontend/src/utils/spaRoutingFix.js`
- `frontend/src/core/perf/PerformanceTierProvider.test.tsx`
- `frontend/src/utils/spaRoutingFix.test.ts`

The Oracle cancelation suppression and activity-feed backend fix were already present locally before this pass and were not reworked here.

## Root Cause

### 1. Performance tier diagnostics bypassed the shared production-safe logger
- `PerformanceTierProvider.tsx` used direct `console.info(...)`.
- That made capability-detection diagnostics visible in production even though the repo already has `frontend/src/utils/logger.ts` to suppress non-error logs outside development.

### 2. SPA routing diagnostics used a file-local console-backed logger
- `spaRoutingFix.js` defined its own `logger` object backed by `console.log`, `console.warn`, and `console.error`.
- That bypassed the same production-safe logging policy and surfaced informational service-worker/routing messages in production.

## What Changed

### Frontend
- `PerformanceTierProvider.tsx`
  - switched all performance-tier diagnostic messages to the shared `logger.log(...)`
  - normalized the diagnostic strings to ASCII `->`
- `spaRoutingFix.js`
  - replaced the file-local console-backed logger with the shared `src/utils/logger.ts`
- Added focused Vitest coverage so these files fail if they go back to direct `console.info` / `console.log` usage

## Exact References

- `frontend/src/core/perf/PerformanceTierProvider.tsx:4`
- `frontend/src/core/perf/PerformanceTierProvider.tsx:63`
- `frontend/src/core/perf/PerformanceTierProvider.tsx:101`
- `frontend/src/core/perf/PerformanceTierProvider.tsx:119`
- `frontend/src/utils/spaRoutingFix.js:10`
- `frontend/src/utils/spaRoutingFix.js:93`
- `frontend/src/utils/spaRoutingFix.js:161`
- `frontend/src/core/perf/PerformanceTierProvider.test.tsx:61`
- `frontend/src/utils/spaRoutingFix.test.ts:30`

## Validation

### Passed
- `cd frontend && npx vitest run src/core/perf/PerformanceTierProvider.test.tsx src/utils/spaRoutingFix.test.ts`
- `cd frontend && npm run build`

### Notes
- The frontend build still emits the pre-existing chunk-size warnings and dynamic-import warnings. This pass did not target bundle splitting.
- The Oracle cancelation noise and activity-feed `500` path were already covered by the earlier handoff below.

## Related Handoffs

- `docs/ai-workflow/AI-HANDOFF/PHASE-1-9-AUDIT-2026-04-05.md`
- `docs/ai-workflow/AI-HANDOFF/PHASE-1-9-AUDIT-FOLLOWUP-FIXES-2026-04-06.md`
- `docs/ai-workflow/AI-HANDOFF/ADMIN-OVERVIEW-CONSOLE-ERRORS-2026-04-06.md`

## Claude Review Prompt

Review only. Do not edit code.

Inspect these files:

- `frontend/src/core/perf/PerformanceTierProvider.tsx`
- `frontend/src/utils/spaRoutingFix.js`
- `frontend/src/core/perf/PerformanceTierProvider.test.tsx`
- `frontend/src/utils/spaRoutingFix.test.ts`
- `frontend/src/utils/logger.ts`

Confirm or challenge these claims:

1. `PerformanceTierProvider.tsx` no longer writes diagnostics directly to `console.info` and now respects the repo's production-safe logger policy.
2. `spaRoutingFix.js` no longer uses a file-local console-backed logger and now routes informational service-worker/routing logs through the shared logger.
3. The new tests are meaningful and would fail if either file reverted to direct browser console logging.
4. Runtime behavior is unchanged apart from suppressing non-error production console noise.
5. Any remaining concerns should be findings only. Do not fix code.

Append this prior context when reviewing so the task stays connected to the larger audit thread:

### Appendix - Phase 1-9 Audit Context

- Prior phase audit file: `docs/ai-workflow/AI-HANDOFF/PHASE-1-9-AUDIT-2026-04-05.md`
- Prior follow-up fix file: `docs/ai-workflow/AI-HANDOFF/PHASE-1-9-AUDIT-FOLLOWUP-FIXES-2026-04-06.md`
- Earlier console/runtime fix file: `docs/ai-workflow/AI-HANDOFF/ADMIN-OVERVIEW-CONSOLE-ERRORS-2026-04-06.md`

Compact scope reminder:

- Phase 1: dark navy default theme + 4 new themes
- Phase 2: homepage UX overhaul with `useAnimationTier` and animation components
- Phase 3: about page refactor
- Phase 4: `AI` -> `Swan Coach` rebrand
- Phase 5: Canada immigration tab refactor
- Phase 6: workout logging speed optimization
- Phase 7: admin overview KPI dashboard
- Phase 8: marketing dashboard workspace
- Phase 9: security intelligence workspace

Known non-issues carried forward:

- retired `spiritName` code is deferred cleanup
- `frontend` `tsc --noEmit` OOM is a known project-wide issue, not a regression from this task
- the Vite chunk-size warning is pre-existing and not the target of this pass
