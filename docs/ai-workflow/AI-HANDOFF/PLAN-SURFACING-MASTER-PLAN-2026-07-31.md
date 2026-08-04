---
decision: "Plan Surfacing master plan LOCKED (Fable synthesis of Kimi+Opus5) — schedule Plan Reveal ships first; billing decouple = Session-lifecycle authority, gated on Sean's R1-R4 signature"
status: open
supersedes: none
---

# PLAN SURFACING — MASTER PLAN (2026-07-31, Fable-locked)
> Sean's asks, one data spine: (1) Logger pulls the client's NEXT planned workout, editable; (2) Schedule
> shows the plan for the day you click; (3) Swan Coach knows the same truth (hive mind). Grounded by two
> file:line-receipted traces; consulted Kimi K3 (design, SEND-BACK→folded, $0.036) + Opus 5
> (product/architecture, SOUND-WITH-CHANGES, $0.816); synthesized + locked by Fable.
> Raw materials: `PLAN-SURFACING-CONSULT-BRIEF-2026-07-31.md` + `...-CONSULT-KIMI-...` + `...-CONSULT-OPUS5-...`.

## 1. State of the union (verified)
The pipe is ~85% built: planner saves `planData{weeks[].days[].exercises[]}` + cursor; the logger
materializes plan days into editable rows; verified saves advance the cursor transactionally (revision
boundary + immutable receipts); the canonical schedule ALREADY ships a live "Planned Training" projection
layer; the session modal already deep-links the logger (`sessionId + loadPlan=today`).
**One blocking defect:** every planner training day is `trainer_session`, and three guards
(`clientTrainingReadModelService.mjs:212`, `clientTrainingAssignmentPickerService.mjs:123`,
`workoutLoggerSubmitPayload.ts:151`) freeze prefill/submit/advancement without a linked scheduled session
→ plans never move off W1·D1. **Root taxonomy error (Opus):** `trainer_session` conflates DELIVERY MODE
with BILLING INTENT, and the guards are billing controls only because deduction lives on the log-save path.

## 2. ⚖️ SEAN — sign these four lines (R1-R4) to unlock S3+
- **R1** Session-credit DEDUCTION happens exclusively in the Session lifecycle (session → completed /
  no-show). Never on the log-save path.
- **R2** Plan-cursor ADVANCEMENT happens exclusively on a verified log matching the cursor day. Neither
  path writes the other's columns.
- **R3** A staff-actor log with NO linked session requires an `unbilled_reason`
  (makeup_no_credit / complimentary / client_self_reported / plan_catchup) and lands in an admin
  exceptions queue (IDs only).
- **R4** Credit refunds do NOT reverse advancement; advancement reverses only via an explicit trainer
  "undo day" (append-only `PlanAdvancementReversal`).

## 3. LOCKED slice sequence (Opus order accepted — value first, signature off the critical path)
- **S0 — Foundations (invisible refactor):** row-identity keys `planId:contentRevision:week:day:exIdx` on
  materialized rows + immutable `prescribed` kept beside `actual` per row; extract the shared
  server-authoritative resolver from `trainingPlanProjectionContract.mjs` exposing
  `resolveNextDay(plan)` (cursor) and `resolveDayForDate(plan, date)` (basis chain, returns
  `{week, day, basis}`); `/api/workouts/:clientId/current` gains `?forDate=` (NO new endpoint — /current
  IS the next-workout endpoint); **DELETE** the weekday-name `getPlanDayForDate` + loadTodaysPlan tier 3
  (unsound, not merely different); repoint `extractCurrentSession`/`buildTodayAssignment` to the resolver;
  stamp `resolverVersion` on new receipts. Golden-file tests; zero behavior change.
- **S1 — Schedule "Plan Reveal" (Sean's ask #2 — ships FIRST, no ratification needed):** Kimi's hero spec:
  the planned workout renders as the session modal's TOP zone — plan title, `W{n}·D{n}` "you are here"
  cursor pin, focus line, exercise rows (name+scheme primary, tempo/rest in expansion at 375/414),
  crystalline faceted surface, GPU-safe stagger (reduced-motion instant), ONE declared primary CTA.
  Self-fetching `SessionDetailPlannedWorkoutPanel` (≤3 props, fixed-min-height skeleton, no layout jump),
  FULL state matrix (manual/null-userId → render nothing; rest day; completed-receipt state; draft plan;
  fetch error; date-mismatch with `basis` disclosed). `detail=full` ships as a **separate response with a
  second allowlist** — the 3-name preview contract stays byte-identical. Projection firewall preserved;
  a test asserts full-detail payloads never reach socket emits or log lines.
- **S2 — Discoverability + calendar plan glyphs:** per-day completion/progress language from existing
  receipts (done/upcoming/missed — TrueCoach gap) + per-session plan glyph (defined token, 44px, rendered
  from the projection overlay — NEVER a line added to the 1073-line `UniversalMasterSchedule.tsx`);
  `driftDays` added to projection items ("3 days behind", basis math already exists).
- **S3 — R1 lands (billing authority moves to Session lifecycle):** deduction set inside the same row
  lock as `sessionDeducted` (verify the boolean is lock-guarded; fix if read-modify-write); receipt **v2**
  with non-nullable `billingLinkage {sessionId|null, deducted, unbilledReason|null, actorRole,
  deliveryMode, resolverVersion}`; historical rows backfilled `legacy_linked`. GATE: Sean's §2 signature.
- **S4 — Guard loosening + detector, ONE ATOMIC SLICE:** loosen the three §1 guard sites; server re-derives
  delivery mode + session linkage (client `plannedAssignment` = hint only); staff save with no linked
  session auto-links ±N hours else REQUIRES `unbilled_reason` (rejected otherwise); admin exceptions
  queue; nightly reconciliation alert (trainer/admin receipts w/ null session, IDs only, 3-day alarm);
  `billing.unlinked-trainer-log.detected.test` asserts the DETECTOR exists; **7-day shadow mode** diffing
  would-be vs actual deductions before any client-facing enablement. Save-payload pin updated
  deliberately in-slice.
- **S5 — Logger auto-load via RECONCILE (not replace/merge):** empty→load; draft wins (chip offers
  replace + one-tap undo); same-day identity → no-op; different day → confirm; ad-hoc user rows preserved
  (merge = plan rows + user rows only); logged sets NEVER lost on prescription update; dismiss sticky
  per plan-day; chip label carries basis (`W2·D3 · next unfinished`); cursor-first on session-open with
  disclosed delta ("Scheduled W3·D2; you're on W2·D5 — load scheduled instead?"). Late-arriving offline
  log conflict rule defined here (reconcile-to-nearest-uncompleted or exceptions queue) BEFORE ship.
- **S6 — Log-ahead + undo-day:** disclosure + `PlanAdvancementReversal` (the "cursor is wrong" toolkit).
- **S7 — Client start-path, own flag, S4 MANDATORY first:** client logger route reads `sessionId`; client runs the CURSOR day ONLY (read+do, never decide — day-switching stays trainer/admin, §4.5.6);
  "open schedule → tap today → train" goes client-core only after the detector ladder is live.
- **S8 — Swan Coach hive-mind awareness (Sean):** Coach context enrichment learns the plan spine via the
  SAME resolver (cursor truth, never calendar guesses): active-plan `W·D`, today's planned workout,
  schedule linkage, advancement semantics — answers "what's my workout / what's next / did I finish this
  week" from the canonical record. IDs-only (Rule 8); Cortex safety gates unchanged (blocking review 409,
  pain exclusions, fail-closed eligibility) — awareness widens, authority does not.
- **S9 — Receipts + Rule 48 audit record + board closeout.**

## 4. Consult ledger
- **Kimi K3 — SEND-BACK (design surface), accepted:** hero Plan Reveal + state matrix + skeleton/no-jump
  contract + chip/auto-load dedup + client path promoted + completion-on-calendar + 44px on every new
  affordance. Deviation recorded: prev/next arrows stay on mobile in the shipped rail batch (Sean
  explicitly asked; icon-only 44px).
- **Opus 5 — SOUND-WITH-CHANGES, structural corrections accepted:** billing authority → Session lifecycle
  (mechanism override); two-function resolver, weekday matcher DELETED; sequencing inverted (value first);
  reconcile-by-identity; client wiring FORBIDDEN until R1; second allowlist for detail=full; highest risk
  = silently-free trainer sessions → detector ladder. Backlog adopted: trainer adherence roll-up
  (post-S2, same firewall), return-channel log→trainer view, `%1RM` intent field RESERVED in planData now
  (unused), real session types on appointments (same taxonomy fix family).
## 4.5 Fable's own insight (orchestrator — neither consultant said these)
1. **This is a repair, not a feature.** `buildScheduleWorkoutLoggerRoute` already ships
   `sessionId + loadPlan=today` — the schedule→logger→plan spine was DESIGNED as the happy path and the
   trainer_session guards broke its middle. We are restoring intended behavior, which is why the unlock
   belongs on main and not behind a product debate.
2. **Decorate objects, don't add parallel surfaces.** The projection layer failed discoverability because
   it renders as a separate card grid ABOVE the calendar instead of decorating the things Sean actually
   looks at (sessions, days). S1/S2 follow the principle: plan truth appears ON the session modal and ON
   the day cells. Any future plan surface that can't answer "which existing object does this decorate?"
   is wrong by default.
3. **Today's theming lesson binds the new panel.** This morning's "stays blue" bug class = token defined
   nowhere, fallback wins silently. The Plan Reveal panel and glyphs are BORN on `--world-*` tokens and
   the world-seam static law extends to them in the same slice — never re-create the class on a new surface.
4. **Law 0 gains a plan fixture.** Auto-load must preserve the one-tap covenant: cold open with an
   auto-materialized plan day → first incomplete set loggable in ONE tap, zero sheets, zero jumps. The
   tap-budget test gets a plan-loaded fixture in S5 — auto-load that adds a tap is a regression, not a feature.
5. **The resolver will have FIVE consumers** (logger, schedule projections, `/current`, Swan Coach S8,
   and the native mobile track already in flight) — the strongest argument for one server-side definition
   and the explicit no-TS-port rule. Every consumer added later inherits correctness for free.
6. **Trainer-indispensability guard on S7 (Sean doctrine):** clients get read+do, NEVER decide — the
   client start-path runs the CURSOR day only; day-switching, plan-day override, and "load scheduled
   instead" remain trainer/admin affordances. Neither consultant caught this.
7. **Two-batch shipping shape (Rule 70):** Batch A = S0+S1+S2 (pure read/refactor, zero billing exposure,
   Sean sees the Plan Reveal fast). Batch B = S3+S4 after signature, with the 7-day shadow window before
   S5/S7 enable. Value lands while the signature is pending, and the risky work gets its own deploy.

## FINAL VERDICT (Fable, Final Decider)
**LOCKED as sequenced.** S0-S2 are ready to build on Sean's "go" (no billing exposure, no signature
needed). S3+ builds only after Sean signs R1-R4 in §2. Client start-path (S7) stays forbidden until the
S4 detector ladder is live. Kimi and Opus verdicts are advisory inputs, fused above; deviations from them
are recorded in §4. This document supersedes the §3 draft ordering that put the modal panel fourth.

## 5. Binding laws
Byte-pinned save payload changes only deliberately in-slice; zero PII to LLMs/sockets/logs (IDs only);
projections firewall (read-only, no Session/billing imports); ≤300-line files (pre-spent extractions);
world-seam law for logger chrome; M3 anti-jump (skeletons, no flash-empty); 44px; Rule 26 receipts per
surface; billing slices carry Sean's signature (Rule 50/62); Coach authority unchanged (Cortex gates).
