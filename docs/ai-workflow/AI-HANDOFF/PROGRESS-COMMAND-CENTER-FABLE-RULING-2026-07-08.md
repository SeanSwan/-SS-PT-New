# Fable 5 — Final-Decider Ruling

**Reviewer:** OpenRouter `anthropic/claude-fable-5` (Fable via OpenRouter credits; Claude-subscription Fable was capped)
**Document:** docs/ai-workflow/blueprints/PROGRESS-COMMAND-CENTER-ORCHESTRATOR-BRIEF-2026-07-08.md
**Seed:** .ai-workflow/fusion/pcc-brief-review-20260708/synthesis.md
**Tokens:** 28283 in / 7771 out · **Cost:** ~$0.6714 · **Wall:** 112.3s

---

# FABLE 5 — FINAL HOSTILE REVIEW & RULING
**Target:** PROGRESS-COMMAND-CENTER-ORCHESTRATOR-BRIEF-2026-07-08 (post-triangle revision)

## VERDICT: **LOCK-WITH-CHANGES** — spine is sound; 9 pre-build corrections are mandatory; sequencing locked with one reorder (S2 before S3, and it's not cosmetic — see below).

---

## 1. Rulings on all 8 Orchestrator Decisions

| ⟐ | Ruling | Reason (one line) |
|---|---|---|
| **D1** | **CONFIRM** | Keep the 12 IDs contract-stable, add new IDs additively under a `lens` field — anything that renames passing-contract IDs is self-inflicted drift, the exact disease §2.4 diagnoses. |
| **D2** | **CONFIRM (a), staged** | Nullable FK → write-time link → async idempotent backfill is the only shape that unlocks honest Rolodex metadata without betting the logging path; **add an exit gate: ≥95% of historical logs linked (or explicit "uncategorized" bucket) before S3 ships its metadata claims.** |
| **D3** | **CONFIRM (a)** — real `personal_records` table | (b) can't power droughts/next-target cheaply and (c) enshrines the undeclared-property bug; **but D3 is UNBUILDABLE as written — no PR definition exists (see §3, Missed-1). Spec blocks S1.5.** |
| **D4** | **CONFIRM** | `ClientPainEntry` is the verified structured source (§4.1); keyword scrape demoted to fallback-signal only — one pain truth, coordinated with Workstream D. |
| **D5** | **CONFIRM** | Day-level adherence is honest and shippable now; per-set is a free upgrade once D2 converges — do not block S7 on it. |
| **D6** | **CONFIRM** | Shim trainer + user onto the registry in S1 (kills `Other→Core` immediately), delete legacy with grep+mount evidence in S10 — correct Rule 34 discipline. |
| **D7** | **CONFIRM, plus one addition** | Fold `/progress/detailed` into the Center as a lens and kill the "14" label; **the retired route must 301/redirect into the Center with the lens pre-selected** — a dead deep-link from the existing locked CTA (§2.1) is a shipped bug. |
| **D8** | **CONFIRM** | One canonical 1RM = Brzycki via `oneRepMaxService.mjs`, Epley dies with the legacy path, and the lying `clientAnalyticsRoutes.mjs:113` comment gets fixed in S1.5 — but D8 is incomplete without the same rule applied to *taxonomy* (see Missed-2). |

---

## 2. Triangle dispositions — ratified / overruled

**F10 (L1→L3 fast path) — TRIANGLE OVERRIDE RATIFIED, emphatically.** Gemini's forced L1→L2→L3 confuses *disclosure* with *ritual*. L2 is a view amplifier (bigger chart, compare mode), not a security or comprehension gate — nothing at L3 requires L2 context to be safe or honest. On mobile the toll-booth doubles interaction cost on the surface where Sean's least-clicks mandate bites hardest. The §9.1 shape (L1 data-point → L3 direct; L3 carries one-tap "view in full chart" → L2) is the correct topology. **Locked.**

**F5 / F3 / F4 (D2+D3 staging → new S1.5) — RATIFIED.** Consolidating the two write-path touches into one slice is right: the `workout_logs` save path is the single most valuable code path in the product and you touch it once, instrumented, flagged, never twice. The triangle's sequencing catch (S3 shipping before D2 metadata exists) was real and the fix is correct — with my one refinement in §4 (S2 before S3 buys the backfill wall-clock time to converge).

**F1, F2, F6, F7, F8, F9 — RATIFIED as folded.** F6 in particular is non-negotiable: "IDs only" was never sufficient for free-text `notes` and the redaction layer is a Rule-8 hard gate on S9, not a nice-to-have.

**F11 (`sessionId` collision) — RATIFIED as PARTIAL, with teeth added:** the read-model alias is mandatory in every NEW endpoint shipped by this initiative (`bookedSessionId` vs `workoutSessionId` in `…/ledger` and `…/session-detail` responses). No new API surface may re-export the ambiguous name. Prod rename stays out of scope.

**C1–C5 — ALL RATIFIED.** C2 (additive `meta`, contract-test the `data` shape in S0) and C3 (assignment-scope via `ClientTrainerAssignment.status`, fail-closed) are exactly right. C4 extended by ruling D8+Missed-2. C5 extended by Missed-5.

---

## 3. What BOTH brains missed (Fable findings — binding)

**M1 — "PR" is never defined. The worker-bot cannot build D3/S5 from this brief.** Is a PR: heaviest weight per exercise regardless of reps? A rep-PR at a given weight? An est-1RM PR (which couples it to D8)? Per rep-range bands? The brief says "materialize PRs" and cites `workoutService.mjs:611-621` but never states the event definition, so the worker-bot will either ask (brief fails its own §0 bar) or guess (ships a wrong PR Ladder that the client will *notice is wrong* — worst possible failure on a celebration surface). **Ruling: PR = est-1RM PR per exercise (canonical Brzycki, D8), computed per completed session, with raw max-weight kept as a secondary column. Schema: `personal_records(id, userId, exerciseId nullable, exerciseName, est1rm, weight, reps, achievedAt, sessionId, previousRecordId)`. Written into the plan before S1.5 codes anything.**

**M2 — Taxonomy fork: D2 creates TWO classification sources and nobody reconciled them.** Charts #10/#11 classify by ILIKE-CASE on `exerciseName` (§2.3); post-D2, the Rolodex classifies by catalog metadata (`nasmMovementPattern`, `primaryMuscles`). The same squat can appear as "hinge" in Movement Balance and "squat" in the Rolodex row — the exact different-numbers-per-surface disease C4 caught for 1RM, reproduced for taxonomy. **Ruling: one `ExerciseClassificationService` (catalog-first when `exerciseId` is present, ILIKE fallback when null), consumed by charts #10/#11 AND the Rolodex AND the Volume Load Heatmap. Lands in S1.5 alongside D8.**

**M3 — L0 network fan-out.** Lens badges ("12/12 populated", "3 missing inputs") as specced require the completeness envelope of every metric to render the L0 strip — that's 12 fetches today, ~20 after the new modules, on the "calm" landing view, on mobile. **Ruling: fetch only the active lens's charts; badges come from a single new `…/lens-summary` endpoint returning `{lensId, populated, missingInputs}` per lens. Add to §4.3, build in S1.**

**M4 — `…/exercise-detail/:name` keys on free-text in a URL path.** `"1/2 Kneeling Press"`, names with `%`, `+`, unicode — path-param encoding is a shipped-bug factory, and the identity migrates to `exerciseId` post-D2 anyway. **Ruling: query-param (`…/exercise-detail?name=`) now, `?exerciseId=` accepted as the preferred key post-backfill; drawer components key on a stable `{exerciseId ?? normalizedName}` from day one.** Also: every new staff-twin endpoint explicitly mounts `requireOwnershipOrTrainer` — say it in the plan, don't leave it to "already patterned."

**M5 — Completeness is a number with no formula.** `completeness: 0–1` powers badges and gates report-eligibility, but no one defined how it's computed per metric — the worker-bot will invent 12 different formulas. **Ruling: the registry entry itself declares `completenessInputs` (e.g. recoverySignal: `%sets with rpe` × `pain-source coverage`); the envelope computes from that declaration. One rule, defined once, in S0.**

**M6 — Timezone truth for streaks and the Density Calendar.** `workout_sessions.date` is a DATE; "current streak" and per-day calendar cells break at day boundaries if server-UTC bucketing disagrees with the client's local day (the 11pm workout that "doesn't count" is a trust-destroying bug on a gamified surface). **Ruling: all day-bucketing uses the user's stored timezone, falling back to a single documented default; the rule lives in the read-model layer, stated once in §4.3.**

**M7 — Heatmaps are color-only encoding.** Rolodex heatmap, Volume Load Heatmap, Density Calendar all convey magnitude purely by fill — WCAG 1.4.1 failure and a house-rule risk (4.5:1 doesn't save color-only semantics). **Ruling: every heatmap cell carries a value label or accessible tooltip + a non-color secondary channel (intensity dots/pattern) — dataviz discipline directive, applies S3/S6.**

**M8 — F7's PII scrub omits photos.** `body_measurements.photoUrls` is the most sensitive artifact on the surface, and Module 10 explicitly links photos to milestones — but the share/report privacy spec only scrubs free-text. **Ruling: photos are excluded from proof-cards and report packets by default, opt-in per-share with explicit confirmation. Extend §9.1/F7.**

**M9 — `[Ask]` is unspecced (the exact F7 disease, second button).** The Command Strip ships `[Ask Coach]` with no defined target. **Ruling: V1 wires it to the existing coach-message path if one exists; otherwise CUT from the V1 strip — no dead buttons. Also: the deprecated shim endpoints (#16–20, §2.3) get explicit retirement-with-evidence added to S10's checklist.**

---

## 4. LOCKED SEQUENCE

**S0 → S1 → S1.5 → S2 → S3 → S4 → S5 → S6 → S7 → S8 → S9 → S10**

One deliberate reorder vs. the brief's value-cut suggestion (which put S3 before S2): **S2 (Ledger + lifetime summary) runs between S1.5 and S3.** Reason: S2 has zero D2 dependency, while S3's Rolodex metadata quality depends on the D2 backfill *converging* — an async job that needs wall-clock time. Building S2 in that window means the Rolodex ships against a backfill that has actually run, instead of rendering a sea of `exerciseId=null` rows on day one. S1.5 additions per §3: PR definition (M1), ClassificationService (M2), D8 canonical 1RM + comment fix. S1 additions: lens-lazy fetch + `…/lens-summary` (M3). Cut line if forced: everything ≥S6 can slip; S0–S5 cannot.

---

## 5. CHANGES BEFORE BUILD (blocking)

1. Write the **PR Event Definition + `personal_records` schema** into the plan (M1) — S1.5 gate.
2. Add **ExerciseClassificationService** to S1.5 scope (M2).
3. Add **`…/lens-summary` + lens-lazy fetching** to §4.3/S1 (M3).
4. Re-key **exercise-detail** to query-param + stable identity; mandate `requireOwnershipOrTrainer` on all new staff twins (M4).
5. Define **completeness formula via registry declaration** in S0 (M5).
6. State the **timezone bucketing rule** once in §4.3 (M6).
7. **Heatmap accessibility directive** (M7); **photos excluded from share by default** (M8); **spec-or-cut `[Ask]`**, shim retirement in S10 (M9).
8. **D7 redirect** for `/progress/detailed` (§1 ruling).
9. F11 teeth: **no new endpoint exports the ambiguous `sessionId` name.**

---

## 6. SINGLE HIGHEST RISK + DE-RISK

**The S1.5 write-path touch.** PR materialization + exerciseId linking both hook the workout-save path — the one path whose failure means silent training-data loss across the entire product, discovered only when a client asks where their workout went. Everything else in this plan is recoverable; this is not.

**De-risk, in order:** (1) failing-test-first contract suite on the *current* save path locked green before any S1.5 code; (2) both hooks behind independent feature flags; (3) both wrapped never-fail — a thrown PR-calc or link error logs + increments a metric and the save **still commits** (extend the existing gamification idempotency pattern, per F4); (4) canary rollout with a save-success-rate dashboard and a one-flag rollback; (5) backfills run only as separate idempotent jobs with a linked-% metric, never inline — S3 does not exit until the M2/D2 convergence gate is met.

**This plan is LOCKED as amended above. Hand to the worker-bot with §3/§5 folded in; no further questions should survive contact.**

— Fable 5, Final Decider
