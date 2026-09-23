# 07 — Checkpoint protocol

## 1. Cadence

One checkpoint **per slice**, at the slice boundary. The builder outputs the diff plus the
acceptance-criteria evidence and **waits**. No slice is "done" because the builder says so.

## 2. Checkpoint procedure (architect side)

For each slice, in order:

1. **Criterion verification.** Run every acceptance criterion in `05-slices.md` yourself. Paste real
   output. A criterion whose output you did not see is UNVERIFIED, not passed.
2. **Drift scan — three questions:**
   - **Built but not specified?** Anything the builder added that the package did not authorise.
   - **Specified but not built?** Anything silently skipped.
   - **Ban violated?** Walk `06-bans.md` §1 explicitly; those are HALT-class.
3. **Verdict:** `PASS` / `REVISE (list)` / `HALT`.

Drift found at checkpoint goes **back to the builder** — the architect does not patch it. Otherwise
the token economics invert (you pay architect rates for builder work) and the package stops being
the source of truth.

## 3. The four questions this workstream's history says to ask

These are not generic. Each one is drawn from a defect that actually shipped here.

| # | Question | The defect it would have caught |
|---|---|---|
| Q1 | **"Does this guard catch something it must NOT catch?"** | Round 3 claimed an off-screen hand-off that **did not exist**; the verifier asserted only `live <= cap`, which passes forever in the dead state. A guard that cannot fail guarded a claim nobody implemented. |
| Q2 | **"Is this wired, or does it merely exist?"** | Round 4 F1 — `releaseSlot()` was called only on unmount. The function existed; the wiring did not. |
| Q3 | **"Is this sentence true for every case it covers?"** | The rail reserve failed **twice, silently, by two mechanisms**, and only a human with DevTools caught it. |
| Q4 | **"What does this green suite NOT cover?"** | Round 1 of the design-brain review: 39 tests passed before *and* after a CRITICAL fix, because they never exercised the loop's **second cycle**. A green suite can certify a broken invariant. |

**Question-by-yield ordering, from the design-brain review's 6 rounds:** Q1 > Q2 > Q3.
**Re-reading the diff found zero findings across all six rounds.** Read the diff to find what
changed; **execute** the system to find what broke.

## 4. Evidence discipline

- **Prove claims with a re-runnable command or `file:line`** — never a restatement of a prior receipt.
- **Show RED before GREEN** for a new guard. A guard never observed failing is not a guard.
- **Mark what you could not run UNVERIFIED.** Do not inherit a prior "green". Three gates in this
  packet are marked UNVERIFIED for exactly this reason (see `MEGA-BLUEPRINT.md` §4).
- **Downgrade real-but-unreachable findings, and say so.** Round 3's `refract` family cannot refract
  — real, but accepted for renderer portability, so it is *disclosed*, not *fixed*.
- **A fix that adds a REPORT is a different risk class from one that adds a WRITE.** A spurious write
  corrupts data you can inspect; a spurious report corrupts the operator's attention and leaves no
  trace. For every guard that reports, write the test for the case it must **not** fire on.
- **Assert each claim separately.** An aggregated assertion ("exit 5") once passed while the specific
  one (per-class message) failed — and that difference was a false sentence in the report.

## 5. Review-chain position (Rule 46, as amended 2026-06-10)

```
builder
  → Gemini (review)
    → Codex (HOSTILE review — MANDATORY INPUT, advisory only)
      → FABLE = FINAL DECIDER + COMMIT GATE   (fallback: next best Claude model)
```

**Codex's verdict is advisory to Fable, never the gate itself.**

Free-first ladder before any paid seat (Rule 16): GLM / ZCode seats are $0 marginal on the Z.ai plan.
Fable is metered — **ask Sean before spending**. Route Fable via `SWAN_FUSION_JUDGE_MODEL` rather than
editing a committed policy file (that is what round 2 did).

## 6. Review remit text (reuse verbatim)

> You are the hostile reviewer. Your job is not to confirm this work is good; it is to find what is
> wrong with it before it ships. Assume the author was confident and wrong.
>
> For every claim in the packet, ask: *is this wired, or does it merely exist? Does this guard catch
> something it must not? Is this sentence true for every case it covers?* Prove each finding with a
> `file:line` or a re-runnable command — a restatement of the packet is not evidence.
>
> Report separately: (a) findings you verified, (b) findings you could not verify, (c) claims in the
> packet you tested and found FALSE. Category (c) is the most valuable thing you can produce; a
> reviewer who reports no falsifications has probably not looked.
>
> You may not "fix" anything. You produce findings and dispositions only.

## 7. Checkpoint log

| Slice | Date | Verdict | Criteria run | Drift found | Notes |
|---|---|---|---|---|---|
| S0 | — | pending | — | — | blocking; nothing starts until PASS |
| S1 | — | pending | — | — | |
| S2 | — | pending | — | — | |
| S3 | — | pending | — | — | |
| S4 | — | pending | — | — | |
| S5 | — | pending | — | — | |

## 8. Rule 48 audit record

At phase close, the package plus this checkpoint log feed the Rule 48 audit record directly. The
package is the plan of record; the log is the evidence it was followed.
