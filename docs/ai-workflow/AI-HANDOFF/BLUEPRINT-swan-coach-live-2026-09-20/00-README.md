---
decision: "Swan Coach reaches 'live coach' through three named milestones; M1 (freestyle -> local composer draft) is the only one authorised to build, and it is deliberately write-free."
status: open
supersedes: none
---

# 00 — README · Swan Coach: mounted chat → live coach

**Package:** `BLUEPRINT-swan-coach-live-2026-09-20`
**Status:** **PLAN READY (revised, round 2)** — *not* IMPLEMENTATION VERIFIED, *not* DEPLOYED.
**Owner (architect):** Opus 5 session, repo-owning seat.
**Disposition this revision answers:** Astra **REVISE**, 10 required corrections.

---

## 1. What this package is

A build package for a builder with **zero prior context**. Read `06-bans.md` and this file first.

**Read order:** `00` → `06-bans` → `01-architecture` → `03-contracts` → `03b-privacy-boundary` →
`03c-release-predicate` → `03e-admission-schema` → `03f-absorber-chain` → `03d-context-channels` → `05-slices` → `04-build-order` → `09-tests` →
`02-wireframes` → `07-checkpoints`.

**Round-3 revision:** the outbound privacy gate moved out of `03-contracts.md` §4.3 into
**`03b-privacy-boundary.md`** — contract id **`privacy-boundary@1.2.0`**, now the single authoritative
statement of the boundary and the one the coach-cc package pins. `03-contracts.md` §4.3 and §4.4 are
pointers. Reason: round-3 **R3-02** — a gate specified in two places is specified in neither.

**Round-5 revision — the gate is specified across two files, and the id moved to `@1.1.0`.**
`03b-privacy-boundary.md` reached **298 of the 300-line cap** (round-5 **R5-08**), and its own §9 instructs a
split rather than a breach. The **release predicate** now lives in **`03c-release-predicate.md`** (§6),
under the same contract id. The split is not cosmetic: it carries two corrections. **R5-02** — the predicate is **provenance-scoped**, because the shipped scanner flags the
classifier's own fixed template (`"dates"` ≈ `"diabetes"` at `phiScanner.mjs:93`) and a naive whole-body
zero-match rule would refuse **every** classification request. **R5-01** — `previousContext` is
**server-held state referenced by id**, because a caller-supplied array can prove *shape* but not *prior
admission*. **R5-06** — the id moved because the predicate's meaning did; an unchanged version would have
asserted that it had not.

**Round-6 revision — the same failure one level down, and three corrections to the predicate.**
`03c-release-predicate.md` itself reached **309 lines against the 300-line cap** while its §8 asserted it was
under it, so **§7 (the context channels) moved onward to `03d-context-channels.md`** — again under the same
contract id, because a split moves bytes without changing meaning. The predicate was corrected three times:
**R6-01** — operator-authored static content is admitted by **content-hash identity** and is **never
content-scanned**, because the Coach condition-protocol templates (`aiChatService.mjs:241`) *are* the
vocabulary a medical detector flags, so scanning them can never succeed. **R6-02** — interpolated values are
**P**, only the **static** template bytes are hashed, and the **rendered** block is never hashed. **R6-03** —
server storage is **not** admission evidence: `aiChatRoutes.mjs:754` stores the **original, un-sanitized**
text on purpose, so the transcript and the admission record are two different stores.

**Round-7 revision — the predicate moved to the SOURCE, and the cap was breached a third time.**
The gate is now specified across **four** files. **R7-01** corrected half of R6-01: scoping *static template*
bytes to hash identity was right, but leaving *"every interpolation result"* in **P** made provenance depend
on the **mechanism of arrival** rather than the **source**. A substituted approved value is **O** — *provenance
follows the SOURCE, never the act of substitution.* **R7-04** gave the admission record a **producer
contract** (it had been specified only on read, and every failure mode here is on the write side). **R7-02**
added an **eighth** absorber: an **asynchronous** job's `catch` (`debate/debateOrchestrator.mjs:480`), which
returns `null` and lets the job finish `complete` — there is no request left to fail, so a refusal there must
surface as a **terminal job state**, never a salvaged result. The **cap** was breached again — `03c` measured
**353 lines** — because round 6 had rewritten its §8 to *refuse to state a size*, and **refusing to measure is
not the same as staying small.** §6.1/§6.1a/§6.2 were extracted to **`03e-admission-schema.md`**; their
numbers did not move. The lesson is now in `03c` §8 as a **command**, not a promise.

Consequences for the id: `@1.2.0` is correct and **round 7 did not bump it**. R7-01 through R7-04 changed
*how* the classes are described and closed a write-side gap; the set of admitted inputs is unchanged. The
change rule in `03b` §1 moves an id when the **meaning** changes — which is why round 6 moved it and round 7
did not.

## 2. The three milestones — named and separated (correction 1)

Earlier drafts blurred "dictation lands in the composer" with "the coach talks back". They are
different products with different risk. They are now separate, and **only M1 is authorised**.

| Milestone | Scope | Authorised? |
|---|---|---|
| **M1 — Freestyle Draft (S4-minimal)** | Frozen freestyle snapshot → **editable local composer draft**. No send, no summarisation, no provider call, no retained raw provenance. | **YES — this package** |
| **M2 — Consolidation** | The declared-but-unbuilt `consolidating`/`summary` states: structured summary a human approves. Requires a provider call over dictated free text → blocked on the privacy boundary in `03b-privacy-boundary.md` (`privacy-boundary@1.2.0`). | **NO — blocked, see PART C** |
| **M3 — Live Spoken Conversation** | Streaming deltas, spoken replies, barge-in, stale-audio rejection, feedback prevention. | **NO — designed here, not built** |

**M1's safety property is that it does not send.** That is not timidity; `03-contracts.md` §4.2 and
`03d-context-channels.md` §7 show the existing send path has an unscanned context channel (C6a) and a
scanner that cannot see names (R2-02). Until that is fixed, anything that auto-sends dictated text is a
privacy regression.

## 3. The invariant that outranks every other requirement

> **Swan Coach prepares operator drafts. A human approves every write to a client record.**

`03-contracts.md` §3 makes this server-enforced rather than conventional. Four operations are
**separate**, and none implies the next:

```
COMPOSER_EDIT  →  MESSAGE_SEND  →  PROPOSAL_CREATE  →  RECORD_MUTATE
   (local)         (conversation)      (server draft)     (needs a grant)
```

**Sending is not approval to write.** Streamed deltas never execute actions.

## 4. Evidence classification (correction 9)

Every factual claim in this package carries one of:

- **`[SUPPLIED]`** — given to the architect and re-measured in the repo this session, with `file:line`.
- **`[PROPOSED]`** — this package's own design decision. Not yet built, not yet true.
- **`[UNVERIFIED]`** — believed but not demonstrated here. A builder must not rely on it.

**"Zero prior context" ≠ "zero access to the target checkout."** The *builder* is assumed to have
the checkout and to run commands in it; it is assumed to have **no memory of this conversation**.
Where the builder needs bytes it cannot infer, `04-build-order.md` names the exact excerpt the
architect must supply, and `PART C` lists what is still outstanding.

## 5. Reconciled prior findings — do not re-derive

| Record | Relationship |
|---|---|
| `2026-09-20-015541-s83-coach-harness-work-and-coach-assistant` | This architect's own round-1 review. D1 (orphaned worktree) is **closed** — rescued and committed `53005a6da`. D3 (freestyle unreachable) is what M1 addresses. D5 (no streaming) becomes M3. |
| `2026-09-20-024101-coach-command-center-ai-harness-round-2-the` | **Load-bearing.** Its R2-01 (`previousContext` unscanned, HIGH) and R2-02 (scanner misses names; only first match enumerated) are the factual basis of `03-contracts.md` §4. Its R2-09 (timeout does not cancel) drives the cancellation contract. Its R2-10 (a package doc broke its own size ban) is why §7 below exists. **Not re-derived here.** |
| `SC-CR-001` | **STALE POINTER — verified absent.** Ripgrep across the repo returns zero files. Do not chase it. |
| "September 13 conversation-runtime packet" | **STALE POINTER — verified absent.** Branch `codex/coach-conversation-runtime-20260913` exists, head `c0cbe538d` dated **2026-09-12** (PR #118 merge, Render startup repair), and carries **no** runtime packet — only `COACH-COMMAND-REAL-CONVERSATIONS-AUDIT-RECORD-2026-05-14.md` and `OPUS-CODEX-DEBATE-RUNTIME-DRIFT-21639730.md`. **There are no runtime contracts to duplicate.** |

## 6. Baseline test truth — read before trusting any number

**Treat all totals below as `[SUPPLIED]` historical claims until re-verified against identified bytes.**

- Claimed: `useCoachFreestyleDraft.test.ts` 14/14; dock+page 31/31; coach folder 809 passed / **2 failed**
  (127 files); `tsc --noEmit` exit 0 repo-wide. Commands in `09-tests.md` §1.
- **The mutation result is MUTATION SENSITIVITY, not test-first RED.** Swapping
  `commandTextRef.current` → `commandText` failed exactly one test. That demonstrates the test is
  sensitive to that defect. It does **not** demonstrate the test was written before the code, and no
  chronological RED was recorded.
- **Planned tests in `09-tests.md` are `NOT RUN`.** None may be reported as passing.
- **The two baseline failures are preserved, not waived** — `09-tests.md` §6 carries each with its
  exact stale string, evidence, and disposition. There is no blanket waiver.

## 7. File-size contract (correction 8 / round-2 R2-10)

**Hard limit 300 lines per file, counted by `wc -l`.** A previous package document violated its own
ban; that must not recur. **Oversized touched files are split BEFORE anything is added to them**
(`04-build-order.md` S0). Current headroom `[SUPPLIED]`:

| File | Lines | Headroom |
|---|---|---|
| `CoachCommandCenterPage.tsx` | 296 | 4 |
| `CoachCommandCenter.bridgeDockStyles.ts` | 299 | 1 |
| `CoachConsoleDock.tsx` | 285 | 15 |
| `CoachFreestyleOverlay.tsx` | 605 | **OVER — split in S0** |
| `hooks/useFreestyleSession.ts` | 624 | **OVER — split in S0** |
| `hooks/useFreestyleSpeech.ts` | 358 | **OVER — split in S0** |

## 8. Builder Contract

> You are the builder, not the architect. Follow this package to the letter. Where the package
> decides, you do not re-decide — even if you would do it differently. Where the package is silent on
> something that matters, **STOP and return the question; do not improvise.** Build **one slice at a
> time**; after each slice output the diff plus the acceptance-criteria evidence (actual command
> output, not a summary) and **WAIT** for the checkpoint verdict before continuing. Never claim a
> criterion passed without pasting its output. If a criterion cannot be run, say so and stop — a
> criterion you could not execute is `NOT RUN`, never `PASS`.

## 9. Where the other parts live

- **PART A** (A1 findings + A2 self-check) and **PART C** (remaining decisions/dependencies) are
  filed under Rule 86 in `Z:\HostileReviews` and summarised in `07-checkpoints.md` §4.
- This directory is **PART B**.

## 10. Rollback

Nothing in M1 touches the server, the database, or a migration. Rollback for the whole milestone is
a revert of the frontend slice commits plus removing `showFreestyle` from
`CoachCommandCenterPage.tsx`, which returns the dock to its current behaviour because the prop
defaults to `false`. Per-slice rollback in `05-slices.md`.
