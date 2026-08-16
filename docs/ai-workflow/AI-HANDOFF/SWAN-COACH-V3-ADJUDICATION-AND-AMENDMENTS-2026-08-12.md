---
decision: V3 blueprint APPROVED-WITH-AMENDMENTS — unanimous three-reviewer verdict (Fable, Kimi K3, HY3); 8 blocking amendments before builder handoff, 2 owner decisions surfaced
status: open
supersedes: none
---

# Swan Coach V3 — Final Adjudication and Required Amendments

> **Date:** 2026-08-12 · **Adjudicator:** Claude Fable 5 (Final Decider) · **Seats this round:** Fable (verification + review), Kimi K3 ($0.1736), HY3 ($0.0054) — both seats' first V3 exposure (their V3-panel seats 401'd; this closes that gap)
> **Subject:** the five V3 artifacts at `C:/tmp/sspt-gpt-claude-review-20260812/` (index, evidence/decisions, build contract, UX wireframes, panel receipt)

## 1. Verdict

**APPROVE-WITH-AMENDMENTS — unanimous across all three reviewers.** V3 is the best-evidenced artifact this chain has produced: every cited SHA is real, receipt rows verify at the pin, the Design Brain ancestry is true, the panel receipt is honest about its own failures, and the falsification-proof CI gate encodes this chain's hardest lesson. The ten binding decisions are substantially right. It is not yet safe to hand to a builder: one internal contradiction, one undefined decision gate, one privacy hole, one unrecoverable data-loss path, one already-stale pin, and two silently-settled owner decisions must close first.

## 2. Verification results (Fable, fresh, [VERIFIED] unless noted)

- All claimed SHAs exist (`610295f` pin, Design Brain commits `2ca87f7`/`75b3dbc`/`1bf3018`/`c41c47b`/`0ff8523`). Pin-to-audit-base diff = 11 files, QA-db + coordination tooling only — claim TRUE at pin time.
- **The pin is ALREADY stale.** origin/main is now `1041eb4d4`, 2 commits past the pin, touching `backend/models/DailyWorkoutForm.mjs` — the EXACT table Slice 6 targets. The change fixes model indexes that cited camelCase attribute names against snake_case columns (table could not be created on a fresh DB; production unaffected because it never syncs). This simultaneously proves V3's re-pin caveat necessary within hours AND confirms the schema-drift disease class on the idempotency target.
- New QA-db tooling landed on main (`docker-compose.qa.yml`, `scripts/qa/qa-db.mjs`, `scripts/qa/qa-schema.mjs`) — Slice 4's certification gate should BUILD ON this instead of inventing parallel infrastructure. V3 predates it and doesn't know it exists.
- Design Brain files V3 binds to all exist on origin/main (design.md, typography-grid.md w/ B7, motion.md, components.md, qa-gates.md, adapters/product-surfaces.md).
- Receipt spot-checks at pin verify (`sessions.mjs:2064` raw-body block route; `dailyWorkoutFormRoutes.mjs:611` POST).
- Reviewer-claim audit: every checkable claim from Kimi and HY3 this round was verified against the V3 text before adoption — zero fabrications from either seat.

## 3. Blocking amendments (apply to V3 before handoff)

A1 — **Define what Gate 0 binds.** (Kimi F1 = HY3 #6; the round's best catch.) "Sean selects one direction" while D2/D3 "remain specialized presentations of the same runtime" and S9 builds all three presentations regardless. State exactly what the selection changes: default presentation per role, signature allocation, flag defaults, IA priority. Resolution both reviewers accept: D1 = system default (client record surfaces), D2 = onboarding presentation, D3 = trainer/admin Command Room — the "selection" is ratifying D1 as default, not choosing between products.
  *Proof: two builders given the same selection produce the same build list.*

A2 — **Fix V3's self-contradiction in the workout row.** (HY3.) The wireframe shows `Saving… → Saved to workout #… → Verified` — an optimistic "Saved" intermediate that Binding Decision 3 forbids. Must read `Saving… → Verified` (or "Saved" strictly AFTER read-back, never before).
  *Proof: no state string outside the copy table; row example matches the state machine.*

A3 — **Complete the state-copy table.** (HY3 + Kimi F5.) Missing rows for states the machine defines or the lifecycle names: `needs_review` (validation failure — the current `conflict` copy would falsely blame external modification), mic-permission-denied (in a dictation-first product), recording-timeout, partial-capture/abort. Every Mermaid node and lifecycle trigger must trace to a copy row.
  *Proof: node/edge → copy-row audit table with zero gaps.*

A4 — **Make the evidence-lock fail-closed at slice entry.** (Kimi F2 + Fable.) Re-pin is currently a courtesy sentence; the DailyWorkoutForm drift proves it load-bearing. Each slice re-verifies its cited SHAs/receipts against origin/main at open; drift blocks the slice. S6 must re-run its census against current main. S4 should adopt the new `scripts/qa/` tooling.
  *Proof: plant a one-commit drift on a cited file (S4's own falsification method) and show the slice-entry check fails.*

A5 — **Account-scope and purge kept-local drafts.** (Kimi F3 — new threat nobody in 8 rounds modeled.) "Kept on this device" + shared gym tablets = trainer B sees trainer A's client's unsent workout draft. Key local drafts by account; purge on logout, account switch, TTL, verified-save, delete-draft.
  *Proof: test — save KeptLocal, switch account, draft invisible to the second account.*

A6 — **Author the minimal transcript-retention contract NOW; implementation stays default-off.** (Kimi F4/P2 + HY3 #7 — convergent.) Wrong parse + failed save currently destroys the trainer's actual words; the kept artifact is the corrupted one. Contract: parsed TEXT only (no audio), session-scoped, account-keyed, encrypted, TTL ≤ 24h, hard purge on save-verified/dismiss/logout/switch/TTL, excluded from logs/analytics/model context, readable only from the draft it spawned. Drafted parallel with S5–S6; S11 merely implements it. This is a crash-recovery buffer, not retention — it does not violate Binding 4.
  *Proof: contract doc exists with TTL/purge/scoping before S9 opens; the "Not now" flow cites which purge trigger it invokes.*

A7 — **Reorder S5 into the hotfix wave.** (Unanimous.) S5 (injury/field-dictionary safety repair) has no schema change and no S4 dependency; sequencing it behind the CI gate delays the worst defect class this product can ship. New order: S0 → S1/S2/S3/S5 parallel → S4 certifies the wave → S6+ (S4 remains the hard gate for first schema contact).
  *Proof: slice index shows S5 parallel with S1–S3; no schema-touching slice reachable before S4 passes.*

A8 — **Restore the day-level trust view as a derived read-only rollup.** (Unanimous; v2 G7.) Binding Decision 2 killed read-symmetry ledgers, not write-truth rollups — the descope hides behind a decision that doesn't cover it. A "Today: X verified / Y pending / Z kept-local" strip in Command Room (+ per-record history filter), derived entirely from existing receipt rows. No new write path, no new table.
  *Proof: Command Room wireframe includes the strip, sourced from receipt states only.*

A9 — **Freestyle runs BESIDE the file contract, never through it.** (Added 2026-08-16, GLM-5.3 review, slice S0.) `useTranscriptIntake`'s `uploadTranscript(file: File, clientId: number)` signature, its single-client/single-date binding, and its `duplicate_date`/`future_date` upload-failure semantics **must not be edited to absorb freestyle**. A sibling session-based path is added instead; per-item apply reuses the existing proposal machinery. Porting the file path onto the session engine is a later, separately-tested slice.
  *Proof: the existing PLAUD upload flow's contract tests pass unchanged while freestyle ships.*

### Amendments that gain new load under freestyle (2026-08-16)

- **A3 (state-copy completeness)** — the copy-row audit now includes the nine freestyle rows added to
  the V3 doc and every node/edge of the freestyle state machine. Proof standard unchanged: zero gaps.
- **A5 (account-scoped drafts)** — extends to freestyle **session buffers**: audio and interim text are
  account-keyed, encrypted, and purged on logout/account-switch/TTL/discard. The shared-gym-tablet test
  now includes: *start freestyle as trainer A, switch accounts, trainer B sees nothing.*
- **A6 (transcript retention contract)** — becomes **load-bearing, not default-off courtesy, for the
  freestyle path specifically**. Freestyle must not ship without it implemented. Contract authored at
  `SWAN-COACH-FREESTYLE-RETENTION-CONTRACT-2026-08-16.md` (draft, awaiting Sean's ratification). The
  file-upload PLAUD path keeps the original default-off posture.
- **A8 (day-level trust rollup)** — the strip now sources freestyle receipt states too.

A1, A2, A4, A7 are unchanged in letter. A4's re-pin gate applies to every freestyle slice; the
2026-08-16 re-pin found **323 files changed** since the V3 pin, including a `WorkoutLoggerCoachTerminal`
that did not previously exist — see the re-pin receipt in the V3 wireframes doc.

### Sean's ratifications (2026-08-16)

- **Contradiction handling: latest-wins with a collapsible trace.** RATIFIED.
- **Future-dated items: always route to `plan_edit`, never a workout log.** RATIFIED. Not permitted
  even behind a flag.

Owner decisions D1 (onboarding gating) and D2 (dormant lease schema) below remain **untouched by
freestyle and still unratified**.

## 4. Owner decisions V3 settled silently — Sean must ratify explicitly

D1 — **"Access first, onboarding voluntary" reverses your stated thesis** ("onboarding is where I pour all my data so we can build customized workouts"). All three reviewers flag it; none of us should decide it. The synthesis both seats recommend: keep access-first account creation; gate PROGRAM GENERATION on onboarding completeness with a visible "program will be generic until these fields are filled" consequence (never a silent skip); trainer-led completion stays the defaulted, expected path; safety fields (waiver/pain/injury) required before any session logging regardless.

D2 — **Lease/fence machinery in S8: dormant schema, deferred enforcement.** (Kimi P3 + HY3 P3, convergent.) For single-step applies, preview hash + one-time approval consumption + idempotency key + role matrix + record-version check already fence everything that exists. Ship lease owner/expiry/fencing-token columns in the schema but UNENFORCED behind the flag; activate (with the reconciler) only when the first genuinely multi-step/async operation ships. The earlier "enterprise cosplay" adjudication stands for enforcement; V3's re-admission is acceptable as dormant schema only.

## 5. Advisory (non-blocking, fix in S9's normal course)

- Command Room controls placement: state that the queue item IS the affected-record context, or move Edit/Apply/Reject beside the diff (Kimi F11).
- Screen-lock/stop-on-hide collides with mid-set capture: define abort semantics (partial-capture draft vs discard), timeout value, max recording length, landscape rule (Kimi F6/P7).
- Thumb Dock one-hand pass before S9: primary Apply in thumb arc, per-zone height budget on 375×667, `dvh` keyboard-open behavior at 320px (HY3 + Kimi P6).
- Add 360px to the responsive matrix (dominant Android width — extends, not replaces, the house matrix); unify width vs resolution notation (Kimi F13).
- DRAFT badge vs one-gold-badge-per-scene: state whether DRAFT is gold; if so, multiple in-flight drafts break the law (Kimi F12).
- Same-name client disambiguation in the voice lane outside an open record: state that route/record context scopes the target and ambiguity is refused (Kimi F14; consistent with v2's G10).
- Mic lifecycle: copy for mid-capture permission revoke (HY3 P7c).

## 6. Costs and provenance this round

| Seat | Cost | Novel contribution |
|---|---|---|
| Fable (me) | $0 | SHA/diff/ancestry verification; stale-pin + DailyWorkoutForm drift + QA-tooling overlap; trust-ledger drop; voluntary-onboarding flag; reviewer-claim audit |
| HY3 | $0.0054 | Binding-3 self-contradiction; missing needs_review row; Gate-0 ambiguity (independent); dvh/nested-interactive/thumb-reach specifics; defer-consequence onboarding UX |
| Kimi K3 | $0.1736 | Gate-0 binds nothing (deepest form); draft tenancy on shared devices; screen-lock collision; landscape absence; transcript-contract design; dormant-schema compromise; timeout/max-length unvalued |

Both seats: `finish=stop`, one call each, no retries. Chain total this round: **$0.179**.
