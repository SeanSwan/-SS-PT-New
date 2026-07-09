# Fable 5 — Final-Decider Ruling

**Reviewer:** OpenRouter `anthropic/claude-fable-5` (Fable via OpenRouter credits; Claude-subscription Fable was capped)
**Document:** docs/ai-workflow/blueprints/PROGRESS-COMMAND-CENTER-ORCHESTRATOR-BRIEF-2026-07-08.md
**Seed:** .ai-workflow/fusion/pcc-brief-review-20260708/synthesis.md
**Tokens:** 32313 in / 9087 out · **Cost:** ~$0.7775 · **Wall:** 126.5s

---

# FABLE 5 — PURE HOSTILE PASS + FINAL RULING
**Run:** pcc-brief-final-20260708 · Authority: Final Decider (CLAUDE.md Co-Orchestrator Hierarchy) · This ruling supersedes and absorbs §15.

## VERDICT: **LOCK-WITH-CHANGES** — the spine is correct; fold M10–M17 below (plus the already-folded M1–M9) into the body, then the worker-bot builds with zero questions.

---

## 1. Rulings on all 8 Orchestrator Decisions

| ⟐ | Ruling | One-line reason |
|---|---|---|
| **D1** | **CONFIRM** — keep the 12 IDs stable, add new IDs additively, group by `lens`. | Contract tests are the only thing preventing a fourth taxonomy; never rename a passing contract. |
| **D2** | **CONFIRM (a), staged ①②③** with the ≥95%/uncategorized exit gate. | String-matching is the root disease behind ILIKE-CASE, adherence, and pain-by-exercise — pay once, at the write path, staged. |
| **D3** | **CONFIRM (a)** real `personal_records` table + on-save materialization — **with M10 and M12 added** (see §3). | A table is the only queryable, honest substrate for Ladder/droughts/next-target; options (b)/(c) preserve the drift bug in nicer clothes. |
| **D4** | **CONFIRM** — `ClientPainEntry` is the one pain truth; keyword scrape demoted to fallback signal only. | Verified schema (§4.1, F1) supports body-region directly; two pain sources on one Recovery Board would be a lie factory. |
| **D5** | **CONFIRM** — day-level adherence ships in S7; per-set upgrades only after D2 converges. | Day-level uses real FKs (`workoutPlanDayId`); per-set today would be string-match adherence, i.e., fiction with a percentage. |
| **D6** | **CONFIRM** — shim trainer + user onto the registry in S1, delete legacy in S10 with grep+mount evidence. | Kills `Other→Core` immediately without a big-bang delete; Rule 34 evidence protects the retirement. |
| **D7** | **CONFIRM** fold-into-Center with lens preselect — **mechanics corrected by M17**: this is an SPA `<Navigate replace>` alias, not an HTTP 301. | One surface, no naming drift, no dead CTA — but a worker-bot told "301" will build a server redirect for a route that never hits the server. |
| **D8** | **CONFIRM** Brzycki via `oneRepMaxService.mjs` as the ONE 1RM, Epley retires with D6, fix the `:113` comment — **with M11's domain guard added**. | One lift, one number, every surface; and a formula that divides by (37−reps) must never see a 37-rep set. |

---

## 2. Triangle dispositions — ratified / overruled

- **F10 override: RATIFIED, emphatically and finally.** Gemini's L1→L2→L3 toll booth confuses *progressive disclosure* with *mandatory pilgrimage*. L2 is a **view amplifier, not a comprehension gate**; the user clicking a bar wants the truth under it (L3), and L3 carries the one-tap escalate to L2. Least-clicks is Sean's mandate and the correct one. §9.1 stands as written.
- **F5/F3/F4 → S1.5 Data Backbone slice: RATIFIED.** Consolidating both write-path touches (D2 linking + D3 PR materialization) into ONE instrumented, flagged, never-fail slice is the single best structural decision the triangle made. Touching `workout_logs`' save path twice, in two slices, would double the highest-risk exposure for zero benefit.
- **F1, F2, F6, F7, F8, F9: RATIFIED** as folded (§4.1, ⟐D2, S9, §9.1).
- **F11: RATIFIED with teeth retained** — no prod rename, but **no new endpoint exports the bare name `sessionId`**: `bookedSessionId` vs `workoutSessionId` in `…/ledger` and `…/session-detail`. Extended by M18 below.
- **C1–C5: ALL RATIFIED** — pagination+indexes (with M16's quoting caveat), additive `meta` envelope + contract lock, assignment-scoped rollups (`status`, never `.isActive` as a property), canonical 1RM (→D8), first-run activation state.
- **§15 M1–M9: RATIFIED in full.** M1 (PR defined), M2 (`ExerciseClassificationService`), M3 (`lens-summary`, lens-lazy L0), M4 (query-param exercise keys + explicit auth mounts), M5 (`completenessInputs` declared once), M6 (timezone — *amended by M13*), M7 (no color-only heatmaps), M8 (photos opt-in only), M9 (Ask-or-cut — *generalized by M14*).

---

## 3. What BOTH brains (and my own first pass) missed — fold BEFORE build

**M10 — Kill the legacy PR write in the same slice the table lands.** S1.5 materializes new PRs, but `workoutService.mjs:611-621` **still writes to the undeclared `ClientProgress.personalRecords` property**. If that write survives, you ship a dual-write system: new table + old ghost path, drifting silently. S1.5 scope amendment: delete or redirect that write; declare-or-drop the property on `ClientProgress`. One PR write path, ever.

**M11 — Brzycki domain guard.** Brzycki = `weight × 36/(37 − reps)`. At reps ≥ 37 it divides by ≤0; at high reps it inflates absurdly; at `weight` null/0 (bodyweight sets) it's meaningless. The canonical 1RM service **clamps to reps 1–10 (configurable, documented once), skips weight ≤ 0, and PR events are emitted only from in-domain sets** — otherwise the PR Ladder fills with 20-rep band-work "PRs" and the boss-battle ring celebrates garbage. This is a data-truth trap squarely inside M1's schema and neither brain touched the formula's domain.

**M12 — `personal_records` idempotency needs a key, not a wish.** "Separate idempotent background job" (D3/S1.5) is unenforceable without a uniqueness constraint. Add **`UNIQUE(userId, exerciseName, sessionId)`** (prefer `exerciseId` when present) and require the backfill to process **chronologically per exercise** so `previousRecordId` chains are valid. Without this, a retried job double-inserts and the Ladder shows duplicate rungs.

**M13 — Timezone truth, part 2.** M6 says "user's **stored** timezone" — but the brief **never verifies a timezone column exists on `Users`**. S0 must verify; if absent, add nullable `timezone` with one documented default. Second clarification: `workout_sessions.date` is a **DATE** — for historical rows it is taken **as written** (no retroactive re-bucketing of a date that has no timezone); the TZ rule governs timestamp-derived buckets (`completedAt`/`startedAt`) and new writes. A worker-bot told to "re-bucket by user TZ" against a DATE column will invent data.

**M14 — Generalize M9: no dead Command-Strip buttons, period.** The strip ships `[Log][Report][Share][Ask]` from S1, but Report Studio and Share land in **S9**. M9 only cured `[Ask]`. Rule: the strip renders **only wired actions per slice** — `[Report]`/`[Share]` appear when S9 ships (registry-driven strip config, slice-gated). A labeled button with no target is a shipped bug regardless of which button it is.

**M15 — One streak source.** `…/summary-lifetime` computes current/longest streak, but the existing page already renders gamification streak cards from a different engine (§2.1). Two computations = two numbers on the same L0 strip = trust destroyed on a gamified surface. Ruling: the **read-model streak is canonical**; gamification surfaces consume it (or S2 explicitly proves both derive from one function).

**M16 — Quote camelCase in raw DDL.** The S1.5 indexes (`workout_logs(sessionId)`, `(exerciseName)`, `workout_sessions(userId, date)`) target **camelCase columns**; unquoted identifiers in raw Postgres migrations lowercase-fold → `column "sessionid" does not exist` at migration time or, worse, an index on nothing. All migrations quote: `"sessionId"`, `"exerciseName"`. This is the Rule-58 class of bug the whole brief exists to avoid.

**M17 — D7 redirect mechanics.** `/progress/detailed` is an SPA route: implement as a client-side `<Navigate replace>` alias carrying lens preselection (and preserve any deep-link params), not an HTTP 301. (See D7 ruling.)

**M18 — Define "logged by" for the Ledger.** The wireframe (§6.1) shows "logged by you / trainer-led," and the `…/ledger` spec lists "who-logged" — but §4.1 is explicit: **no `loggedBy` column exists**. Derivation rule, documented in the read-model: `loggedBy = sessionType === 'trainer-led' ? trainerId : userId`. The worker-bot must not invent a column, and per F11 the field exports as `loggedByUserId`.

Minor addenda (fold into existing items, no new numbers): `Exercise.difficulty` (INT 0–1000) needs one banding rule (→ M2's classification service owns it); `Exercise` JSON-as-TEXT columns require defensive parse in M2; the FE drawer's `normalizedName` must use the **same normalizer** the S1.5 backend service exports (one function, shared); `…/lens-summary` gets a staff twin with explicit `requireOwnershipOrTrainer` per M4.

---

## 4. FINAL LOCKED SEQUENCE

**`S0 → S1 → S1.5 → S2 → S3 → S4 → S5 → S6 → S7 → S8 → S9 → S10`** — ratified as amended, including the deliberate **S2-before-S3** (Ledger has zero D2 dependency; it buys the backfill wall-clock time to hit the ≥95%/uncategorized gate).

**One flexibility clause I add as Final Decider:** **S4 (ChartExpandModal) is the designated gate-stall slice.** It is pure frontend with zero D2 dependency; if the S3 exit gate has not converged when S2 completes, the worker-bot builds S4 next and S3 follows the gate. No other reordering is permitted. Cut line if forced: **≥S6 may slip; S0–S5 may not.**

---

## 5. Single highest risk + de-risk

**The S1.5 write-path touch remains the single highest risk** — PR materialization and `exerciseId` linking both hook the workout-save path, the one path whose failure mode is **silent loss of training truth**, which is the substrate of every pixel on this surface.

De-risk, in order (binding): (1) failing-test contract suite on the **current** save path, locked green before any S1.5 code; (2) both hooks behind **independent feature flags**; (3) both **never-fail** — a thrown PR-calc/link error logs, increments a metric, and the save **still commits** (extend the gamification idempotency pattern, now enforced by M12's unique key); (4) **remove the legacy ghost write in the same slice (M10)** so there is exactly one PR path to observe; (5) canary rollout with a save-success-rate dashboard and one-flag rollback; (6) backfills only as separate idempotent chronological jobs emitting linked-% — S3 does not exit until the D2/M2 gate is met.

---

> **RULING: LOCK-WITH-CHANGES.** Fold M10–M18 into the body alongside M1–M9. All eight ⟐ decisions confirmed as amended; F10 override stands — L2 is a view amplifier, not a comprehension gate. After the fold, no question should survive contact with the worker-bot. — **Fable 5, Final Decider**
