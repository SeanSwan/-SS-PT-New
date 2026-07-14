# 07 — CHECKPOINT PROTOCOL

## Cadence
One checkpoint per slice (F0…F6), at the STOP line, BEFORE the builder proceeds. F3 additionally
requires Sean's ping before push (it flips live UX). F5's recipe authoring happens INSIDE the
checkpoint (Fable writes the six token sets; builder integrates).

## Builder submits (exact package per slice)
1. The full diff (`git diff <base>..HEAD` for the slice commits).
2. Every acceptance criterion from `05-slices.md` with its REAL output pasted underneath
   (test runs, curl transcripts, DOM/computed-style dumps, screenshots, RED proofs).
3. The Rule 61 hostile self-review: findings found, fixes applied.
4. Rule 42 audit output; tsc + build lines; budgets table (file → lines/budget).
5. Open questions (anything the package didn't decide — expected to be rare; improvisation is a
   REVISE).

## Reviewer remit (Fable or Final-Decider fallback; free triangle acceptable for F0/F1/F6 if Sean
prefers — F2/F3/F4/F5 are taste/UX slices and stay with Fable)
- Verify every criterion against the pasted evidence — no evidence, no pass.
- Drift scan: built-but-not-specified, specified-but-not-built, any 06-bans hit.
- Re-run at minimum: the slice's test folders + tsc (reviewer-side trust-but-verify).
- Verdict: `PASS` (next slice) / `REVISE` (numbered list; builder fixes, resubmits same slice) /
  `HALT` (architecture wound — back to Fable, package gets amended, amendment logged here).

## Verdict log (append per checkpoint)
| Date | Slice | Verdict | Notes |
|---|---|---|---|
| — | — | — | — |

## Handoff prompt for the builder (copy-paste to start the program)
> Read `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-lens-world-fusion-2026-07-14/00-README.md` through
> `07-checkpoints.md` fully, then CLAUDE.md rules 42/43/58/61/67. Claim your lane in
> `.ai-workflow/coordination/` (read both lane files first). Work in a fresh worktree off current
> origin/main. Execute slice F0 per `05-slices.md` — tests first, RED proven — and submit the
> checkpoint package. You have ZERO design latitude except where the package explicitly delegates
> with bounds. The Builder Contract in 00-README governs everything.
