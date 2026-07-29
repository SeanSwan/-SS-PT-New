---
decision: "C5: legacy WorkoutExercise/Set writes FROZEN at workoutService (3 lanes excised, ratchet-tested); dead workoutSessionController deleted; read-only drift probe added; 13-chart retirement DEFERRED with evidence (mounted client surface, not zero-consumer)"
status: shipped
supersedes: none
---

# WORKOUT OS — C5 Receipt: Data Convergence (2026-07-29)

Branch `claude/workout-os-build-20260729`. Recon: 5 legacy writers, 8 readers, full receipts in the C5 recon result; §13 HR-14 records the premise corrections.

## Shipped
1. **Write freeze at the service layer** — the three legacy write lanes in `workoutService.mjs` (create :265/:285, update :399-:471, generate :1617/:1631 pre-cut) excised (−177 lines + the orphaned `parseSetScheme`); session-level behavior preserved (session create/update/generate still work; responses now truthfully show `exercises: []` for new sessions). Freeze enforced HERE because the routes are live HTTP surfaces (`POST/PUT /api/workout/sessions*` win the mount-order shadow) even though all 5 frontend callers are dormant — a stale bundle or direct HTTP could re-open the drift. Ratchet: `workoutServiceLegacyWriteFreeze.test.mjs` (zero write calls, 3 freeze markers, readers preserved).
2. **W4 deleted** — `backend/controllers/workoutSessionController.mjs` (124 ln): zero importers (grep receipt + orphan-inventory concurrence).
3. **Reconciliation probe** — `backend/scripts/inspect-workout-set-store-drift.mjs` (read-only, inspect-* idiom): row counts, per-client legacy footprint, legacy-working-sets-without-canonical-counterpart on `(session, LOWER(TRIM(name)), setNumber)`. **Deploy checklist:** run once post-deploy to re-confirm the repo-documented 0-rows finding.

## Deferred with evidence (HR-14)
- **13-chart retirement**: `ClientProgressCharts` is MOUNTED (client `/progress/detailed`, Guardian-gated, single endpoint consumer) — fails §12-C5's own zero-consumer gate. Needs a 13-vs-15 coverage audit first (capability-preservation law). AdminProgressChartsGrid already owns trainer/admin.
- **Trainer formData reader**: `EnhancedClientProgressView` → `/api/workout-forms/client/:id/progress` — the true remaining dual-read-path item; own slice.
- Legacy table DROP: Sean-approved cleanup after the deploy probe confirms 0 rows (Rule 34).

## Gates
Freeze + contract batch 4 files/8 tests; create-session unit + AI command-path 2/4; adjacent canonical-save battery 5 files/38 (confirmation round). `node --check` clean on service + script. Mid-program checkpoint (pre-C5): full tsc exit 0 + vite build ✓.
