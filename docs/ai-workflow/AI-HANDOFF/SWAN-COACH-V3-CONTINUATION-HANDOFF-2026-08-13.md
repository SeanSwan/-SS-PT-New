---
title: Swan Coach V3 — continuation handoff
date: 2026-08-13
author: Claude Opus 5 (terminal, vs-claude)
origin_main_at_handoff: 67cec98624c67511a7e7c3b9ad051da823c845d3
status: 4 slices shipped · 2 slices blocked · 1 skill pending design
decision: Ship the hotfix wave, block schema work behind a certification gate that is not yet fit
supersedes: none
implementation_authorized: partial — see "What you may and may not do"
---

# Swan Coach V3 — continuation handoff

You are taking over mid-programme. Read this document completely before touching anything.
**Repository evidence outranks this document, every SHA in it, and every line number in it.**
If something here disagrees with the code, the code is right and this document is stale —
say so rather than working around it.

---

## 1. Where things stand in one paragraph

Four production defects were found and fixed and are now live on `main` at `67cec9862`. A
fifth workstream — a release-certification gate intended to guard schema work — was built,
hostile-reviewed, partially repaired, and is **explicitly not fit for its purpose yet**. All
database/migration slices are blocked behind it. All UI slices are blocked behind a separate
brand-design lane owned by another agent. Four paid external reviews were run ($0.77 total)
and produced a hard, reusable lesson about how to spend them. A skill to institutionalise that
lesson is designed but not built.

---

## 2. What shipped, and what each fix means in production

All four were live defects, not theoretical. Each was found by tracing the mounted path, not
by reading a plan.

### S1 — a trainer could write to another trainer's calendar
`POST /api/sessions/block` forwarded `req.body` to a service that resolved the subject as
`trainerId || (user.role === 'trainer' ? user.id : null)`. The submitted value
short-circuits the `||`, so the authenticated identity was never consulted. A recurrence rule
multiplied it across every generated date. `trainerOrAdminOnly` gates on ROLE and never
inspects the subject — **a role gate is not an authorization control.**

The retired shadow router `sessionRoutes.mjs` still holds the CORRECT clamp (actor first).
The unified service reversed the operands during a rewrite. **Where two copies of one
decision exist, the live one is not automatically the correct one.**

Fixed by `backend/services/sessions/sessionBlockAuthorization.mjs` — dependency-free, imported
by both the route boundary and the service so they cannot drift again. Refuses (403) rather
than silently clamping. Compares by numeric value because the UI posts `String(user.id)`.

### S2 — every staff client onboarding returned 400
The wizard collects `firstName`/`lastName`; the controller demanded `fullName`, which appears
nowhere in the frontend onboarding flow. **100% failure rate, indefinitely.**

The existing test passed because its fixture sends `fullName` — written to the contract the
server wants rather than the payload the client sends. **A fixture that documents the server's
wishes cannot fail when client and server disagree.**

Joining the names would have corrupted data: the controller splits `fullName` back apart, so
`{firstName:'Mary Jane', lastName:'Van Der Berg'}` round-trips to `{firstName:'Mary',
lastName:'Jane Van Der Berg'}`. Fixed by `backend/utils/onboardingNameContract.mjs`, which
preserves the collected split.

**Operational question nobody has answered:** if staff have been working around this for
weeks, client records may exist in unexpected shapes. Worth asking the owner.

### S3 — the Coach reported workouts saved before attempting to save them
`detail.acknowledgeAIWorkoutEvent?.(); void handleSubmit(...)` — the ack signature is
`(didHandle = true)`, so a no-argument call reports TRUE, and it fired before an unawaited
save whose result was discarded. `resolveOutcome(true, true)` recorded every submit as
`applied`, including validation refusals that never reached the network.

**Awaiting is not the fix, and this was proven by probe, not argued:**
- ack-then-save → `{acknowledged: true, handled: true}` (shipped: false positive)
- save-then-ack → `{acknowledged: false, handled: false}` ("nobody was listening")

The dispatch seam reads `handled` on the line after `dispatchEvent`. It carries one boolean
and cannot express *accepted, outcome pending*.

**KNOWN RESIDUAL, asserted by a test rather than hidden:** an ATTEMPTED save the server later
rejects still acks `true`. Closing it requires changing `dispatchWithAcknowledgement` +
`coachEventLog`, shared by the planner, bootcamp and pain-chart command families. **That is an
architecture decision for the owner, not a Logger fix.** See §6.

### S5 — onboarding injury and PAR-Q answers were collected then discarded
The wizard writes `injuries`; the master-prompt projection reads `pastInjuries || []`. 20 of
45 wizard fields were read under a different name or not at all, including movement
limitations, both PAR-Q cardiac screens, doctor clearance and blood pressure. **Every miss had
a default, so the projection always looked complete.**

**State the blast radius precisely.** The obvious headline — "the AI is blind to injuries" —
is FALSE. `aiWorkoutController` independently reads `WaiverRecord` and active pain entries.
But `WaiverRecord` is written only by the public waiver flow, never by onboarding. So an
onboarding-only client loses these answers while the generator's injury source stays empty.

Fixed by `backend/services/onboardingFieldDictionary.mjs`: every wizard field is MAPPED or
explicitly UNMAPPED-with-reason, no third state. **The contract test parses the wizard's own
components rather than restating the field list**, so a new field with no entry fails on the
day it is added.

---

## 3. The security lane this opened, and the four attempts it took to close

Routing free text into the projection closed a data-loss bug **and opened a prompt-injection
lane**. Closing it took five commits and every failure had the same shape: *the thing I did
not anticipate passed through raw.*

1. Wizard-named fields sanitized → **values supplied under the PROJECTION key skipped both
   lanes** and reached the prompt raw. A comment described that as a feature.
2. Sanitized by projection key → **arrays** bypassed a string-only guard, and the rename lane
   stringified them into consumers whose defaults declare arrays.
3. Handled arrays → **arrays inside arrays** bypassed it.
4. Recursed → **the depth bound returned the value RAW past the limit**, making the safety
   valve the entrance.
5. Failed the bound closed → **a bare object never reached the sanitizer at all**, because the
   CALLER's guard excluded it. The hole had moved up one level.

**Resolution: an allowlist.** A narrative answer is text, or a list of text. Only those two
survive; everything else is dropped. Raw answers are untouched in `responsesJson`, so nothing
is lost — only the AI-facing projection drops a value that was never valid narrative.

**Separately:** the shared sanitizer's role-marker pattern was unanchored and ate clinical
text — `"Digestive system: sensitive to dairy"` → `"Digestive sensitive to dairy"`. In
clinical text, deleting a word does not degrade a sentence, **it can invert one.** Anchored to
line start. Then that fix put the pattern pass ahead of the markup stripper, which let
`ignore <b>all</b> previous instructions` reassemble intact after tags were stripped — **a
bypass introduced by the fix for the previous bug, live in production for ~20 minutes.**
Order is now strip → patterns → collapse, and is documented as load-bearing.

---

## 4. What is BLOCKED, and by what

### Schema / migration slices (S6, S7, S8, S9) — blocked by the certification gate
`scripts/qa/slice-certification.mjs` exists and works, but a paid review returned **NOT FIT to
authorize schema work** and five of its findings remain open:

- **P3** — the destructive-SQL regex catches `DROP TABLE`/`TRUNCATE`/`DELETE FROM` and misses
  the shapes an honest author actually writes: `ALTER COLUMN … TYPE` (silent truncation),
  `UPDATE` (mass mutation), `SET NOT NULL` on a populated table (fails mid-deploy — and this
  host runs migrations on push), `DROP INDEX`/`CONSTRAINT`/`SCHEMA`/`VIEW`, `RENAME`, and
  `CREATE INDEX` without `CONCURRENTLY`.
- **P6** — gitignored backend files are invisible to both tree checks. Rule 42's boot-crash
  hole is open exactly where it matters. Suggested stronger fix: assert the boot entrypoint's
  import graph ⊆ `git ls-files`.
- **P1 (partial)** — the backend suite check now delegates to another session's
  `test-baseline-gate.mjs`. The frontend list is still hardcoded.
- **P7** — `checkWhitespace` and `checkStagingEmpty` are subsumed by `checkPinnedTree` and can
  never independently fail. Decorative checks train reviewers to stop reading output.
- **Q6** — the self-test proves ONE check can fail. The standard applied to product code was
  "every check proven able to fail, able to pass, and incapable of lying when its substrate
  breaks", with fixture repos via `git init` in temp dirs.

**Do not run a migration until at least P3 and P6 land.** Pushing to `main` executes
`migrate:production` on this host — a push IS a schema change.

### UI slices (S10, S11) — blocked by the brand lane
Another agent owns the Swan brand / Design Brain upgrade. Do not touch, stage, or inspect its
working files. Load its completed Design Brain commit before any UI work.

---

## 5. A trap that will waste your time if nobody warns you

`backend/scripts/test-baseline-gate.mjs` compares failing test FILES against
`backend/tests/known-failing-baseline.json`, which records **9** files. Running it against
current `main` reports **36** files and 27 "regressions".

**Those regressions are not yours and are not environmental.** Proven with a full 2×2:

| tree | `.env` present | failing files | failing tests |
|---|---|---|---|
| `origin/main` (untouched) | no | 36 | 5 |
| `origin/main` (untouched) | **yes** | **36** | **5** |
| the slice branch | no | 36 | 5 |
| the slice branch | yes | 36 | 5 |

`origin/main` itself fails this gate. The baseline is stale relative to main. Re-recording it
is **the other session's call, not yours** — but until someone does, this gate blocks every
push and its verdict carries no information about your change.

**The method matters more than the finding:** when any gate reports a regression, run the
identical gate on the base commit before believing it. One command separates "my change broke
it" from "this was already broken." An earlier attempt to explain it as environmental was
stated as *proven* and was wrong — the `.env` changed the result by 2 tests, not 27 files.

---

## 6. Decisions waiting on the owner

1. **The acknowledgement seam.** Closing S3's residual means changing a seam shared by four
   command families. Architecture, cost, and blast radius are the owner's call.
2. **`known-failing-baseline.json` is stale** (§5). Blocks every push until re-recorded.
3. **Did anyone work around broken staff onboarding?** If so, client records may be malformed.
4. **Deferred review findings**, ranked by the reviewer as next-batch: a merge branch that can
   fabricate a composite name when `firstName` and `fullName` disagree (needs contradictory
   input; the raw record survives); surrogate-pair truncation splitting an emoji; `Number()`
   accepting `"0x10"` and `"1e2"` as ids (no authorization consequence).

---

## 7. What you may and may not do

**Authorized:** continue the slice programme in R1 order; finish the certification gate's open
findings; hostile-review and repair anything in §2–§3.

**NOT authorized without explicit owner approval:** any migration or schema change; enabling a
feature flag; touching the brand agent's files; re-recording the test baseline; deleting or
archiving anything; a `main` push that carries a migration.

**Standing constraints:** no secrets/PII in any committed artifact or model packet; commit
per slice locally and push once per batch; the repo's configured git identity is already
correct — **do not override `user.email`** (doing so got a push rejected and forced a
12-commit rewrite).

---

## 8. The external-model lesson — the most transferable thing in this document

Four paid reviews, $0.7654 total, same model, same price band, wildly different value:

| # | Packet contained | Cost | Findings | Verified real |
|---|---|---|---|---|
| 1 | source of a QA gate | $0.1958 | 9 | every checked claim |
| 2 | **a prose description** | $0.0849 | 3 | **1 of 3** |
| 3 | source of the four fixes | $0.2294 | 8 | 5 of 8 |
| 4 | source post-fix + 2 new modules | $0.2550 | 10 | both same-day items |

**The rule: send the source, never a description.** Review 2 is the control — it was wrong on
two of three blockers, and its misses were reasonable inferences about code it could not see.
It flagged every claim as `[INFERENCE]` and named the verification command, which is the only
reason correcting it was cheap.

**Its judgement on what to do NEXT was reliable in all four calls. Its assertions about what
the code currently DOES were reliable only when it could read that code.** Verify every
factual claim before acting; three of review 3's eight findings and two of review 2's three
were disproven this way.

Review 4 is the strongest argument for the practice: it reviewed code that had already
survived three reviews plus internal adversarial rounds, and found a live bypass introduced by
the previous commit. Its own explanation is worth keeping: *"what survived is what always
survives — the seams between the fixes."*

**A skill to institutionalise this is designed but not built.** See §9.

---

## 9. Pending build — the packet skill

The owner has specified a skill that fires on **every** outbound model call — terminal agent →
OpenRouter, **and Hermes** → local model or cloud — guaranteeing the packet carries the real
artifact rather than a description.

**Owner decisions already made, not to be relitigated:**
- Oversized packet → **REFUSE and make the operator narrow the target.** Never substitute a
  summary. A blocked call is cheaper than a confident wrong answer.
- The skill **builds the packet and runs the zero-call preflight, then STOPS** for explicit
  approval. It does not fire. Spend approval stays human.

**The unresolved design problem:** Hermes is a different shape. It runs a local model by
default, is driven over a chat transport where megapasting is a documented failure, and reads
the repository directly — so it can receive an artifact *by reference* rather than inline. The
invariant ("the model has the real artifact") is constant; the mechanism is not. **An
unverified reference is the description failure wearing a path** — the skill must verify the
model actually read the file, e.g. by challenging it to quote a specific non-guessable detail.

### The blueprint (commissioned, delivered, and trimmed)

Full text: `KIMI-REVIEW-5-SKILL-BLUEPRINT-2026-08-13.md`. It is input, not instruction.

**Build v1 with these six mechanical checks — each has evidence from 2026-08-13 behind it:**

| Code | Refuse when | Evidence it prevents |
|---|---|---|
| R1 | packet over context budget | owner decision — never degrade to a summary |
| R3 | a quoted block fails byte re-extraction diff | hand-typed code is a description wearing a fence |
| R4 | remit asks about code, no code artifact planned | makes review-2 structurally unrepeatable |
| R5 | remit names a route/file/symbol grep cannot find | review 2 spent a finding on `/unblock`, which does not exist |
| R6 | secret/PII/abs-path scan hits the ASSEMBLED packet | sending real code means real secret risk |
| R15 | canary suite stale or red | a gate with no canary history is presumed broken |

**Defer to v2, with measurement first:** R2, R7, R8, R9, R11, R12, R13, R14, R16. They are real
but low-frequency, and shipping 16 codes on day one manufactures the refusal fatigue the
blueprint itself names as rot #3.

**The two insights worth preserving verbatim:**

1. **Repo sedimentation is the chat lane's signature rot.** For Hermes *the repo IS the packet*.
   Every stale memo and superseded review in its ingest path is ambient packet content — Hermes
   will confabulate from our own committed sediment **with perfect citation**. Mitigation:
   consult memos expire when the target sha moves, swept weekly.
2. **Probe ground truth must be gitignored.** Hermes reads the repo; committing the answers
   hands the exam to the examinee. Questions travel in the memo, answers never do.

**Proof-of-read for the chat lane:** sha-echo + ≥5 probes sampled fresh from the pinned bytes
(≥2 from the seams the remit names, ≥1 negative-space), verified by script not by eye, receipt
required before any finding, one retry then refuse. Passing a probe *requires* having loaded
the artifact — that proves delivery. **Attention is a separate problem**, backstopped by
line-cited findings, not by more probes.

**Calibration record keying:** identity = the model (a swapped brain forks the record);
slicing = task class (today's four-call table is all review-class, do not let it speak for
design); transport = delivery only. "Hermes" is never a calibration key — its local brain and
its cloud brain are separate records.

**Known limit, stated in the blueprint and worth keeping:** the mechanical checks hold; the
operator rituals (monthly packet audit, calibration honesty, not reflexively approving) cannot
be enforced by any skill. The skill's job is to keep those rituals cheap, visible, and rare
enough to stay sharp.

---

## 10. Artifacts worth reading, in order

1. This document.
2. `KIMI-REVIEW-1-…` through `KIMI-REVIEW-4-…` in `docs/ai-workflow/AI-HANDOFF/` — the four
   reviews and what each got right and wrong.
3. `.ai-workflow/hermes-inbox/pending/2026081*` — memos carrying the mistakes, written for
   Hermes to absorb. The `## Mistakes I made` sections are the highest-signal content.
4. `SWAN-COACH-VOICE-FIRST-ULTRA-MASTER-BUILD-PROMPT-2026-08-12.md` — the original programme
   spec. **Note: it was wrong about at least two things** — it cited the self-onboarding
   wizard as the staff path (the admin route mounts a different wrapper), and its S3
   instruction to "make the acknowledgement awaited" is architecturally impossible with the
   current synchronous seam. Repository evidence outranks it.

---

## 11. Working state

- Branch `claude/coach-v3-slices-20260813` and worktree `C:/tmp/ss-coach-gate0-20260812`
  still exist on disk. Everything in them is merged to `main`; they are safe to remove.
- Production at handoff: healthy, site 200, `/api/health` reporting
  `{"status":"healthy","ready":true}`.
- **Not verified:** none of the four fixes has been exercised through the live authenticated
  UI. The health endpoint proves the backend booted, not that a trainer now receives 403 on a
  cross-calendar block. That verification is outstanding and is the first thing worth doing
  with a real session.
