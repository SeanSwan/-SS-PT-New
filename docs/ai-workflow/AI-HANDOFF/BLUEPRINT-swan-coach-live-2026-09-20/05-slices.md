---
decision: "Six slices; each has executable acceptance criteria and a STOP line; S6 is not authorised."
status: open
supersedes: none
---

# 05 — Slices

Every criterion below is **`NOT RUN`** until a builder pastes its output. A criterion that could not
be executed is `NOT RUN`, never `PASS`.

Run all commands from `frontend/` unless stated. `wc -l` is the only accepted line counter —
PowerShell's `Measure-Object -Line` silently drops blank lines and under-reports by ~7%.

---

## S0 — Split oversized files (no behaviour change)

**Scope:** `useFreestyleSession.ts`, `CoachFreestyleOverlay.tsx`, `useFreestyleSpeech.ts` + the new
extracted modules (`04-build-order.md` S0).

**Decisions already made:** what to extract, and that originals keep re-exporting every prior
symbol so no importer changes.

**Acceptance criteria**
1. `for f in <the 6 files>; do wc -l < $f; done` → every value ≤ 300.
2. `npx vitest run src/components/DashBoard/Pages/coach-assistant --reporter verbose`
   → **the same pass count as the recorded baseline**, and the **same 2 failures**
   (`09-tests.md` §6). A changed pass count means the extraction changed behaviour.
3. `git diff --stat` shows **no** test file modified. *Rewriting a test to fit a refactor invalidates
   the refactor's only evidence.*
4. `npx tsc --noEmit` → exit 0.
5. `git diff -U0 | grep -E '^\+' | grep -E 'vi\.mock|jest\.mock'` → **empty**. Adding a key to a mock
   factory during a "pure move" is how a refactor starts masking behaviour.

**STOP** — do not start S1 until the S0 checkpoint passes.
**Rollback:** `git revert` the S0 commit; nothing else depends on it yet.

---

## S1 — Capture binding

**Scope:** `hooks/useCaptureBinding.ts` (new), `useFreestyleSession.types.ts`.

**Decisions already made:** the six binding fields; equality is all-fields; missing target is a
mismatch, not a hold.

**BLOCKED ON:** PART C **D-3** — the authoritative source of `tenantId` / `conversationId` /
`authGeneration`. **Do not invent these APIs.** If the architect has not supplied them, STOP.

**Acceptance criteria**
1. `npx vitest run src/…/hooks/useCaptureBinding.test.ts --reporter verbose` → T-01.1…T-01.6 pass.
2. `wc -l` on both files ≤ 300.
3. `npx tsc --noEmit` → exit 0.

**STOP.** **Rollback:** revert; no runtime path consumes it yet.

---

## S2 — Atomic composer append

**Scope:** `CoachConsoleDock.tsx`, `CoachConsoleDock.appendDictation.ts` (new).

**Decisions already made:** functional updater; idempotent on `snapshotId`; merge rule
`prev.trimEnd()` empty → `text`, else `prev.trimEnd() + "\n\n" + text`; empty text → no write and no
separator; no target → `{applied:false,'no-target'}`.

**Acceptance criteria**
1. `npx vitest run src/…/CoachConsoleDock.appendDictation.test.ts --reporter verbose` → T-05.1…T-05.6 pass.
2. **T-05.3 specifically** — user edits between snapshot capture and append: the edit survives and
   the dictation is appended after it. This test **decides** the `[UNVERIFIED]` interleaving claim in
   `01-architecture.md` §7. Report its result as evidence either way; if it passes against the
   *current* ref-mirror too, say so — that is a real finding about the claim, not a failure.
3. `npx vitest run src/…/CoachConsoleDock --reporter verbose` → existing dock tests unchanged.
4. `wc -l src/…/CoachConsoleDock.tsx` ≤ 300.

**STOP.** **Rollback:** revert; `appendDictation` has no caller until S3.

---

## S3 — Rebind the consumer

**Scope:** `hooks/useCoachFreestyleDraft.ts`, `CoachFreestyleControl.tsx`.

**Decisions already made:** validate binding at consumption; consume at most once; reject
stale/missing/duplicate with a typed reason; capture lock is compare-and-set with explicit refusal.

**Acceptance criteria**
1. `npx vitest run src/…/hooks/useCoachFreestyleDraft.test.ts --reporter verbose` → the existing
   suite **plus** T-02.1…T-02.8, all pass. State the total explicitly; the previously recorded
   14/14 is a `[SUPPLIED]` historical claim and must be re-measured here, not carried forward.
2. **Zero composer writes on every reject path** — assert `onCommandTextChange` not called
   (T-02.3…T-02.6).
3. `npx vitest run src/…/CoachFreestyleControl.test.tsx --reporter verbose` → T-07.1…T-07.4 (lock).
4. `npx tsc --noEmit` → exit 0.

**STOP.** **Rollback:** revert S3; the dock prop `showFreestyle` defaults `false`, so the surface
returns to current behaviour with no further change.

---

## S4 — Receipts, three separated events

**Scope:** `services/coachCaptureReceipts.ts` (new) + call sites in `useCoachFreestyleDraft.ts`.

**Decisions already made:** three distinct events; `BUFFER_DESTROY` unconditional; sink failure →
`durability:'unacknowledged'`, never success; **no transcript text in any receipt**.

**BLOCKED ON:** PART C **D-4** — the durable sink is not chosen. Until it is, S4 ships with a
**local in-memory sink only**, and `AUDIT_ACK` is reported as `unavailable` rather than emitted.
That is an honest partial, and `07-checkpoints.md` records it as such.

**Acceptance criteria**
1. T-06.1…T-06.5 pass.
2. **T-06.4** — a receipt payload scanned for any fragment text → zero matches.
3. **T-06.5** — sink throws → `BUFFER_DESTROY` still emitted, outcome still `handed-off`,
   durability `unacknowledged`.

**STOP.** **Rollback:** revert; the events degrade to no-ops.

---

## S5 — UX states

**Scope:** `CoachFreestyleOverlay.controls.tsx`, `CoachCommandCenter.bridgeDockStyles.ts`
(**extract `dockControlStyles.ts` first — 1 line of headroom**).

**Acceptance criteria**
1. T-07.5…T-07.12 (permission denied, unsupported, error-retained, empty, rejected-handoff,
   Esc = Pause, focus trap, discard initial focus on *Keep listening*).
2. T-08.1…T-08.3 — responsive matrix, all ten widths, no horizontal scroll, all targets ≥44 px.
3. `wc -l` on both style files ≤ 300.

**STOP.** **Rollback:** revert; earlier slices remain functional with default states.

---

## S6 — M3 streaming · **NOT AUTHORISED**

Designed in `03-contracts.md` §5–§6. **Blocked** on the privacy ruling (PART C D-1, D-2). No files
are created under this package. Any builder reaching S6 must STOP and return to the operator.

---

## Traceability

| Req | Source | Contract | Slice | Test | Status |
|---|---|---|---|---|---|
| R1 bounded milestone | corr. 1 | `00` §2 | — | — | PLAN READY |
| R2 approval separated | corr. 2 | `03` §3 | S6/M2 | T-03.* | NOT RUN |
| R3 privacy allowlist | corr. 3 + R2-01/02 | `03` §4 | blocked | T-04.* | NOT RUN |
| R4 lifecycle binding | corr. 4 | `03` §1, `01` §4 | S1,S3 | T-01,T-02 | NOT RUN |
| R5 atomic composer | corr. 5 | `03` §2 | S2 | T-05 | NOT RUN |
| R6 handoff ≠ deletion | corr. 6 | `03` §1.1 | S4 | T-06 | NOT RUN |
| R7 streaming/voice | corr. 7 | `03` §5–6 | S6 | T-09 | NOT RUN |
| R8 UX + mic ownership | corr. 8 | `01` §6, `02` | S3,S5 | T-07,T-08 | NOT RUN |
| R9 evidence classes | corr. 9 | `00` §4 | all | — | PLAN READY |
| R10 file-size contract | corr. 8 / R2-10 | `00` §7 | S0 | T-10 | NOT RUN |

**Evidence obligations** (round-2 **R2-08**: traceability that maps requirements forward but not
evidence obligations is half a table): every `NOT RUN` above is owed *pasted command output* at its
slice checkpoint. No row may move to PASS on assertion.
