# Tencent Hy3 - Design Inspiration

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-COACH-V3-UX-WIREFRAMES-2026-08-12.md
**Seed:** docs/ai-workflow/AI-HANDOFF/KIMI-HY3-SEED-V3-REVIEW-2026-08-12.md
**Tokens:** 4704 in / 8942 out | **Cost:** ~$0.0054 | **Wall:** 130.4s | **finish_reason:** stop

---

## VERDICT
APPROVE-WITH-CHANGES: Blueprint is structurally aligned with V3 binding decisions and slices but is pinned to a stale SHA, contains a state-copy violation, and its voluntary-onboarding default creates a product-starvation consequence that must be corrected before handoff.

Per-binding-decision status:
1. Extend `coach_action_proposals` (no parallel ActionRun) — ACCEPT
2. Reads/navigation ephemeral, permission-checked, no universal ledger — ACCEPT
3. Write truth: preview→Apply→durable save→read-back; no optimistic "Saved" — MODIFY (workout-row example shows "Saved to workout #…" pre-Verified; state table omits NeedsReview)
4. NO durable raw utterance/audio until separate contract (S11 default-off) — ACCEPT
5. Onboarding ACCESS FIRST, VOLUNTARY, one shared draft — ACCEPT as written, but see P1 product consequence requiring UX default change
6. Context allowlisted, de-identified, narrative quoted not instruction — ACCEPT
7. Payments/auth/destructive never in voice lane — ACCEPT
8. One Coach runtime, three presentations, controls render once at record — ACCEPT
9. Motion: inline SNAP ordinary, Crystallize only for authoritative completed workout/PR — ACCEPT
10. Release: hotfixes first, cert gate before migrations, expand/contract — ACCEPT

## FINDINGS
1. [HIGH] Stale pin / schema drift not reflected. Document states "Current main is `610295f`; its only deltas … isolated QA-database files and coordination tooling/review docs" and claims no model changes. Ground truth proves origin/main moved past pin with `backend/models/DailyWorkoutForm.mjs` index fix (camelCase vs snake_case) on the exact S6 idempotency target table. Blueprint must re-pin and warn that the table cannot be created fresh until that fix lands. [INFERENCE from seed verification]
2. [MEDIUM] State-copy table quality defect. Exact state copy lists `verified: Saved and verified.` and `offline: Not saved yet…` but omits a `needs review` row despite state machine `NeedsReview` (validation/version conflict). Additionally the Workout row wireframe shows `Status: Saving… → Saved to workout #… → Verified`, injecting an optimistic "Saved" intermediate forbidden by Binding 3.
3. [HIGH] P1 activation-flow product consequence. "Onboarding stays voluntary after access" with only explicit resume/skip/delete hides the data gap. For trainer-led B2B2C the trainer pours data to differentiate programs; silent skip starves generation. Default must surface "program will be generic until X fields filled" and prompt trainer completion, not bury skip.
4. [MEDIUM] Slice order unsafe. S5 (F13 + onboarding field dictionary, no schema change, safety-critical injury mapping) is sequenced after S4 CI gate despite no dependency. Should run parallel to S1–S3 hotfixes because narrative→safety-field mis-mapping is a live risk.
5. [MEDIUM] Day-level trust view dropped. V2 required per-day "did today's logs land?" ledger; V3 shows only per-record receipts. For trainer multi-client throughput this is a real operational gap. A read-only derived daily aggregation in Command Room (not a new ledger table) is required.
6. [LOW] Concept-selection ambiguity. Gate 0 says "Sean selects one direction" yet D2/D3 are described as "specialized presentations of the same runtime." This contradicts; must clarify D1 = client/default, D3 = trainer desktop, D2 = onboarding, selection is default client presentation only.
7. [MEDIUM] Lost-words recovery insufficient. Device-kept draft is post-parse; wrong parse + failed save loses raw utterance. Binding 4 forbids durable raw, but an ephemeral session-scoped encrypted TTL transcript cache (not persisted beyond session) should ship earlier (S3/S5) to let trainer recover exact words.
8. [LOW] Accessibility nuance. Responsive/accessibility gates list "no nested interactives" but workout row combines inline editable inputs with `[Edit][Not now][Apply]` buttons; blueprint must explicitly forbid nesting those inside one interactive widget.
9. [LOW] Crystallize budget vague. "route's single registered Crystallize" needs explicit per-route/session scoping definition to prevent double-spend confusion across presentations.

## PROBE ANSWERS
P1 — Voluntary-first reverses owner vision. For trainer-led B2B2C the trainer is the data-entry actor; silent voluntary skip starves customized program generation, the product's core differentiator. Default must not be silent skip: access first stands, but onboarding should auto-initiate in trainer flow with explicit "defer with consequence" showing generic-program warning. Owner (Sean) should decide final copy, but UX must make the data gap visible. Product consequence: activation flow must include a "missing fields → generic workout" state, not just a hidden draft.

P2 — Device-kept parsed draft is NOT sufficient. If parse is wrong and save fails, the trainer's actual words are gone; they may not catch the bad parse mid-set. Minimal transcript retention (session-scoped, encrypted, short TTL, discarded on successful read-back) should precede S11's separate durable contract. This is not "durable raw utterance" per Binding 4; it is crash/recovery buffer.

P3 — S8 lease/fence/reconciler is proportionate only for multi-step cross-entity admin ops. For the 90% single-step apply (trainer applies own-scope draft to one record) the minimal subset is: preview hash (ensure shown=applied), idempotency key (S6), actor/subject/approver matrix check. Lease owner/expiry, fencing token, reconciler should be split into optional hardening gated by role, not mandated for all writes.

P4 — S5 should run parallel to S1–S3. It is safety-critical (injury/pain mapping dictionary) with no schema change and its gate does not require S4. Sequencing after S4 needlessly delays injury-to-AI defect repair. Reorder: S5 starts with hotfixes.

P5 — Real gap, not acceptable descope. Per-record receipts satisfy Binding 2's "no universal ledger," but trainers need day-level aggregation. Solution: add a derived "today: X verified / Y pending" read-only strip in Command Room sourced from existing receipts; no new ledger table, preserving symmetry ban.

P6 — (HY3 lane) Three directions: D1 Crystal Ledger is correct system-wide recommendation for client/phone because record owns conversation, least context switch, safe mid-set. D2 Guided Refraction fits onboarding but hurts expert batch. D3 Command Plane fits trainer desktop but must never leak operator chrome to client. Wireframes: Desktop Quiet Rail 2/7/3 grid sound; Phone Thumb Dock sticky, safe-area, 44px, ≤5 tabs, no horizontal scroll is correct for one-handed trainer mid-set. At 320–430px the workout row inline Weight/Reps/RPE inputs must enforce 44px targets and the `[Edit][Not now][Apply]` must be thumb-reachable without scroll. State-copy table is precise except missing NeedsReview and the row example violates Binding 3. Responsive/accessibility gates listed are strong but must explicitly ban nested interactives in that row. Verdict: accept D1 as default, but blueprint must clarify "selection" means client default not mutual exclusion.

P7 — Still unsurfaced: (a) S6 table creation broken on fresh DB via index bug — UX assumes idempotency works; (b) onboarding safety-field suggested mappings need explicit pending-confirmation UI not specified; (c) mic lifecycle "permission loss" stop is listed but no UI state copy for mid-capture permission revoke; (d) "single registered Crystallize per route" undefined across simultaneous sessions; (e) no mention of how `dvh` keyboard-open resize affects dock on 320px.

## TOP 5 CHANGES TO V3 BEFORE HANDOFF
1. Re-pin blueprint to current origin/main and insert schema-drift warning on `DailyWorkoutForm.mjs` — Acceptance proof: document shows new pin SHA and explicit note that S6 target table requires index fix before fresh create.
2. Correct state copy: delete "Saved to workout #…" intermediate in workout row, add `needs review` row to exact table — Acceptance proof: workout row example reads `Saving… → Verified` only, and table includes `needs review: Review and correct before applying.`
3. Modify onboarding activation flow to show defer-consequence UI (generic program warning + trainer prompt) — Acceptance proof: onboarding wireframe includes explicit "Skip for now → program will be generic until fields filled" with trainer nudge, not silent skip.
4. Reorder slices: move S5 to start parallel with S1–S3 — Acceptance proof: slice plan shows S5 with no dependency on S4 and overlapping start dates with hotfixes.
5. Add Command Room daily verification summary (derived read-only) — Acceptance proof: Command Room wireframe includes a non-interactive "Today: X verified / Y pending" strip sourced from receipt states, no new ledger table.
