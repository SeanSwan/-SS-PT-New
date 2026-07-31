# SwanStudios Fable Final-Decider

**Reviewer:** OpenRouter `anthropic/claude-opus-5`
**Document:** docs/ai-workflow/AI-HANDOFF/PLAN-SURFACING-CONSULT-BRIEF-2026-07-31.md
**Seed:** (none)
**Tokens:** 5752 in / 15163 out · **Cost:** ~$0.8157 · **Wall:** 212.5s

---

# CONSULT REVIEW — Plan Surfacing (Opus 5, product/architecture)

## (a) VERDICT

**SOUND-WITH-CHANGES.** The ground truth in §1–§2 is unusually well-receipted and the strategic reads are right (build on the shipped projection layer, pick one date truth, decouple advancement from billing). Three structural corrections: **billing authority is placed in the wrong aggregate** (§3.A.1), **the resolver is over-unified** (§3.B.3), and **the sequencing inverts risk and value** (§3.C). No PII was present in this brief and none is required for any slice below.

---

## (b) RULINGS — each numbered decision

### §3.A.1 — Advancement/billing decouple — **OVERRIDE ON MECHANISM** (direction confirmed)

The product rule "advance always, bill only when a session is linked" is **directionally correct and mechanically unsafe**, because it makes the billing outcome a function of a *missing join*. Absence is not intent. The real defect is a taxonomy error: `assignmentType: 'trainer_session'` encodes two orthogonal facts — *delivery mode* (who leads the work) and *billing intent* (does this consume a credit) — and the three guards in §1 are load-bearing for billing only because deduction lives on the log-save path.

**Correct rule:** *Session credits are deducted exclusively by the Session lifecycle (Session → `completed`/`no_show`). Plan cursor advancement is caused exclusively by a verified log matching the cursor day. Neither path writes the other's columns.* Once deduction no longer lives on the save path, the guards stop being billing controls and can be loosened safely — that is the actual unlock, and it inverts the build order (see (f)).

**What breaks, enumerated:**

1. **Double-deduction.** A client opens the logger from a scheduled session → save carries both `scheduledSessionId` and `plannedAssignment`. If the advancement handler completes the session *and* the trainer later marks it complete in `SessionDetailModal`, you deduct twice. `Session.sessionDeducted`/`creditsDeducted` are booleans, which is the right guard **only if** set inside the same row lock as the deduct — verify that; if not, it's a read-modify-write race under two concurrent actors.
2. **Silently-free trainer sessions** — the dominant regression. Trainer delivers a real in-person session but opens the logger from the plan chip (§3.A.3) rather than the session → no `sessionId` → advance-only, zero billing, no error, no alert. Revenue leaks daily, invisibly, and the "correct" test fixture *is* the leaking behavior. Requires: (a) staff-actor saves with no linked session must attempt auto-link against Sessions for that client within ±N hours; (b) if none, a **required `unbilled_reason` enum** (`makeup_no_credit` / `complimentary` / `client_self_reported` / `plan_catchup`) — no free text; (c) an **admin exceptions queue**, IDs only per Rule 8.
3. **Receipts.** `WorkoutPlanCompletionReceipt` is immutable and today *implies* "billed session delivered." Emitting receipts for unbilled advancement silently changes the meaning of every historical row for every downstream consumer. Requires `receiptVersion: 2` plus non-nullable `billingLinkage {sessionId|null, deducted, unbilledReason|null, actorRole, deliveryMode, resolverVersion}`, existing rows backfilled `legacy_linked`. Do not overload the v1 shape — an immutable record whose semantics change without a version bump is an audit failure.
4. **Refunds / cancellations.** Advancement becomes a second side effect with **no reversal path**. Cancel-after-log refunds the credit but leaves the day stamped complete and the cursor moved; voiding a log has no defined un-advance against an immutable receipt. Product rule to ratify: **refunding credits does NOT reverse plan advancement; advancement is reversed only by an explicit trainer "undo day" action**, recorded as an append-only `PlanAdvancementReversal`. Two ledgers, two reversals, no cascade.
5. **Server trust boundary.** `plannedAssignment` from the client is a *hint only*. Delivery mode and session linkage must be re-derived server-side from the plan row and the Sessions table. The `shell.save-path.canonical.test` pin update (§4) is necessary but not sufficient.
6. **Credit-vs-completion display drift.** `SessionDetailInfoGrid` shows credits; clients will read "workout logged" as "session used." Needs a copy rule.

**For Sean's ratification (4 lines, sign as-is):** R1 deduction = Session lifecycle only. R2 advancement = verified cursor-matched log only. R3 staff log with no linked session requires an unbilled reason and lands in an exceptions queue. R4 credit refunds do not reverse advancement.

### §3.A.2 — Auto-load on open — **CONFIRM, amended**
Correct trigger (zero rows AND no draft; draft wins), but "replace" is the wrong primitive — see (d); and the dismiss must be sticky **per plan-day**, not per open, or it re-nags on every mount and violates M3.

### §3.A.3 — Chip promoted to load control — **CONFIRM**
Right surface and the header already promised it; label must carry basis (`W2·D3 · next unfinished`) so a cursor-vs-scheduled disagreement is visible rather than resolved silently.

### §3.A.4 — Log-ahead stays draft-only — **CONFIRM, strengthened**
Disclosed-not-frozen is right, but don't dead-end it: pair with the "undo day" / `PlanAdvancementReversal` action from §3.A.1(4) in this same slice, since both are the "cursor is wrong" toolkit.

### §3.B.1 — Self-fetching panel, ≤3 props, new file — **CONFIRM**
Correct call given BodyPanels(295)/Modal(293). Pre-spend the extraction budget rather than deferring it. **Add a required empty state:** §2 documents `Session.userId` nullable and `clientName` manual sessions — the panel must not fetch or throw on null `userId`, and must render `basis: none` explicitly.

### §3.B.2 — `detail=full` contract extension — **CONFIRM, constrained**
Do **not** widen the existing normalizer's 3-name cap. A fail-closed allowlist that now accepts N items has lost the property that makes it valuable. Ship a **separate** full-detail response validated by a **second** allowlist; the preview contract stays byte-identical. Lockstep applies to the new pair only.

### §3.B.3 — One date truth via `scheduledDateFor` — **CONFIRM PRINCIPLE, OVERRIDE SCOPE**
The basis chain must be the only *date→plan-day* mapper — but the logger's default path must stay **cursor-first**, not calendar-derived. Making the logger calendar-derived introduces silent plan-day *skipping* (miss Tuesday, never get Tuesday), which is worse than today's deadlock and far harder to notice. See (c).

### §3.B.4 — Client `sessionId` wiring "optional" — **OVERRIDE**
Not optional — **forbidden** until R1 (deduction authority move) lands, behind its own flag. The moment a client can start a session from the schedule, both the double-deduction and silently-free paths go live for the actor least able to detect them.

### §3.B.5 — Day affordance + calendar glyph — **CONFIRM, promote earlier**
Cheapest fix for the actual reported failure (Sean didn't recognize the shipped layer). **Constraint:** calendar session blocks live in `UniversalMasterSchedule.tsx` (1073 lines, 3.5× cap) — the glyph must be rendered from the projection overlay component or a new module, derived from the projection payload already fetched, never a second query and never a line added to that file.

### §3.B.6 — Auth scoping + no plan content on sockets — **CONFIRM, no change**
Inherit the projection service's scoping verbatim. Add one test: the `detail=full` payload — the largest plan-content surface yet created — must be asserted to never reach a socket emit and never enter a log line (Rule 8).

---

## (c) Cursor vs calendar — what the single mapper actually is

Two different questions are being collapsed into one. *"What is my next workout?"* is a **cursor** question — monotonic, gap-tolerant, order-of-completion truth. *"What workout is scheduled for date D?"* is a **calendar** question, needed by the schedule modal. They must agree only in the case `D == the date the cursor day projects onto`.

**Adopt one shared, server-authoritative resolver exposing two functions over the same basis chain:**
- `resolveNextDay(plan) → {week, day, basis:'cursor'}` — logger open, plan chip, `/current`.
- `resolveDayForDate(plan, date) → {week, day, basis:'explicit'|'planStartOffset'|'cursorOffset'|'none'}` — projections, modal panel, logger opened with `sessionDate`.

When the logger is opened from a session and the two disagree, load the **cursor** day and disclose the delta ("Scheduled W3·D2; you're on W2·D5 — load scheduled instead?"). That is exactly §3.A.4's residual, surfaced rather than silently resolved.

**Migrates:**
- `WorkoutLogger.helpers.ts:309-321` `getPlanDayForDate` — **deleted**, not re-pointed. Weekday-name matching is unsound, not merely different: it cannot distinguish W2·Tue from W5·Tue and returns matches for plans with non-weekday day naming.
- `loadTodaysPlan.ts` tier 3 — **removed**, not replaced. Tier 1 is cursor; tier 2 (`todayAssignment`) is already cursor-derived; tier 3's only job was the weekday fallback.
- `extractCurrentSession` and `buildTodayAssignment` — both repointed to `resolveNextDay` so they stop deriving from cursor independently.
- `trainingPlanProjectionContract.mjs:152-163` becomes the **definition site**. Do **not** ship a TS port of the basis chain to the client — that is a divergence machine. Extend `GET /api/workouts/:clientId/current` with `?forDate=` and return `{week, day, basis, reason}`; do **not** add a "next workout" endpoint (§1 notes there isn't one — `/current` *is* it; a second one creates a third truth).
- Stamp `resolverVersion` on new receipts. Do **not** retro-correct rows created under the weekday matcher.

---

## (d) Replace vs merge — **OVERRIDE both**

Neither policy is right; the correct primitive is **field-level reconcile keyed by row identity**. Give every materialized row `planId:contentRevision:week:day:exerciseIndex`. That single change kills the append-duplication bug at the root, makes logger-open re-entrant (required by M3 anti-jump), and makes both "replace" and "merge" fall out as cases:

- **Empty logger** → load. No prompt.
- **Draft exists** → draft wins; chip offers replace; the draft is retained as a one-tap undo for the session. Replace is destructive and requires an explicit tap.
- **Same plan day already loaded** → no-op by identity. Never duplicates.
- **Different plan day loaded** → replace with confirm.
- **User-added ad-hoc rows present** (no `sourcePlanDay`) → **merge**: plan rows above, ad-hoc rows preserved. This case *will* happen (warm-up, then pull the plan) and pure-replace destroys typed data.
- **Row with matching identity already has logged sets** → preserve the logged sets, update only the prescription. This is the case the plan misses entirely.
- **Never** merge two plan days. Merge is only plan-rows + user-rows.

Corollary, and it pays for itself twice: keep `prescribed` immutable alongside `actual` on each row (see (g)4).

---

## (e) Sequencing — **RETHINK the order**

The plan puts the highest-value, lowest-risk, ratification-free slice (§3.B.1 modal panel — Sean's ask #2) **fourth**, behind a billing negotiation that cannot start until an owner signature lands. Invert that.

| Slice | Content | Indep. shippable | Blocked on |
|---|---|---|---|
| **S0** | Row-identity keys + shared `planDayResolver` extraction; delete `getPlanDayForDate`, remove tier 3. Pure refactor, golden-file tests, no behavior change. | Yes (invisible) | — |
| **S1** | `SessionDetailPlannedWorkoutPanel` + `detail=full` second-allowlist contract, lockstep. **Sean's ask #2 lands here.** | Yes | S0 |
| **S2** | Discoverability + calendar glyph (outside the 1073-line file). | Yes | S1 |
| **S3** | **R1: move deduction authority to Session lifecycle.** Receipt v2 + `billingLinkage`. No guard changes yet. | Yes | **Ratification** |
| **S4** | Guard loosening at the three §1 sites + `unbilled_reason` + exceptions queue — **one atomic slice**. Never ship the loosening without the detector; "later" means never. | No (atomic) | S3 |
| **S5** | Logger auto-load with reconcile + plan-chip control. | Yes | S0, S4 |
| **S6** | Log-ahead disclosure + `PlanAdvancementReversal` / undo-day. | Yes | S4 |
| **S7** | Client `sessionId` wiring, separate flag. | Yes | **S4 mandatory** |

Net effect: Sean sees the plan on the schedule in slice one instead of slice four, and the signature-blocked work leaves the critical path.

---

## (f) Single highest-risk item

**Revenue leakage via silently-free trainer sessions after the guard loosening — with no detector.** Chosen over double-deduction (loud; clients complain same-day), date divergence (visible), and file-cap breaches (mechanical). This one is silent, compounds daily, costs real money, is invisible to tests because the leaking behavior *is* the passing fixture, and destroys owner trust in the system permanently.

**De-risk, in order:**
1. **Ship S3 before S4.** Move deduction authority to the Session lifecycle first; then the three guards are no longer billing controls and loosening them cannot leak. This is the whole reason for the sequencing inversion.
2. Detector ships in the same commit as the loosening. Staff-actor save with no linked session and no `unbilled_reason` → **rejected**.
3. Nightly reconciliation: receipts with `actorRole ∈ {trainer, admin}` and `sessionId = null` in the last 24h → admin alert, **IDs only** (Rule 8). Alarm on count > 0 for three consecutive days.
4. **Shadow mode for 7 days:** allow advancement, log the deduction that *would* have occurred, diff against actual Session deductions. Enable client-facing paths only after a clean diff.
5. Add `billing.unlinked-trainer-log.detected.test` — a test asserting the **presence of the detector**, not merely correct-path behavior.

*Runner-up worth naming:* §3.B.5's glyph is the one place the plan risks editing the 1073-line canonical schedule file. Route it through the overlay component.

---

## (g) What TrueCoach / TrainHeroic do that this plan misses

1. **Trainer-side adherence roll-up.** TrueCoach's home surface is a client list with completed / missed / overdue per assigned day. This plan gives the client a next workout and the schedule a preview, but leaves the trainer with **no instrument to notice non-compliance** — which is precisely why the frozen cursor went undetected. Build a read-only adherence projection off the existing layer + completion receipts; same firewall, zero Session imports.
2. **Explicit drift / overdue semantics.** TrueCoach assigns to dates and keeps missed work visible as overdue. This cursor model silently slides everything forward and never says "you're three days behind." Add `driftDays` (cursor-date basis vs today) to the projection item — the basis chain already computes the inputs.
3. **Return channel from log → plan day.** Both platforms surface per-exercise RPE/comments/video back into the trainer's view. Notes flow *into* logger rows here with no path back; receipts are immutable and the modal shows generic feedback. Define the return channel now or the loop is write-only.
4. **Prescribed vs actual as permanent, distinct columns.** TrainHeroic shows target beside performed, forever. `plannedExerciseToEntry` maps prescription *into* editable rows — once edited, the target is gone and nobody can later ask "did they hit it?" Same fix as (d).
5. **Percentage/e1RM-driven prescription.** TrainHeroic's core is loads computed from a tested max. Not needed for v1 — but if `planData` never reserves a `%1RM` intent field, retrofitting means a JSONB schema migration across every stored plan. Reserve it now, unused.
6. **Real session types on the appointment** (consult / assessment / training / check-in), client-visible. The single overloaded `trainer_session` is the same taxonomy failure as §3.A.1 — this feature and that fix are one piece of work.
7. **Offline/queued logging** — a real gap given the new constraint. Advancement requires an exact server-side cursor match under a row lock; a log that syncs late from a basement gym will be **rejected** because the cursor moved. Define the late-arriving-log conflict rule (reconcile-to-nearest-uncompleted-day, or park in an exceptions queue) before S5 ships.
