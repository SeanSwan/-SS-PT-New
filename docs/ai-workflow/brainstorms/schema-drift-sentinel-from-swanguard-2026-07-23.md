# Proposal: Schema-Drift Sentinel — bring SwanGuard's drift verifier home to SwanStudios

**Date:** 2026-07-23
**Author:** Fable 5 (VS terminal)
**Status:** PROPOSAL — awaiting Sean's go. Not built. Net-new capability → gated on grill-me (Rule 64) + swan-orchestrator (Rule 15) before any code.
**Origin:** Sean, 2026-07-23 — "why don't we just build this and make it part of our system as our own tool to help our system be smoother and work better." (Referring to the migration/schema gap I flagged in SwanGuard.)

---

## The honest reframe (what I got wrong, then right)

1. **First I claimed SwanGuard had "no migrations."** Wrong — it has 23 checked-in migrations + a runner. Corrected in the Codex packet §6.
2. **Then the idea became "bring the migration tool to SwanStudios."** Also not quite right — **SwanStudios already has 309 Sequelize migrations + `sequelize-cli db:migrate`.** It is not missing a way to *apply* schema.

**What SwanStudios is actually missing** (verified 2026-07-23 by grep):
- **No systematic drift *verification*.** Instead there is a growing pile of **reactive, hand-written one-offs**: `fix-cart-schema.mjs`, `fix-storefront-schema.mjs`, `emergency-sessions-fix.mjs`, `inspect-trainer-permissions-schema.mjs`, and per-incident boot guards `schemaGuards/phase15ExerciseNoteGuard.mjs`, `phase16WorkoutSessionIntensityNullGuard.mjs`, etc.
- Each of those exists because a specific drift **already reached production and bit a real user** (that history is literally why Rule 58 exists).

**The tool worth importing is SwanGuard's `schemaVerification.ts` + `schemaManifest.ts`** — the *proactive, generalized* form of those one-off guards. One manifest of expected shape, checked against the live DB at boot, that fails closed with a precise "column X on table Y drifted" message. It replaces the "write a new phaseNNGuard every time we get burned" pattern with a single systematic gate.

---

## What it does (the value in one paragraph)

At backend boot (and as a CI/pre-deploy step), read a **manifest** describing every table + column + type SwanStudios expects, query `information_schema.columns` against the real DB, and **diff**. On any drift — missing column, wrong type, snake_case/camelCase mismatch, missing FK target (the exact 7 drift classes Rule 58 enumerates) — halt with a precise, actionable message *before* a user hits it. This is Rule 58 ("proactive schema-drift detection") turned from a **discipline the AI must remember** into a **deterministic gate the machine enforces every boot**.

---

## Why this is the right "own tool," not scope creep (Rule 62 gate)

- **Attacks the #1 recurring bug class.** Schema drift is the single most-cited root cause in this codebase's incident history (the 2026-05-01 cascade alone shipped 5+ drift fixes in one chain). Every hour spent on `fix-*-schema` firefights is an hour not spent on the product loop.
- **Strengthens the trust surface, not decorative.** Drift = wrong data shown to trainer/client/admin = broken proof-of-value. Catching it pre-user protects the core loop.
- **Retires code, doesn't only add it.** The ~15 ad-hoc `fix-*`/`check-*`/`phaseNNGuard` scripts collapse into one manifest + one verifier. Net line count likely goes *down*.
- **Low learning curve (Sean's constraint).** It's read-only SQL against `information_schema` + a JSON/TS manifest. No new framework, no ORM change, no Sequelize replacement. Sequelize stays exactly as-is; this sits *beside* it as a checker.

---

## Proposed shape (v1 — deliberately minimal)

1. `backend/core/schema-sentinel/manifest.mjs` — declarative expected shape. **Generated once** from the current live DB (so v1 encodes reality, not aspiration — Rule 75 trailhead-truth), then hand-curated.
2. `backend/core/schema-sentinel/verify.mjs` — reads `information_schema.columns` + `table_constraints`, diffs against the manifest, returns a structured drift report (the 7 Rule-58 classes). Read-only. Never mutates the DB.
3. **Boot gate:** fail-closed in production (halt with the drift report), warn-only in dev (so local iteration isn't blocked). Mirrors SwanGuard's `DATABASE_MODE=memory` fail-closed-in-prod posture.
4. **CI/pre-deploy step:** run the verifier against a migrated fresh DB so drift is caught in the pipeline, not at Render boot.
5. **Migration path:** delete `phase15ExerciseNoteGuard` / `phase16...Guard` and fold their assertions into the manifest, one at a time, each with a test proving the sentinel catches the same drift the old guard did.

**Explicitly NOT in v1:** auto-fixing drift (too dangerous — a wrong "fix" mutates prod), generating migrations, or touching how Sequelize applies schema. Detect-and-halt only. Fixing stays human-decided.

---

## Open questions for Sean (grill-me will formalize these)

1. **Boot-halt vs boot-warn in production?** SwanGuard halts. SwanStudios halting on drift = a bad manifest could take down prod. Recommend: **CI/pre-deploy halts** (safe — nothing's live yet), **boot warns loudly + alerts** (so a manifest mistake never causes an outage). Your call — this is the one real risk decision.
2. **Manifest source of truth:** generate from live DB once (my recommendation, encodes reality) vs derive from Sequelize models (encodes intent, but that's exactly the thing that drifts)?
3. **Scope of v1 tables:** all tables, or start with the drift-hotspots (Users/Sessions/Storefront/TrainerPermissions/workout_logs — the ones with `fix-*` scripts)?
4. Is this the next slice after the SwanGuard merge clears, or parked behind the Marketing Command Center (current #1 focus per memory)?

---

## Recommendation

Build it — but **after** the SwanGuard backend merges (don't fork attention mid-review) and **as a properly-gated net-new slice** (grill-me → orchestrator → build → closeout), not a drive-by. It's high-value, low-risk (read-only), retires clutter, and directly institutionalizes Rule 58. The one thing to get right is the boot-halt-vs-warn decision in Q1 — that's a Sean call, not an AI default.

Cross-refs: Rule 58 (proactive schema-drift detection — this is its enforcement engine), Rule 26/29 (canonical surface + schema cross-check artifacts), the `fix-*-schema.mjs` / `schemaGuards/` scripts this would consolidate.
