# GLM Consult

**Requested:** `glm-5.3-flash`
**Served:** `glm-5.3-flash`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 13358 in / 16087 out (reasoning: 12296) | total 29445
**Wall:** 393.1s

---

VERDICT: REVISE — The doc's own load-bearing paths (amendment, billing source label, outbox gating, slice-2 FK ordering) are either unimplementable as written or silently contradict stated behavior, which falsifies the zero-decision claim.

[SEVERITY: CRITICAL] The amendment flow (13.4.2) is blocked by three independent uniqueness mechanisms the doc itself specifies, and its "delta-aware outbox" is never defined.
WHERE: Part 13.4.2 + Part 7 output FSM + Part 3.3 + Part 5 (`plaud_capture_output_applications`, `workout_side_effect_outbox`) + Slice 1
WHY: An amendment routed through `applyWorkoutLogCore` for an already-approved client/date hits: (a) Slice 1's new UNIQUE `(clientId, date)` on `daily_workout_forms` if it creates a second form; (b) `WorkoutPlanCompletionReceipt.dailyWorkoutFormId` UNIQUE plus the `wpc:` idempotency key that excludes formId if it reuses the form; (c) the outbox `dedupe_key = <type>:<formId>` which is at-most-once per form, so any delta XP/PR effects on the same formId are silently dropped. "Delta-aware outbox" appears once, with no ruling on which rows are written for an amendment — a builder must invent the write semantics, violating the doc's own stop-and-report rule.
FIX: Add a `[DECIDED]` amendment contract: amendment updates the existing form row in place (new `correction_revision`), supersedes the receipt via an explicit revision column on the receipt or a receipt-successor table, and writes outbox rows keyed `<type>:<formId>:<correctionRevision>`. Specify it in 13.4.2 and add an amendment E2E to the ten.

[SEVERITY: HIGH] `source: 'plaud_capture'` (Part 6.2 step 3) is never registered in the source policy, so by the doc's own rule it falls through to `live` and turns paid-session deduction ON.
WHERE: Part 6.2 step 3 vs Part 3.2 and Part 1.3.8
WHY: Part 3.2 lists `plaud_merge` with aliases `plaud_merge_segment` and `plaud` only; unknown source → `live` (everything on, including paid-session deduction). No migration, slice, or test row adds `plaud_capture` to `workoutLogSourcePolicy`. The approval tx would then enqueue a credit-deduction outbox row the design explicitly intends to suppress (Part 1.3.8 says suppression is the whole point), billing clients for trainer-device sessions — a silent money bug the builder has no instruction to catch.
FIX: Add "register `plaud_capture` in the source policy with the same flags as `plaud_merge`" to Slice 1 or 2, and add a source-policy unit test asserting a `plaud_capture` approval enqueues zero billing rows.

[SEVERITY: HIGH] Slice 2 creates `plaud_capture_output_applications` two slices before its FK target exists, and its `output_id` must polymorphically point at two different tables during the bridge.
WHERE: Part 16 Slice 2 vs Part 5 table spec vs Part 6.2 step 7
WHY: The table spec has `output_id FK` into `plaud_capture_outputs`, which is created in Slice 4; Slice 2 serves the *existing* merge flow, whose subject is `plaud_merge_requests`. Either the builder drops the FK (violating the additive/snapshot-verified-FK house rule), or invents a nullable/polymorphic key, or reorders slices. Worse, if `output_id` holds merge-request ids in Slice 2 and capture-output ids from Slice 4, the UNIQUE `(output_id, correction_revision)` spans two id spaces with collision potential.
FIX: Split the table: ship Slice 2 with `subject_type` (`merge_request|capture_output`) + `subject_id` and no FK, or defer the UNIQUE composite and add the real FK in Slice 4's migration. State the choice in Part 5 — it is currently a forced builder decision.

[SEVERITY: HIGH] `WORKOUT_OUTBOX_ENABLED` defaults off while enqueue is unconditional, so deploying Slice 1 silently halts XP/earnings/challenges/PR for all four existing production callers until the flag flips in Slice 16.
WHERE: Part 6.1 + Part 6.4 ("both default off") + Part 14 kill-switch table + Part 17
WHY: Part 6.1 moves the four post-commit side effects out of the service for the whole canonical lane (admin logger, coach proposals, dispatcher, backfill — not just PLAUD). Part 14 defines off = "effects queue and hold." Between the Slice 1 deploy and the flag flip, every production daily-form approval commits but fires no side effects; Part 17 markets this as safe ("rows persist"), but it is a live regression window with no scheduled flip, alert, or drain-on-enable behavior specified.
FIX: Either default `WORKOUT_OUTBOX_ENABLED` on for the Slice 1 deploy (the worker is the fix, not the risk), or gate *enqueue* with a synchronous inline fallback when the flag is off, and add a startup alert on pending-outbox age > N minutes.

[SEVERITY: HIGH] The outbox's claimed "at-most-once per dedupe_key" is false under a crash between effect execution and `done` marking; execution transactionality is unspecified.
WHERE: Part 5 (`workout_side_effect_outbox`) + Part 6.4 + Part 15 `workoutOutboxWorker.test.mjs`
WHY: `dedupe_key` UNIQUE prevents duplicate *rows*, not duplicate *executions*. Claim → execute → mark-done is not atomic with the side effect; the 15-min reaper returns a lease for a worker that died after accruing earnings but before the status update, and the retry double-fires. The test suite claims to "prove" at-most-once, which the described architecture cannot deliver; nothing states whether each worker must wrap effect + status-update in one DB transaction, and notifications are external and can't be.
FIX: State per-event-type delivery semantics: DB-writable effects (XP, challenges, earnings, PR) execute in one tx with the `done` update; `notification`/`analytics` are explicitly at-least-once with idempotent consumers. Require effect-idempotency checks (e.g., re-read-before-write) in the worker spec and test the crash-after-execute window explicitly.

[SEVERITY: HIGH] The kept 24h clip-TTL sweeper (Part 3.4) contradicts the 96h confirmation window and the 96h raw-audio retention class; which sweeper wins is undecided.
WHERE: Part 3.4 vs Part 5 (`expires_at` 96h) vs Part 14 retention classes vs Slice 3
WHY: Part 3.4 is ground truth declared "unchanged"/KEEP, including the 24h clip TTL + cipher purge. Part 14 sets raw-audio retention at 96h unconfirmed and the aggregate review window at 96h. Slice 3 ships "retention classes" but never says the existing 24h sweeper is retuned or retired — so the trainer who confirms at hour 30 transcribes purged audio, and the chaos test "retention purge during review" tests a conflict the spec never resolves.
FIX: Add an explicit Slice 3 item: retune or delete the 24h sweeper, define precedence between old and new purge jobs, and specify the UI/audio state when a clip is purged while its segment is pre-confirmation.

[SEVERITY: HIGH] Consent is checked once at segment confirm; there is no specified re-validation at transcription execution, and `admin_override` semantics are undefined.
WHERE: Part 14 consent row + Part 4 invariant I3 + Part 5 segments `consent_state` + Part 12 confirm endpoint
WHY: Confirm enqueues jobs; the transcription job may execute minutes or hours later. A client revoking consent (or an eligibility flag changing) between confirm and execution still gets audio egressed unless the worker re-runs `checkAiEligibility` — the `consent` job stage implies this but the ordering/atomicity (consent-passed → transcribe enqueued → revoke → transcribe runs) is unspecified. Separately, `admin_override` exists in the enum with "audited, surfaced" but the doc never rules whether override *permits* egress or merely records acknowledgment — a builder cannot implement the gate without deciding.
FIX: Mandate the consent check inside the transcribe job itself (pre-flight, fail-closed to `consent_blocked`), and add a `[DECIDED]` ruling: admin_override allows/does-not-allow egress, with what logging.

[SEVERITY: HIGH] Concurrency and late-arrival guards are unspecified for segment confirm, output assembly, and the aggregate FSM, unlike the job-claim idiom which is fully specified.
WHERE: Part 7 state machines + Part 12 confirm endpoint + Part 13.4.1 + Part 5 (outputs `aggregate_id` FK)
WHY: Two actors confirming the same segment concurrently (no conditional-update or lock specified) produce two confirmed segments and two outputs for one client/date; auto-merge (13.4.1) then races a trainer mid-review with no revision-invalidation rule. The aggregate FSM has no transition for a clip arriving during `in_review` — membership events are append-only, but the state machine forbids re-entering `segmenting`, so late audio either strands or forces an undefined path. And once outputs are terminal the aggregate `closed`s, so 13.4.1's "merge into pending output" must span aggregates — impossible against the single `aggregate_id` FK without a ruling.
FIX: Specify conditional-update guards (`status='proposed' WHERE` style) for confirm, an `in_review → segmenting` re-entry transition on late clips, and either an "aggregate stays open while any output is non-terminal" rule or a cross-aggregate merge mechanism.

[SEVERITY: HIGH] Replay/race mapping on approve is incomplete: two distinct idempotency keys after one commit surface a constraint error or a spurious 409 instead of the promised canonical receipt, and the frontend key-minting policy is unstated.
WHERE: Part 6.3 + Part 6.2 steps 1/4 + Part 12 approve endpoint
WHY: `FOR UPDATE` serializes concurrent approvals, but the second transaction then fails the `ready_review` validation — the doc promises "new key on an applied output+revision → 200 canonical receipt" without specifying that post-lock status must route to the replay path; a literal builder returns an error. Also, corrections increment `correction_revision`, so a retry after saving a correction (same key, different hash) yields `IDEMPOTENCY_MISMATCH` — whether the client mints a new key per tap, per revision, or per mode is nowhere specified.
FIX: Specify the post-lock routing (approved+ledgered → replay receipt; approved-without-ledger impossible by construction), define the request-hash composition (include `output_id|correction_revision|pinChoice|mode`, exclude volatile fields), and rule that the UI mints a new key whenever correction_revision changes.

[SEVERITY: HIGH] Multi-speaker protection is post-hoc: egress proceeds on schedule evidence + a human tap, and the only real speaker-count signal (`unknown_speaker`) fires after the audio has already left.
WHERE: Part 14 multi-speaker row + Part 8 (DR1 windows, continuity rule) + Part 10 diarization limit
WHY: DR1's ±15min/+30min windows and the ≤15min continuity extension can attach one client's (consented) segment to audio containing an adjacent non-consenting person; nothing local (silence/energy analysis) is required pre-egress. The diarization tripwire and the ≤3-speaker vendor limit both act on the transcript — after egress — so the invariant "audio leaves only after confirmed-client consent" is honored for the confirmed client only, and everyone else in the room is protected by policy paperwork (Slice 3 checklist), not by the pipeline.
FIX: Add a mandatory local pre-egress voice-activity/energy heuristic gate for segments lacking a unique schedule overlap, and require the trainer's recording-policy acknowledgment to be a stored, versioned precondition on the aggregate before any egress lane opens.

[SEVERITY: MEDIUM] Segments consumed into an output have no return path when that output is discarded, and output-assembly transactionality is unspecified.
WHERE: Part 7 segment FSM (`parsed → consumed [*]`, `attention → discarded`) + Part 12 discard endpoint
WHY: A trainer who discards a draft (wrong client picked, mis-split audio) strands its segments in a terminal consumed state; the FSM offers no `consumed → proposed/confirmed` transition, so re-segmentation "allowed while no output is approved" is vacuous for those segments and the audio must be re-confirmed from scratch or lost to TTL. Whether consuming segments into an output is one transaction with output creation is also unstated — a partial failure yields parsed segments with no output.
FIX: Add `consumed → proposed` on output discard (with membership event + audit), and specify assembly as one tx (output row + segment status flips + job row) with rollback returning segments to `parsed`.

[SEVERITY: MEDIUM] VERIFY: `workout_logs.exercise_id UUID FK → "Exercises"` presumes the Exercises primary key is UUID — a repo fact the doc asserts without a `[MAIN-VERIFIED]` tag.
WHERE: Part 9.4 migration vs Part 0 house rules ("INTEGER user FKs") vs Slice 7
WHY: The house rule pins INTEGER only for user FKs; the Exercises PK type is unverified in this document. If Exercises uses INTEGER ids, the migration as written fails at creation and the builder must choose a type — exactly the kind of hidden decision the doc claims not to contain. The alias-ladder also silently depends on seeder-written `Exercise.aliases` being non-empty and non-garbage, which is asserted ("finally read by something") but never measured.
FIX: Add to Slice 0's re-verify list: Exercises PK type and alias population stats; write the 9.4 migration against the verified type and add an alias-coverage report to the Slice 7 gate.

[SEVERITY: MEDIUM] Approval-time collision with a client's own manual log has a named E2E test but no specified behavior: which error, which output state, whether the claim releases.
WHERE: Part 15 E2E ten ("conflicting manual log") vs Part 13.4 vs Part 7 output FSM vs Slice 1 unique index
WHY: 13.4 rules only capture-vs-capture conflicts. If the client self-logs after segment confirm, approval hits the core's one-form-per-day guard / Slice 1 UNIQUE constraint; the self-log protection flag correctly prevents destruction, but nothing defines the failure mapping — raw constraint error to the trainer, `attention` with what reason code, claim held or released, retry path after the conflict resolves. The E2E cannot be written without inventing this.
FIX: Add a `[DECIDED]` conflict ruling: approval returns a typed `CLIENT_LOG_EXISTS` result, output → `attention` with a plain-language card offering discard/amend, claim held until explicit resolution; add the state transition to Part 7.

[SEVERITY: MEDIUM] Tap-to-play evidence chips have no purged-audio state, and the one-handed split control is a drag gesture.
WHERE: Part 9.3 + Part 13.3 + Part 14 retention classes
WHY: Verbatim evidence text persists with the workout but audio purges at 96h unconfirmed / 30d post-approval; amendments and post-approval corrections therefore render chips that seek into deleted audio, with no specified UI state. The detail-view split is a drag-handle on a phone for a one-handed trainer — the suggestion chip mitigates only when the schedule evidence fires, which DR2-class ambiguous segments by definition lack.
FIX: Specify a `AUDIO_PURGED` chip state with verbatim-only fallback, purge-audio date on the approve screen, and a tap-based split control (list of candidate cut points + confirm button) as the primary affordance with drag as enhancement.

[SEVERITY: MEDIUM] The new test plan omits the failure modes v2 itself introduces: distinct-key concurrent approval, consent revocation mid-pipeline, outbox crash-after-execute, `plaud_capture` source-policy regression, and approval against purged audio.
WHERE: Part 15
WHY: The listed suites cover replay with the *same* key, claim/lease/reaper mechanics, and retention purge during review — but every finding above that survives into the build is untested by construction: the at-most-once suite cannot catch a double-execute window it doesn't model, the consent integration test spies at confirm-time not job-time, and no suite pins the billing suppression for the new source string. A green Part 15 is therefore compatible with shipping all of the above defects.
FIX: Add suites: concurrent approve with distinct keys (expect one receipt, one 200), consent revoke between confirm and transcribe-execute, outbox kill-after-execute before done (expect zero or provably-idempotent re-fire), source-policy table test for `plaud_capture`, and approve-on-purged-audio UI contract.
