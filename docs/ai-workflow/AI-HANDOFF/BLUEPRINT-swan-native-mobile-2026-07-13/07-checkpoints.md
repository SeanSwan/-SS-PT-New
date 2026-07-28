# 07 — Checkpoint Protocol

After every slice in 05-slices.md, the builder STOPS and submits; the architect (Fable or the
strongest available Claude) reviews before the next slice begins.

## Builder submission format (per slice)

```
SLICE <n> SUBMISSION — <slice name>
Branch/commit: <branch> @ <sha>
Files changed: <explicit list>
Acceptance evidence:
  [AC-<n>.1] <criterion> → PASTED OUTPUT (test run / curl response / screenshot path)
  [AC-<n>.2] ...
Deviations from package: <none | list with reason>
Open questions: <none | list>
```

## Architect review remit (reuse verbatim)

> Review this diff against BLUEPRINT-swan-native-mobile-2026-07-13. Verify: (1) every acceptance
> criterion has real pasted evidence, not claims; (2) drift scan — anything built that the package
> didn't specify, anything specified but not built, any 06-bans violation; (3) API usage matches
> 03-contracts exactly; (4) file budgets and token discipline hold. Verdict: PASS / REVISE (itemized)
> / HALT (architectural problem — return to architect).

## Rules

- REVISE items go back to the builder; the architect never patches builder drift directly.
- Checkpoint verdicts are logged below AND in `.ai-workflow/coordination/review-queue.md` (rule 67).
- Phase close (end of Slice 2.5) additionally requires a rule 48 audit record:
  `docs/ai-workflow/AI-HANDOFF/SWAN-NATIVE-PHASE02-AUDIT-RECORD-<date>.md`.
- Paid Fable checkpoints are spend-gated — ask Sean first; default is the strongest in-session Claude.

## Checkpoint log

| Date | Slice | Verdict | Notes |
|---|---|---|---|
| — | — | — | (append as slices complete) |
