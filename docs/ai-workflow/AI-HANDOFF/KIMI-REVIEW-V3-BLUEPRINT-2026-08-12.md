# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-COACH-V3-UX-WIREFRAMES-2026-08-12.md
**Seed:** docs/ai-workflow/AI-HANDOFF/KIMI-HY3-SEED-V3-REVIEW-2026-08-12.md
**Tokens:** 4555 in / 10664 out | **Cost:** ~$0.1736 | **Wall:** 337.2s | **finish_reason:** stop

---

## VERDICT

**APPROVE-WITH-CHANGES** — the blueprint is internally disciplined, honest about its own staleness, and faithful to the ten binding decisions, but it ships one undefined decision gate, one privacy hole, one unrecoverable data-loss path, and one proven-stale pin. None requires redesign; all must close before handoff.

Per-binding-decision:

1. Extend `coach_action_proposals`, no parallel ActionRun table — **ACCEPT** (scope of what lands in that table is challenged in P3; the table choice itself is right).
2. Ephemeral permission-checked reads; no universal ledger — **ACCEPT**, with the caveat that V3 is hiding a *write*-ledger descope behind this *read*-symmetry decision (P5, F7). The decision doesn't forbid the day-level receipt rollup; the blueprint just dropped it.
3. Preview → Apply → durable save → read-back; no optimistic "Saved" — **ACCEPT**. Strongest decision in the set; state machine and copy table mostly honor it (gaps in F5).
4. No durable utterance until Slice 11 retention contract, default off — **MODIFY**. Keep default-off and keep the gate, but author the retention contract *now*, in parallel with S5–S6, and define the minimal artifact (parsed transcript text, session-scoped, TTL, per-account). The current posture creates an unrecoverable lost-words path (F4, P2).
5. Access first, onboarding voluntary, one shared draft — **MODIFY**. The one-shared-draft architecture is excellent. The voluntary-first posture silently reverses the owner's stated product thesis and is never flagged to Sean as a business decision (F10, P1). Access-first account creation may stand; program generation should gate on onboarding completeness.
6. Allowlisted de-identified model context; narrative as quoted evidence — **ACCEPT**.
7. Payments/auth/destructive never in voice lane — **ACCEPT**.
8. One runtime, three presentations, controls once at the affected record — **ACCEPT**, with a compliance ambiguity in the Command Room wireframe (F11).
9. SNAP for ordinary saves; Crystallize only for authoritative completed workout/PR — **ACCEPT**. Budget mechanics in the state machine are coherent.
10. Hotfixes first, certification gate before migrations, expand/contract — **MODIFY**. S5 is a safety defect fix with no schema change and no dependency on S4; sequencing it behind the CI gate is wrong (F9, P4).

## FINDINGS

**F1 — BLOCKER — Gate 0 selects nothing measurable.** The doc demands Sean pick a direction, then states Directions 2 and 3 "remain specialized presentations of the same runtime." S9 already builds all three presentations (Quiet Rail / Thumb Dock / Command Room) flag-gated regardless. Direction 3 is substantially the Command Room presentation; Direction 2 is substantially the onboarding dual-view generalized. The doc never says what the selection *binds*: default presentation? signature allocation? IA priority? flag states? As written, Gate 0 is a decision ritual with no engineering consequence — or worse, a blocking gate whose unblock condition is undefined. The one concrete directional claim (Direction 1 "recommended... system-wide") is never reconciled with "one runtime, three presentations."

**F2 — HIGH — The pin is stale at review time, and the doc's own caveat is advisory.** Verification confirms origin/main moved 2 commits past `610295f` within hours, touching `backend/models/DailyWorkoutForm.mjs` — the exact S6 idempotency target, with an index-definition fix (camelCase attributes vs snake_case columns) that blocked fresh-DB table creation. The schema-drift disease class is no longer hypothetical; it is confirmed on the idempotency surface. The decision gate says receipts "are reproduced" before building — that must be a hard, fail-closed slice-entry check, not a sentence. S6's census and expand→dual→unique invariant plan are now presumptively invalidated until re-run against current main.

**F3 — HIGH — Kept-local draft tenancy is unspecified.** "Your draft is kept on this device" plus stop-recording-on-account-switch, but nothing states that persisted drafts are account-scoped or purged on logout/switch. Gyms run shared tablets across trainers [INFERENCE]; trainer B unlocking the device and seeing trainer A's client's unsent workout draft is a client-data leak created by the honest-save architecture itself. S9's slice contract must key draft storage by account and enumerate purge triggers (logout, switch, TTL, verified-save).

**F4 — HIGH — Lost-words path is unrecoverable by construction.** Wrong parse + failed save = the trainer's actual words are gone; only the (wrong) parsed draft survives on device. Mid-session, after dead sets, re-dictation is not a recovery path. "Not now → Dismiss without domain write" also never states whether the draft persists locally. Decision 4's purity is purchased with the exact data the product exists to capture. See P2.

**F5 — MED — The "exact state copy" table is not exact.** The save state machine defines `NeedsReview` covering *validation or version conflict*; the copy table has only `conflict` copy ("This record changed elsewhere..."). A pure validation failure (RPE out of range, weight non-numeric) would display a false message about external modification. Missing entirely: mic-permission-denied copy (in a dictation-first product), recording-timeout copy (timeout is a named lifecycle trigger), and partial-capture copy. Every mermaid node/edge must trace to a copy row; currently they don't.

**F6 — MED — Lifecycle abort semantics are undefined, and stop-on-hide fights the live-session use case.** The dock stops recording on hide — but phone screens auto-lock mid-set [INFERENCE]. The doc never says whether an aborted capture produces a draft from partial audio or discards it, never defines the timeout value or max recording length, and never addresses landscape. Combined with F4, a screen-lock at the wrong second silently destroys input.

**F7 — MED — The v2-mandated day-level trust ledger is dropped, not descoped.** Per-record receipts exist; "did today's logs land, by input mode, with read-back status" exists nowhere. Decision 2 killed read-symmetry ledgers, not write-truth rollups — this is a blueprint omission hiding behind a decision that doesn't cover it. The Command Room is the natural host; it is derivable from existing receipt records with no new write path.

**F8 — MED — S8 re-admits lease/fence machinery the prior adjudication killed, without justifying the async execution that would require it.** Preview hash and one-time approval consumption are clearly proportionate. Lease owner/expiry and fencing tokens defend against concurrent stale executors in multi-step operations; for the 90% case (single-step synchronous apply), the record-version check (`NeedsReview` on conflict) plus one-time consumption already fences. See P3.

**F9 — MED — S5 (injury-field safety repair, no schema change) is sequenced behind S4 (CI gate) with no dependency.** Hotfixes S1–S3 ship pre-gate by design; a safety defect of the same class waits. See P4.

**F10 — MED — A product-strategy reversal is embedded in a wireframe doc without flagging it.** "Onboarding stays voluntary after access" reverses the owner's stated thesis ("onboarding is where I pour all my data"). Gate 0 asks Sean to choose a visual direction but never asks him to ratify the strategy reversal. Decisions by omission are how products drift. See P1.

**F11 — MED — Command Room controls placement tensions with decision 8.** The law: "controls render once, beside the affected record—not duplicated in chat." The wireframe renders the proposed diff in the record column and Edit/Apply/Reject in the queue column. Either the queue item *is* the affected-record context (say so) or the controls violate the rule they cite. One sentence fixes it; its absence will spawn a per-builder interpretation.

**F12 — LOW — DRAFT badge vs one-gold-badge-per-scene.** If the DRAFT badge is the scene's gold badge, a workout with multiple in-flight draft sets breaks the law; if it isn't gold, say so. [INFERENCE that DRAFT is gold-adjacent; the doc doesn't specify.]

**F13 — LOW — Breakpoint list omits 360px**, the dominant Android viewport width [INFERENCE], and mixes width-only and full-resolution notation (2560×1440, 3840×2160) in one list. Sloppy in a doc whose authority is typographic precision.

**F14 — LOW — Voice disambiguation for same-name clients outside an open record is unspecified.** "Log set for John" from the Command Room with three scoped Johns has no defined resolution path [INFERENCE that route-context scoping is the intended answer — it isn't stated].

**F15 — LOW — 44px is legal but marginless for the stated use case.** Sweaty hands, chalk, gym gloves mid-set; the doc's own law permits 44px and stops there. A one-hand thumb-zone and primary-action placement spec is absent from the Thumb Dock section. [INFERENCE — ergonomic judgment, flagged for HY3's lane.]

## PROBE ANSWERS

**P1 — Voluntary onboarding.** The reversal is real and the doc never admits it. For trainer-led B2B2C, the trainer-run onboarding session *is* the product's data moat; making it voluntary-first with no stated nudge, empty-state cost, or completeness gating starves program generation of exactly the differentiating input. But hard-gating *access* on onboarding punishes the client who signs up at 9pm and wants to look around. The correct split: **access-first for account creation (keep V3), gate program generation on onboarding completeness (restore the owner's thesis), trainer-led completion as the defaulted, expected path.** Who decides: Sean — it is a revenue/positioning call, not an engineering one — and the blueprint's failure is presenting the reversal as settled UX rather than as a Gate-0 question with the starvation cost written next to it. Default if Sean doesn't engage: voluntary access, blocking completeness prompt at first program request, safety fields (waiver/pain/injury) required before any session logging regardless, since the doc already treats them as separate authoritative fields.

**P2 — Transcript retention.** Device-kept draft is insufficient, because the failure mode that matters is *wrong draft + failed save* — the kept artifact is the corrupted one. Ship the retention **contract** now (parallel with S5–S6), keep the implementation default-off per decision 4. Minimal artifact: parsed transcript **text only, no audio**; session-scoped; encrypted at rest; keyed to account; TTL of hours (24h ceiling) with hard purge on save-verified, dismiss, logout, account switch, and TTL expiry; excluded from logs, analytics, and model context; readable only from the draft it spawned. This is not a ledger and not surveillance; it is the difference between "your words survived long enough to correct the parse" and "the product loses the data it exists to capture." If even that is rejected, then F5's partial-capture and dismissal semantics become release-blocking, because the system must at minimum *tell* the trainer when words are about to be destroyed.

**P3 — Lease/fence proportionality.** Complexity re-creep for the 90% case, correctly identified. Minimal subset for single-step applies: (a) endpoint idempotency key (already S6), (b) preview hash binding the approval to exactly what was shown, (c) one-time approval consumption, (d) actor/subject/approver matrix, (e) record-version check at apply (already implied by `NeedsReview` on version conflict). For a synchronous single-step apply, (e) *is* the fence — a separate fencing token defends against a concurrent-stale-executor topology that doesn't exist yet. Keep lease owner/expiry and the fencing token **in the schema but behind the flag, unenforced**, activated only when the first multi-step or delegated/async operation actually ships — at which point the reconciler earns its keep too. The reconciler without async operations is a cron job reconciling nothing. The earlier adjudication's "enterprise cosplay" verdict stands for enforcement; V3's re-admission is acceptable only as dormant schema.

**P4 — Slice order.** S5 should run parallel to S1–S3. It is code/config-only, it is a safety defect (injury fields reaching models is the worst defect class this product can ship), its gate does not require S4, and the precedent is already set: S1–S3 ship before the certification gate. "We built the honesty gate before we stopped leaking injuries to the model" is an indefensible postmortem sentence. S4's falsification-proof gate must remain the entry condition for the first *schema-touching* slice (S6) — that is where it earns its cost. Reorder: S0 → S1/S2/S3/S5 (hotfix wave) → S4 (certifies the wave) → S6+.

**P5 — Trust ledger.** Real gap, and a cheap one. The v2 chain's requirement was a day-level answer to "did today's logs land?" — a write-truth surface, not read symmetry, so decision 2 does not cover the descope and nothing in V3 consciously descoped it. Per-record receipts answer "did *this* write land"; the trainer ending a day of dictated sessions needs "did *all of today's* writes land, and which are still local-only." That second question currently has no surface anywhere in the blueprint — Quiet Rail shows the record, Command Room shows the queue, nothing shows the day. Fix: a per-day receipts rollup in Command Room (and a per-record history filter client-side), derived from receipt records that already exist, listing input mode, read-back status, and kept-local items. Zero new write paths, zero ledger symmetry violation. Restore it before handoff.

**P6 — Directions and live-session ergonomics.** Direction 1 is the right recommendation for the client-facing record surface — strongest data truth, least context switching, and the only direction whose signature moment (one Crystallize per completed workout) is load-bearing rather than decorative. Direction 2's guided rail is already correct *for onboarding* and is correctly confined there; generalizing it punishes expert batch entry for a clarity benefit experts don't need. Direction 3 isn't really a direction, it's the Command Room presentation that ships anyway — which is the F1 muddle. On the wireframes themselves: desktop 2/7/3 weighting is right; proposal controls beside the record is right; collapse-to-44px-trigger with focus restoration is right. State copy is honest and the strongest part of the document. The Thumb Dock is where it gets fragile: on a 375×667 viewport, record fields + draft row + three-button row + sticky input dock + tab bar leaves the actual record — the thing the trainer glances at mid-set — with the least vertical room [INFERENCE on exact stacking; the doc gives no height budget]. The three-button row ([Edit][Not now][Apply]) fits 44px/8px law at 320px but the primary action's thumb-zone placement is unspecified, landscape is unaddressed, and stop-on-hide means a screen auto-lock mid-set kills capture (F6). Net: approve Direction 1, but the Thumb Dock needs a one-hand ergonomics pass (primary Apply in thumb arc, height budget per zone, landscape rule, abort semantics) before S9 opens.

**P7 — What the whole chain still hasn't surfaced.**
1. **Gate 0 is a gate with undefined output** (F1) — eight rounds and nobody asked what Sean's choice *does*.
2. **Draft tenancy on shared devices** (F3) — the honest-save architecture creates a new client-data exposure nobody threat-modeled.
3. **The lost-words path** (F4) — the chain obsessed over write honesty and never priced transcript destruction.
4. **Screen-lock kills dictation mid-set** (F6) — the privacy-correct stop-on-hide rule collides with the product's core use case and nobody named the collision.
5. **Landscape is absent from the entire document** — trainers rotate phones; nothing governs it.
6. **Mic-permission-denied has no copy** in a dictation-first product (F5).
7. **The re-pin caveat is already proven load-bearing** (F2) and is still written as a courtesy instead of a gate.
8. **"Timeout" and max recording length are named but never valued.**
9. **Same-name client disambiguation in the voice lane** (F14).
10. **The voluntary-onboarding reversal was never escalated as a decision** (F10) — the chain adjudicated engineering and quietly settled strategy.

## TOP 5 CHANGES TO V3 BEFORE HANDOFF

1. **Define Gate 0's binding consequence.** Amend the decision gate to state exactly what Sean's selection changes (default presentation per role, signature allocation, flag defaults) and map each direction to concrete deltas over the three S9 presentations. *Acceptance proof: a reviewer can point from each direction to the specific presentation/flag deltas it implies, and two builders given the same selection produce the same build list.*

2. **Account-scope and purge all kept-local drafts.** S9 slice contract must key local draft storage by account ID and enumerate purge triggers (logout, account switch, TTL, verified-save, delete-draft). *Acceptance proof: a test that saves KeptLocal, switches account, and shows the draft is invisible and inaccessible to the second account.*

3. **Make evidence-lock fail-closed at slice entry.** S0's re-pin becomes a hard gate: cited SHAs and receipt line references are re-verified against origin/main when each slice opens; drift blocks the slice, and S6 re-runs its census/invariant plan against current main given the proven `DailyWorkoutForm` drift. *Acceptance proof: plant a one-commit drift on a cited file (S4's falsification method) and demonstrate the slice-entry check fails.*

4. **Author the minimal transcript retention contract now; implementation stays default-off.** Parsed-text-only, session-scoped, TTL ≤24h, account-keyed, purged on verify/dismiss/logout/switch, excluded from logs and model context; drafted in parallel with S5–S6 so S9 can reference it and S11 only implements it. *Acceptance proof: the contract document exists with TTL, purge triggers, and scoping fields before S9 opens, and the "Not now" flow cites which purge trigger it invokes.*

5. **Reorder S5 into the S1–S3 hotfix wave; keep S4 as the gate for first schema contact (S6).** *Acceptance proof: the slice index shows S5 parallel with S1–S3 with an explicit note that S4's certification (with falsification proof) gates S6+, and no schema-changing slice is reachable before S4 passes.*
