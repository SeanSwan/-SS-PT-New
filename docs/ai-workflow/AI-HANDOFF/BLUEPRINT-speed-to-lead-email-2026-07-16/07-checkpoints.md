# 07 — Checkpoint Protocol + Verdict Log

## Protocol (architect side, after every slice)
1. Builder pastes: full diff + every acceptance-criterion output (test runs, grep
   results, diff hunks named in 05-slices).
2. Architect (Fable, or the strongest available Claude per the Final Decider chain)
   reviews the DIFF against the package:
   - every criterion verified with REAL pasted output (no "it passes" claims)
   - drift scan: anything built that the package didn't specify? anything specified
     but missing? any 06-bans violation?
   - hostile pass: try to name an input that breaks the slice
3. Verdict: `PASS` / `REVISE (numbered list)` / `HALT (architectural problem — back to Fable)`.
4. Log the verdict below. Builder proceeds only on PASS.

## Checkpoint review remit (paste this to the reviewer with the diff)
> Review this diff ONLY against BLUEPRINT-speed-to-lead-email-2026-07-16. Verify
> each acceptance criterion has pasted evidence. Flag any line not traceable to the
> package, any ban violation (06-bans), any silent copy change to the locked email
> templates, any touch of the SMS branch/gates/suppression, any migration, any
> activation of the sequence. Verdict: PASS / REVISE (list) / HALT.

## Escalation
- Builder question (package silent on something that matters) → log it here, ping
  Sean/architect; do NOT improvise.
- Two consecutive REVISE on the same slice → HALT, architect rewrites that slice
  spec (the package, not the code).

## Sean's live gates (not builder work)
- Branch merge to main: Sean-gated one-push (joins queue with `claude/contact-cta-type`).
- Sequence activation + env flips: Sean-only via the S6 runbook (T3 action).
- SendGrid domain auth/DMARC: still pending in Namecheap (see marketing plan) —
  improves deliverability but does not block this build.

## Verdict log
| Date | Slice | Verdict | Notes |
|---|---|---|---|
| — | — | — | (append as checkpoints run) |
