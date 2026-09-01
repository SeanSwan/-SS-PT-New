# GLM Consult

**Requested:** `glm-5.3`
**Served:** `glm-5.3`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 13358 in / 24596 out (reasoning: 21231) | total 37954
**Wall:** 620.9s

---

VERDICT: REJECT — the two load-bearing designs (Slice 1 outbox rollout, 13.4 amendment mode) are internally impossible as written, failing the document's own zero-decision bar.

[SEVERITY: CRITICAL] WORKOUT_OUTBOX_ENABLED gates side effects for ALL workouts, not just capture, so Slice 1 as written either freezes XP/earnings/challenges/PR platform-wide at deploy or makes the "kill switch" a global takedown lever for the legacy write lane.
WHERE: Part 6.1, 6.4, 16 (Slice 1), 17
WHY: 6.1 moves the four post-commit effects into outbox rows for all four existing callers (admin logger, coach approvals, dispatcher, backfill), and 6.4 defaults the worker off; 17 confirms off = "effects hold." There is no inline fallback for the core and no statement that the flag must be ON before Slice 1 reaches production, and flipping it during any incident severs pay and gamification for every non-PLAUD workout too. The flag's blast radius contradicts its presentation as a capture-pipeline control.
FIX: Gate per-source — legacy callers keep inline post-commit execution until the outbox burns in; only capture-lane approvals route to outbox behind the flag; document the required flag state in Slice 1's deploy runbook.

[SEVERITY: CRITICAL] The in-release amendment mode (13.4 case 2, Slice 8) is unimplementable: it collides simultaneously with the Slice-1 UNIQUE (clientId,date) forms index, the receipt idempotency key, receipt immutability, the outbox dedupe keys, and the ledger's 1:1 ERD cardinality.
WHERE: 13.4, Part 5 (core migrations; plaud_capture_output_applications; workout_side_effect_outbox), 3.3, 6.1, ERD
WHY: An amendment re-enters applyWorkoutLogCore for the same client/date: a second DailyWorkoutForm violates the new unique index; updating the existing form breaks `||--||` on the ledger, re-derives the same receipt idempotencyKey (which excludes formId, 3.3) against UNIQUE dailyWorkoutFormId and ORM immutability hooks; and "delta-aware outbox" is impossible when dedupe_key is `<type>:<formId>` — amendment XP/earnings rows either fail the unique insert or are swallowed as duplicates. The doc spots this collision for two-a-day but not for the amendment path it ships in Slice 8.
FIX: Specify an explicit amendment core variant (update-in-place with versioned form revisions; amendment-scoped receipt link keyed with formId/revision; dedupe_key `<type>:<formId>:<revision>`), or cut amendments from the release exactly as two-a-day was cut.

[SEVERITY: HIGH] The legacy 24h clip TTL and cipher purge remain live until Slice 14 while the new pipeline promises playable audio for 96h aggregates, review, consent_blocked playback, and 30d approved retention — the old sweepers will delete the new pipeline's evidence.
WHERE: 3.4, Part 5 (expires_at), 14 (retention classes), 16 (Slice 14), 11 C7
WHY: Connector v2 reuses the existing upload path ("KEEP"), so capture clips land in the same swept store, and nothing exempts capture-pipeline clips from the four existing sweepers; the chaos suite even tests "retention purge during review" as expected rather than contradictory. Late-synced clips (recorded Monday, synced Thursday) also have no defined expires_at anchor. VERIFY: whether existing sweeper predicates can distinguish capture clips at all.
FIX: In Slice 4, migrate clip retention to the new classes and explicitly re-scope/retire the legacy sweepers for capture clips; define expires_at on recorded_at with a late-arrival floor.

[SEVERITY: HIGH] The approve replay rules are mutually inconsistent and can silently discard differing corrections behind a 200.
WHERE: 6.3, Part 5 (idempotency_key = sha256(output_id|correction_revision)), 12 (approve)
WHY: The stored key is derived from output+revision, making the client's Idempotency-Key header non-functional; under derived-key semantics, "different hash → 409" fires for any differing re-approve of the same revision, contradicting "new key → 200 canonical receipt," while under header-key semantics a second request with a new header and edited overrides gets a 200 carrying the OLD receipt — corrections vanish behind success. Whether approve accepts inline corrections (sequence diagram) or only the corrections endpoint (Part 12) is also unstated.
FIX: Key replay on the header key with request_hash compared on every hit (mismatch → 409 with a diff), make corrections endpoint-only, and return 409 — never a silent 200 — when a different body targets an applied output+revision.

[SEVERITY: HIGH] Consent is checked once at confirm with no egress-time re-verification, so revocation between confirm and a transcribe retry (5 attempts with backoff, provider outages, flags holding jobs) sends audio to the cloud after denial.
WHERE: 12 (confirm endpoint), 14 (consent gate), 6.4, I3
WHY: The gate reads as "before any egress job is queued," and jobs can sit pending for hours or days — I3's letter is satisfied by a stale check. No revocation event, worker re-check, or transcript recall/purge trigger is specified. VERIFY: whether AiConsentLog even has a revocation transition the worker could honor.
FIX: The transcribe worker must re-run checkAiEligibility inside its claim and abort the segment to attention on denial; define revocation semantics end-to-end (cancel in-flight jobs, purge derived transcripts, flag affected outputs).

[SEVERITY: HIGH] The consent perimeter covers only the confirmed client and Swan's own egress: unbooked second clients and incidental speakers pass the schedule-evidence-only pre-egress block (diarization warnings are post-egress), and every recording has already transited PLAUD's cloud under vendor terms the gate never touches.
WHERE: 14 (multi-speaker hole; consent gate; "audio playable in-house"), I3, 4 (connector pulls from PLAUD cloud), 8 (DR rules)
WHY: The pre-egress block keys on booked-session evidence, so a walk-in client or bystander in an unbooked window egresses by default and unknown_speaker fires only after the transcript is already at Google; 96h storage and in-house playback of non-consenting people's voices is deferred to an unwritten Slice-3 policy item. The consent narrative claims a control the architecture doesn't have.
FIX: Default-deny egress for any segment with local speaker-count/silence suspicion regardless of schedule evidence; restrict in-house playback of denied-consent audio; require trainer attestation or policy completion before connector ingestion, and state the PLAUD-cloud exposure honestly in Part 14.

[SEVERITY: HIGH] 13.4 case 1's automatic merge of "more audio" into a pending output cannot work: outputs are aggregate-scoped, late audio creates a new aggregate, and the output state machine has no ready_review→assembling regeneration transition.
WHERE: 13.4 case 1, Part 5 (plaud_capture_outputs), 7 (output states), 8
WHY: A clip synced after the original aggregate settles lands in a different day envelope; merging it into the old output requires cross-aggregate mutation the aggregate_id FK forbids, so the builder must either violate the model or create a second pending output for the same client/date — which the "one draft per client/date" claim forbids and no unique index enforces. Midnight-spanning segments likewise have no defined confirmed_date rule (trainer TZ vs server TZ on a DATEONLY).
FIX: Define output identity as (trainer, client, workout_date) independent of aggregate, add the regeneration transition with revision semantics plus a same-client/date merge job or uniqueness, and specify midnight attribution (e.g., majority-duration day in trainer TZ).

[SEVERITY: HIGH] Approval step 7 orders flipping plaud_merge_requests inside the capture-output transaction, but capture outputs have no defined linkage to any merge request — the step is unimplementable without inventing the mapping.
WHERE: 6.2 step 7, Part 5 (no merge_request_id on outputs/applications), 16 (Slice 2)
WHY: After Slice 2 reroutes the legacy merge lane through approveCaptureOutput-lite, a Slice-8 capture-output approval has no merge-request row to flip; the doc provides neither a shadow-row requirement nor a skip condition. By its own "a missing decision is a defect" rule, this fails on the single most load-bearing transaction.
FIX: Either define the output↔merge_request bridge rows (created when, keyed how, flipped to what, deleted at Slice 14) or scope step 7 to the Slice-2 legacy lane and state explicitly that capture outputs never touch plaud_merge_requests.

[SEVERITY: HIGH] admin_override as a consent_state that unblocks the pipeline permits cloud egress of audio after the client's recorded refusal — an audited override of a data-subject denial is a compliance liability, not a control.
WHERE: 14 (consent gate/admin override), Part 5 (consent_state enum)
WHY: Enum-wise admin_override sits alongside `allowed` feeding the same confirm→processing path; "never rendered as ordinary consent" addresses the UI, not the egress decision, and no re-consent, legal-basis record, or client notification is attached. The doc does not distinguish "consent record correction" from "override a denial."
FIX: Redefine admin_override to authorize only the no-egress manual path (in-house playback + manual logging), or require a fresh client consent event with recorded basis before any egress under override; it must never satisfy I3.

[SEVERITY: HIGH] The outbox workers are labeled "idempotent" with zero mechanism: a crash after executing an effect but before marking done lets the 15-minute reaper re-run it, and the moved effects were synchronous calls of unknown internal idempotency; failed_terminal earnings vanish with only an alert.
WHERE: 6.4, Part 4 (diagram), 5 (outbox row), 15
WHY: Row-level dedupe gives at-most-one ROW per form, not at-most-one EXECUTION; re-execution after a mid-effect crash double-credits XP or earnings unless each effect gains its own natural-key dedupe, which is unspecified. There is also no re-drive or repair procedure for terminal money events.
FIX: Require per-effect idempotency keys (e.g., challenge progress keyed by form+challenge), effect-internal completion markers where possible, and an admin re-drive endpoint plus paged runbook for failed_terminal rows.
VERIFY: whether each underlying effect is naturally idempotent today.

[SEVERITY: MEDIUM] The state machines contain phantom states and dead-ends: 6.2 marks segments "consumed" though no such enum value exists, segment attention's only exit is discarded (consent overrides and retryable failures can never resume), and 13.4 omits the client-self-log collision that Slice 1's protection now hard-fails.
WHERE: Part 5 (segment status enum), 6.2 step 6, 7 (segment diagram), 13.4, 15 (selfLogProtection)
WHY: The builder cannot implement step 6 without choosing a state the enum lacks; a transient transcribe failure or overridden consent strands a segment forever; and when a capture approval meets an existing client self-log session, the core now refuses by design but no UI flow or user-facing outcome is defined — the trainer dead-ends.
FIX: Add `consumed` (or make parsed terminal-with-output-link), add attention→processing (override/retry) transitions, and add a fourth 13.4 case with a surfaced resolution for the self-log collision.

[SEVERITY: MEDIUM] Resegmentation is blocked only by approved outputs, so it can invalidate segment_ids referenced by assembling/ready_review drafts, and "current membership = latest event per clip" has no concurrency guard against a clip being current in two aggregates.
WHERE: 8 (re-segmentation rule), 12 (resegment endpoint), Part 5 (segment_ids JSONB; membership events)
WHY: JSONB segment references carry no integrity or invalidation signal, so a recluster silently orphans a draft the trainer is reviewing; two concurrent cluster jobs (or a late clip event racing a resegment) can both append "latest" events for one clip with no unique or locking rule given.
FIX: Freeze resegmentation once any output reaches assembling (or define explicit output invalidation → attention with regeneration), and add a deterministic current-membership derivation under lock (conditional insert rejecting an open `added` without a matching `removed`).

[SEVERITY: MEDIUM] Slice 1 changes return-shape values to `{status:'queued'}` markers for two production surfaces that render XP inline, but the consumer updates are assigned to no slice while the Slice-1 gate claims "byte-compatible."
WHERE: 6.1 (return-shape compatibility), 16 (Slice 1 contents/gate)
WHY: UI slices are 9–10, so between Slice 1 and Slice 9 the live admin/coach frontends — and possibly a non-UI consumer like coachActionProposalApprovalService — receive marker objects where numbers were; "byte-compatible" is undefined and false at value level. VERIFY: each of the four callers' downstream handling of xp/challengeProgress/prEvents.
FIX: Assign the consumer updates to Slice 1 itself, define "byte-compatible" as key-preserving with an enumerated value-migration contract, and gate the marker shape so old consumers can tolerate it until updated.

[SEVERITY: MEDIUM] Evidence JSONB stores verbatim transcript quotes in plaintext while parsed_workout is encrypted, and those quotes persist indefinitely "with the workout" — contradicting the document's own encryption and retention posture.
WHERE: Part 5 (plaud_capture_outputs), 14 (retention classes), 9.3
WHY: The verbatim span is transcript text in another column; anyone with DB read sees unencrypted, health-adjacent speech forever while the same bytes inside parsed_workout are key-versioned ciphertext — the privacy boundary is decorative. Indefinite verbatim retention also exceeds anything the consent covers.
FIX: Encrypt evidence spans with the same cipher service (metadata/timestamps queryable, verbatim ciphertext) or store spans by reference to the encrypted transcript, and give verbatim retention its own purge rule in the consent/retention classes.

[SEVERITY: MEDIUM] The one-handed ABC flow breaks on its only general-purpose split control: a drag-handle on a waveform at 414px is a two-handed fine-motor interaction, and the tap alternative (`[Split at 10:02]`) only appears when a booked session bisects the segment.
WHERE: 13.2 (split/merge affordance), R6, 13.3
WHY: House rules demand 44px targets, yet unbooked multi-client audio — precisely the case needing manual splits — offers only press-drag precision on a dense time axis; the processing card's "~2 min" estimate for per-segment stitching of long days is also asserted with no basis.
FIX: Add a tap-first "split at playhead" button (44px, snapping to nearest silence/session boundary) with drag as enhancement, and derive processing estimates from measured segment duration per provider instead of a constant.
