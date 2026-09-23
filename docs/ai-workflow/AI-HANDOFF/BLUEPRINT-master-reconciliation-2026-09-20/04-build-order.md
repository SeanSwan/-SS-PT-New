**[VERIFIED — decision]** Use this queue. It is a scheduling decision unless the dependency table explicitly marks a hard edge.

| Order | Work | Exit needed before advancement |
|---|---|---|
| 0 | **L6 provisional rescue** | Available vulnerable candidates copied; unresolved gaps visible |
| 1 | **M0 stable preservation** | Reconciled inventories, verified copies and storage attestation |
| 2 | **M1 shared manual substrate** | Canonical policy amendment, registry, supplied evidence tests and owner recorded |
| 3 | **M2 lane admission preparation** | Exact source, authority, dependency boundaries and executable acceptance index for the next lane |
| 4 | **L6 S0 closure only** | Existing salvage acceptance reconciled with the new preservation evidence |
| 5 | **L4 S5, then S6–S8** | Each inherited slice admitted separately; latest correctness findings resolved against exact bytes |
| 6 | **L8 R6.1** | Theme behavior and shared boundary contracts verified |
| 7 | **L1 A** | Signature enhancement verified with existing home, fallback and conversion behavior retained |
| 8 | **L3 Phase 1** | Current schema/loader contracts rebound; knowledge and event behavior verified |
| 9 | **L2 harness** | Submission/action/recovery boundaries verified; any real L3 consumer edge satisfied |
| 10 | **L5 email epic** | Existing slice order and checkpoint contract fulfilled |
| 11 | **L7 Phases 0–2** | Existing API contract verified before native implementation; scoped vertical slice accepted |
| 12 | **L6 remaining merge/runtime work** | Preserved candidates integrated under existing L6 decisions and reviews |
| 13 | **L1 B Stage 1** | Compatible dependency cohort verified while remaining on React 18 |
| 14 | **L1 B Stage 2** | Separate React 19 migration accepted with bounded rollback |
| 15 | **M3 combined integration** | Final integrated revision and affected consumer boundaries verified |

Reasons for the chosen priorities:

- L6 preservation is first because it addresses reported data-loss exposure.
- L4 is the first product candidate because its supplied package has the strongest source-backed readiness claim, subject to unresolved review evidence.
- L8 precedes L1 A to settle theme behavior before overlapping visual integration.
- L3 precedes L2 as a planning convenience for any confirmed knowledge consumer; this is not an invented universal dependency.
- The dependency migration follows the product queue to avoid moving the web baseline underneath multiple unaccepted lanes.

**Bounded queue exception**

A blocked lane does not stop an independent later lane indefinitely. The integration owner may advance the next lane only after recording:

1. The blocked lane and concrete blocker.
2. No unmet hard dependency.
3. No unresolved shared-file ownership or contract conflict.
4. The later lane’s own admission evidence.
5. The updated queue entry.

The owner may not waive a blocker, change lane scope, change reviewer authority or bypass a dependency.

---

## Queue entry updates

### Row 4 — L6 S0 closure only — **builder work complete; `pending` is operator-owned**

- Blocked lane / concrete blocker: **none blocking the builder.** Record 12 §5 named two
  builder-actionable items; both are discharged in **record 22**.
- Unmet hard dependency: **none.** S0 declares no source edits; none were made.
- Shared-file ownership or contract conflict: **none.** All staging was done in a scratch index
  (`C:/tmp/idx-a8b`); the salvage worktree's real index was never touched.
- Later lane's own admission evidence: **record 22** — A8 measured at the commit step (83 staged,
  exact set match, 0 index-vs-disk mismatches) and the destination divergence quantified
  (14 of 83 paths differ; 13 larger, `app.css` smaller).
- Updated queue entry: **this entry.**

**Still operator-owned:** S0's `pending` log entry (`07-checkpoints.md:87`) is not changed by this
queue update. The one open question is whether the destination's newer untracked content for those
14 paths gets its own preservation record before S0 closes — with `app.css` examined first.

### Row 12 — L6 remaining merge/runtime work — **advanced on the strength of record 22**

Committed: `8536bc4f8` (record 22 + the S0-BEFORE manifest as durable evidence).

The builder-visible portion of this row is the destination's divergent content, now measured
rather than unknown. The merge itself stays gated on the operator's §5 ruling above, because
integrating newer content over a `pending` S0 would move the baseline underneath an unclosed
slice.

### Row 11 — L7 Phases 0–2 — **Slice 0.1 landed**

Committed: `0464cf7f5` (8 authored files). AC-0.1.2 PASS, AC-0.1.3 PASS non-vacuous,
**AC-0.1.1 NOT RUN** (no iOS simulator or Android emulator on this host — structural, not an
oversight). Slice 0.2 must not start until the operator checkpoint.

### Row 7 — L1 A — **halt superseded by measurement; browser harness landed; A7 still gated**

Committed: `7adbdb250` — record 23 + 3 harness files.

- Blocked lane / concrete blocker: **record 18's halt is superseded, not overridden.** All eight
  files record 18 named are quiet — last write 14:43:06, *inside* record 18's own 14:39–14:42
  window — with 0 files touched in 30 min, no `index.lock`, and HEAD unchanged. The halt was a
  momentary live writer, not a standing ownership claim.
- Unmet hard dependency: **A7's is still unmet.** Its exit evidence requires
  *"reference-informed"*, and A0r §9 records the reference screenshots as **NOT TAKEN**. A
  configured path to a browser is now supplied; it does not make the composition
  reference-informed.
- Shared-file ownership or contract conflict: **none.** No product code modified. No lane package
  edited.
- Later lane's own admission evidence: **record 23** — config loads, `tsc --strict` EXIT=0,
  chromium present, `dist` rebuilt (it was stale: `index.html` 14:14 vs sources 14:43), and the
  smoke spec **2 passed (4.2s) in a real browser**.
- Updated queue entry: **this entry.**

**Note on the smoke run:** its first attempt failed correctly — a plain page load fires
`POST /api/dashboard/track-pageview` (`src/utils/pageViewTracker.ts:6`), which the boundary
recorded and aborted. The assertion was wrong, not the app; it now asserts the ban's real property
(no mutation *escapes*) with a positive control that the beacon is observed.

**A9 / A10 / A11 — NOT STARTED.** Their cases are unwritten. A11 additionally needs production-route
performance measurement this host cannot supply.

### Row 10 — L5 S1 (templates + unsubscribe tokens) — **committed `786d0b8ca`**

- Blocked lane / concrete blocker: **none.** Slice scope was pure modules with zero integration
  (`backend/services/emailTemplates.mjs`, `backend/services/leadUnsubscribeToken.mjs`,
  `backend/__tests__/emailTemplates.test.mjs`). Three files declared, three files built, three
  files committed — no scope stretch.
- Unmet hard dependency: **none.** No DB, no transport, no integration, no reference screenshots.
- Shared-file ownership or contract conflict: **none, and this was checked rather than assumed.**
  A pre-existing ` M backend/utils/emailTemplates.mjs` appeared in `git status` and looked like an
  overlap. Four probes settled it as a **peer edit in a different module**:
  1. `git log -- backend/utils/emailTemplates.mjs` → **empty** (no commit ever touched it);
  2. `git cat-file -e HEAD:backend/utils/emailTemplates.mjs` → **succeeds** (genuine tracked
     modification, not a phantom);
  3. the diff is a **complete** refactor (local `esc()` deleted, `escapeHtml` imported from
     `backend/utils/htmlEscape.mjs`, which exists and is tracked at blob `24a6e2bc8`) with
     **zero residual `esc(` calls** and 9 named exports loading cleanly — not half-applied;
  4. `backend/utils` was quiet (0 files touched in 30 min), no `index.lock`, HEAD unchanged.
  The two modules are **not duplicates**: `utils/` is the transactional set
  (`sessionBookedEmail`, `sessionCancelledEmail`, `SMS`, …); `services/` is the L5 marketing
  `stl_*` follow-up set. **No export-name collision, and the contract's named path is not in
  conflict.** The peer file was therefore **left unstaged**, and the commit contains exactly the
  three S1 files (3 files, 755 insertions).
- Later lane's own admission evidence: **44/44 tests pass** post-commit
  (`npx vitest run __tests__/emailTemplates.test.mjs`). The three subjects were verified
  **byte-for-byte** against `02-wireframes.md` — including the ASCII straight `'` in
  `stl_instant_reply` and the em dash as `342 200 224`.
- Updated queue entry: **this entry.**

**Note on a false alarm during verification:** `git rev-list --count HEAD` fails with
`Could not read 3bc947da5`. This was checked against the parent before being attributed:
it reproduces **identically at `HEAD~1` and at `7575e9c02`** (the commit before S1), and
`git cat-file -e 3bc947da5` reports **ABSENT**. It is one of the two recorded Class-D losses,
reached through an **older ancestor** (`99b970bd4`), not through this slice. The S1 commit's own
tree is verified self-contained — `git ls-tree -r HEAD | grep -c 251d234a5` → **0**.

**S2 and beyond — NOT STARTED.** They are integration slices; S1 deliberately stops at pure modules.

### Row 10b — L5 S3 (email channel in the processor) — **BLOCKED; in-scope artifact landed**

- Blocked lane / concrete blocker: **S3's declared file set cannot satisfy S3's own acceptance
  criteria.** The email branch the slice asks me to fill is unreachable:
  `automationDecisionService.mjs:86` fails every non-SMS channel before any recipient logic runs,
  so a due email log returns `{"action":"fail","reason":"channel_not_implemented"}` and
  `automationService.mjs:299-308` `continue`s past the send branch at `:312`. Measured directly
  (record 24 §2), not inferred. The fix lives in `automationDecisionService.mjs`, which S3 does
  **not** declare and which ban #2's "three spots" enumeration does not cover. Widening the diff
  would breach ban #2; skipping the criteria would breach *"fail VISIBLE, never silent."*
- Unmet hard dependency: **a ruling** — may `automationDecisionService.mjs:86` be widened to admit
  `channel === 'email'`? Recorded in **record 24**, which is the deliverable of this row.
- Shared-file ownership or contract conflict: **none.** `automationService.mjs`, `sendgridService.mjs`
  and `automationDecisionService.mjs` all still carry an **Aug 16 17:12** mtime — untouched since the
  blueprint was written. Nothing was modified in any of them.
- Later lane's own admission evidence: **`emailAutomationSender.test.mjs` — 16 tests, 0 fail.**
  All five contract refusal literals asserted exactly (`missing_recipient`,
  `lead_email_unsubscribed`, `unknown_template:<name>`, `sendgrid_not_configured`,
  `sendgrid_error:<message>`), plus never-throw and the PII masking rule. Isolation proven: the
  suite passes identically with `SENDGRID_API_KEY` blanked, so it never touches the live API.
- Updated queue entry: **this entry.**

**Downstream consequence:** S4 (speed_to_lead sequence) and S5 (admin visibility) both read a
deliverable email channel, so they inherit this block. S5's frontend card is independently
buildable and is the natural next lane; S4 is not.

**Two pre-existing findings surfaced while isolating this (record 24 §5):** the decision service
rejects email for the *wrong reason* (ordering, not permission), and `tests/setup.mjs` has no
outbound-SendGrid guard while `backend/.env` carries a live key — ban #4 only protects tests that
choose to mock.

### Row 10c — L5 S5 (admin visibility) — **committed; all four acceptance items PASS**

- Blocked lane / concrete blocker: **none.** Unlike S3, every file S5 touches is declared by S5,
  so the slice's file set can reach its own deliverable.
- Unmet hard dependency: **none measurable.** Note that S5's card reads
  `channel === 'email'` rows from `/api/automation/preview`, and those rows cannot yet be *sent*
  (S3's block). The card is correct as built — it will simply report an empty/zero state until the
  email channel is made deliverable. This is a display of reality, not a defect.
- Shared-file ownership or contract conflict: **none.** `automationSafetyRoutes.mjs`
  (Jun 16 23:54) and the whole `marketing/` directory (Aug 16 17:12) were at blueprint-era mtimes;
  0 files touched in 30 min. Nothing else was modified.
- Later lane's own admission evidence:
  - **AC1** — `SpeedToLeadStatusCard.test.tsx` → **11 tests, 0 fail** (≥6 required): armed badge
    on/off, pending count, masking with the **full address asserted absent from `container.innerHTML`**,
    non-email channels filtered, empty-state copy, error-state copy, and the 44px `min-height` rule
    asserted against the emitted stylesheet.
  - **AC2** — `npx tsc --noEmit` → **0 errors** (`grep -c "error TS"` → 0). Needed
    `--max-old-space-size=8192`; the repo's full typecheck OOMs at the 4 GB default.
  - **AC3** — `listEmailTemplates()` returns all three templates with `{name, subjectPreview}`;
    the route now returns `data.emailTemplates`.
  - **AC4** — `MarketingWorkspace.tsx` diff is **7 insertions, 1 deletion** (the single deletion is
    the `LeadPipelinePanel` line re-indented into the fragment): lazy import beside `:31`, mount
    directly above `<LeadPipelinePanel .../>`. Nothing else changed.
- Regression: `LeadPipelinePanel.test.tsx` (6) + `MarketingWorkspace.commandCenter.test.ts` (13)
  → **19/19 pass**, so the mount did not disturb the existing workspace.

**On the masking criterion:** asserted the *strong* form — not merely that `j***@gmail.com` appears,
but that the raw addresses (`jane@gmail.com`, `marcus@yahoo.com`, `kate@aol.com`) appear **nowhere**
in the rendered markup. Masking is done in the render layer, per 06-bans.md, and `maskAddress`
returns `''` rather than a partial leak for anything not address-shaped.

### Row 10d — L5 S6 (runbook, NO code) — **committed**

- Blocked lane / concrete blocker: **none** — S6 is documentation and depends on nothing to *write*.
  It is, however, explicit that the procedure is **not yet executable** (see below).
- Unmet hard dependency: **the feature S6 documents does not exist yet.** Two open blockers,
  stated in the runbook's §0 rather than buried: (a) S3's email-channel block makes the branch
  unreachable, and (b) the `speed_to_lead` sequence is a `DEFAULT_SEQUENCES` entry S4 has not added —
  only `lead_nurture` exists today.
- Shared-file ownership or contract conflict: **none.** No code touched; one new markdown file.
- Later lane's own admission evidence: the runbook ships all seven mandatory sections (pre-flight,
  owner-only live test, activation, kill switch, monitoring, rollback, and the double-messaging
  rule). **Every cited line number was re-verified against the source** before committing:
  `automationArmState.mjs:14` (the literal `'true'` check), `automationService.mjs:48`
  (`isActive: false`), `:312` (the send branch), `automationDecisionService.mjs:86` (the channel
  gate). The mechanics were read, not assumed.
- Updated queue entry: **this entry.**

**Two accuracy decisions worth flagging.** First, §0 leads with *"the feature is NOT activatable
today."* A runbook that tells the owner to activate a half-built feature is worse than no runbook,
and the blockers are the most important thing Sean needs to know. Second, the runbook deliberately
does **not** cite `SPEED_TO_LEAD_REPLY_ENABLED`: a consumed Hermes note from 2026-07-22 describes a
*different* speed-to-lead feature (an instant-reply flag), and that flag appears **nowhere in
`backend/`** — neither the flag nor its runbook file is present in this tree. Citing it would have
sent Sean looking for a switch that does not exist here. The drip sequence and that flag are
distinct mechanisms.

**Consistency note:** the pre-existing `DEFAULT_SEQUENCES` comment (`automationService.mjs:43-45`)
already says the email channel is *"not yet built"* and that `lead_nurture` stays inactive *"until
that lands."* S3's block is therefore the anticipated dependency, not a surprise introduced here.

### Cross-cutting — `11-lane-test-index.md §3` L5 measurement is superseded (record 26)

The lane test index measured L5 at `2026-09-20T17:30` and recorded **every named L5 artifact as
`NOT FOUND`**. Re-measured at `6407f6b40` with `git cat-file -e HEAD:<path>`: **7 of 9 are now
PRESENT** (S1's two modules + suite, S2's suite, S3's sender, S5's component + suite). The two still
absent are S3's processor test (blocked — see row 10b) and S4's sequence test (not started), i.e.
both absent for the same named reason rather than by drift.

**Also resolved in passing:** the index's L5 *"path drift"* note (S1/S3 declared as `__tests__/…`,
S2 as `tests/api/…`) is **not** a real drift. Both declared conventions resolve literally when read
relative to `backend/` — verified by execution, not argument: `npx vitest run
tests/api/leadUnsubscribe.test.mjs` → 11/11, `npx vitest run __tests__/emailTemplates.test.mjs` →
44/44, both from `backend/`. No reconciliation is owed at admission.

**The index's `EXTEND, not greenfield` classification (A1-04) is unaffected and now better
supported** — S2 and S5 modified `leadRoutes.mjs` and `automationSafetyRoutes.mjs` in place, which
is what EXTEND predicts. Astra's count of *three backend modules + one frontend component* is
confirmed by their existence.

**This does not advance admission.** Round 2's verdict (*"DEFECTS-FOUND. Admission remains
blocked"*) stands, and per Round 1 PART C, artifact tests do not grant product acceptance.

### Prior Astra rounds — already filed, and they govern the S3 question

Both rounds are on disk (`ASTRA-REPLY.md`, `ASTRA-REPLY-ROUND2.md`) and both left admission blocked.
Round 1's PART C settles the *shape* of the S3 problem without deciding S3 itself:

- *"May mobile requirements change the API? **Decided:** not under the inherited L7 scope.
  Incompatible requirements need an explicit **scope amendment**."* — i.e. a necessary change falling
  outside a slice's declared scope is taken by **amending the scope**, not by the builder widening a
  ban-bounded diff.
- *"Unverified inputs remain blockers, not silent builder discretion."*

**Applied to S3:** the correct instrument is a scope amendment declaring
`automationDecisionService.mjs` as a fourth S3 file — which is option **C** of
`25-astra-ruling-request-l5-s3.md`, and it is the option recommended there. Record 25 remains filed
because Round 1/2 decided the *principle* for L7 and did not adjudicate L5's file list; the
amendment itself still needs a determinative ruling. **Round 3 is warranted per Round 2** and its
named target is the admission caller path, not this.

### Round 2 orders 4–7 — C2 and C3 COMPLETE

| Order | Entry point | Commit | Evidence |
|---|---|---|---|
| 4 | `scripts/blueprint-master-evidence.regression.test.mjs` | `81d799b74` | Astra's Matrix A materialized verbatim; **4/4 pass**, control green |
| 5 | `scripts/blueprint-master-evidence.test.mjs` | `81d799b74` | R2-06 semantic checks + R2-07 copy identity; see record 28 |
| 6 | `scripts/intake-reach.regression.test.mjs` | `d237f6050` | Astra's Matrix B materialized verbatim; **8/8 pass** |
| 7 | `scripts/intake-reach.mjs` | `d237f6050` | R2-08 parsing/resolution/completeness; see record 27 |

**Baseline observed as Round 2 required.** Against the unrepaired checker, Matrix A read AT-01 pass
and AT-02/03/04 fail; against the first C3 revision, Matrix B read 8/8 while **three of Astra's four
required cases were failing** (RT-02 `ghost`=1 not 0; RT-03 exit 0 + `DEAD-CANDIDATE` not exit 6 +
`INCOMPLETE`; RT-04 `other/use.ts` not `pages/use.ts`). Both are recorded in records 27 and 28.

**Mutation proofs.** C3: each of the four fixes removed individually degrades exactly its named case
(7 pass / 1 fail) with controls green. The proof also exposed `stripComments` as **orphaned
machinery** — mutating it changed no outcome, because `maskStrings` already stripped comments — so it
was removed rather than left in place.

**Parser selection (order 7's bounded delegation).** `@babel/parser` 7.28.6, already installed and
version-bound. Two heuristics were tried and rejected on measurement: whole-file bracket balance
produced **239** false parse errors on 4578 valid files, and a final-statement heuristic produced
**21**. The parser produces **1** diagnostic, which is a real pre-existing defect
(`ConstructionBanner.integration.tsx`, duplicate `AppContent`).

**Still owed and NOT advanced by these rows** (Round 2 PART C): real caller-path proof, evidence
authenticity at a trusted collection boundary, rejected ignored-artifact demonstration, the original
hand-count populations, and Round 3 itself. *"The matrices' 4/4 + 4/4 target is a bounded regression
result, not the complete acceptance count."* **Admission remains blocked.**

### Round 2 orders 1–3 and 8–9 — documentation corrections and the repository-qualified amendments

| Order | Entry point | Commit | Evidence |
|---|---|---|---|
| 1 | `VERIFICATION-NOTES.md` | (round-2 filing) | R2-02 markers present: `ownership UNKNOWN`, `not a separate lane`, `not stranded` |
| 2 | `10-lane-register-beyond-the-eight.md` | (round-2 filing) | R2-03 markers present: **revision mismatch**, three separated identities |
| 3 | `11-lane-test-index.md` | (round-2 filing) | R2-05 all six sub-claims addressed — `NOT FOUND IN`, the retracted "anywhere", L5 corrected to *three backend modules + one frontend component*, the freeze obligation |
| 8 | `.agents` repository | `e074bcb` | R2-09 — **independently verified**: the commit exists, descends from the measured parent `3c4d040`, and changes 4 files including the `workflow-usage.md` entry-point notice |
| 9 | `FILE-RECEIPT.md` / `VERIFICATION-NOTES.md` §C.1 | (round-2 filing) | R2-11 — **"four"** HEAD transitions, the separated 17:35 / 17:32:41 timestamps, C.1 binding round-2 input, remit and output **separately** with explicit non-coverage |
| 9 (second component) | `scripts/blueprint-master-evidence.test.mjs` | `<order-9-commit>` | R2-10 registry/authority validation; see record 29 |

**Orders 1–3 were verified already complete, not re-done.** Re-editing compliant documents to
"land" them would have changed no claim and would have obscured what the round-2 filing actually
did. Each was checked against the specific markers Astra named, and each marker was found.

**Order 8 was verified in the other repository, not taken on report.** `e074bcb` is not an ancestor
of this branch (`git cat-file -e e074bcb` → *not found*), because R2-09 lives in the separate
`.agents` repository at `C:/Users/BigotSmasher/.agents`. It was confirmed there against the measured
parent rather than accepted on the strength of the hash appearing in a document.

**Order 9's second component closes the last code defect.** With R2-10 repaired, all three defects
that §C.3 once carried open are closed, and the §C.3 table has been corrected rather than left
standing. **This is a code-column closure, not an admission.** The trusted authority boundary is
still absent and is not claimed by either the fix or this record.

