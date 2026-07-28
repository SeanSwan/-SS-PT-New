# 07 — Checkpoint protocol

After EVERY slice the builder posts: (1) the diff (or branch+commit SHA), (2) every acceptance
criterion from 05 with its REAL pasted output, (3) any question the package didn't answer.
The builder then WAITS.

## Reviewer remit (architect side — reuse verbatim)

> You are the architect checkpointing slice N of BLUEPRINT-cortex-phase1-knowledge-spine
> (2026-07-14). Verify: (1) every 05 acceptance criterion has real, plausible, non-fabricated
> output — reject any criterion claimed without pasted evidence; (2) drift scan — list anything
> built that 03/04 didn't specify, anything specified but missing, any 06 ban violated (check
> especially: ALTERs on existing tables, "Users" FK casing, >300-line files, status forced to
> draft on create, storageLocation scheme rejection, no NASM text pasted); (3) hostile pass —
> try to break the slice (bad enums, missing changeNote, cross-client access, flag off).
> Verdict: PASS / REVISE (numbered fix list, builder fixes — architect never patches) / HALT
> (structural problem — back to architect). Log the verdict below.

Checkpoint reviewers: Fable (paid — ask Sean per spend gate) or the strongest available Claude /
free triangle when Sean prefers $0. Same remit either way.

## Verdict log

| Slice | Date | Reviewer | Verdict | Notes |
|---|---|---|---|---|
| 1 | 2026-07-14 | Fable (session architect) | PASS | Commit 72acf8cd3 on codex/cortex-phase1. All 5 criteria verified with real output; architect re-verified seeder + FK casing + banned-string grep + scheme validator directly in the worktree. Arbitration: (1) credentials NOT-NULL fills (credentialName/issuingOrganization/credentialStatus) ACCEPTED; (2) contracts-over-ER for workshop_notes ACCEPTED — 01-architecture ER to be corrected (workshop_notes links via workshopId only); (3) NULL organization fields ACCEPTED; (4) HHS cite_only ACCEPTED. Deviation ACCEPTED: SourceFile model-level scheme validator kept as defense-in-depth (Slice 3 API gate still required). Note: plain `db:migrate:undo` reverts lexically-last migration (UUID-INTEGER-TYPE-MISMATCH-FIX, no-op down) — rollback plan must use `--name` targeted undo; DB verified undamaged. |
| 2 | 2026-07-14 | Fable (session architect) | PASS | Commit 6238e3a65. All 3 criteria verified; architect re-verified in worktree: RULE_STATUS_TRANSITIONS const, createRule status forced 'draft', RuleVersion append-only hooks (beforeUpdate/Destroy/Bulk* throw), audit write inside the status-change transaction (fail-closed). Arbitration ACCEPTED: `draft → needs_sean_review` added to the state machine (05's executable criteria controlling; 01-architecture updated to match). Enum-extraction to cortexRuleEnums.mjs per 04 #9. Cleanup of the proof rule via raw SQL DELETE accepted (audit rows retained). |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

## Phase close
All PASS → batch push → phase-close review → Rule 48 audit record
(`docs/ai-workflow/AI-HANDOFF/CORTEX-PHASE1-AUDIT-RECORD-<date>.md`) → Sean decides prod flag
flip. Rollback plan: flag off (instant), then `db:migrate:undo` × 3 Cortex migrations if full
removal is ever needed (additive tables; zero impact on existing data).
