# Scoped Hygiene Inventory — Classroom Hermes

This is a non-destructive Phase-1 inventory. No file was moved, deleted, staged,
committed, or pushed.

## Root-level inventory relevant to this task

The repository root is a busy SwanStudios workspace with many unrelated untracked
review packets and generated artifacts. This task owns only:

- `scripts/classroom-hermes/` — active verification code;
- `docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/mac-prep/` — active
  Mac preparation;
- the inherited classroom-copilot blueprint/H0 materials and completed panel —
  active reference evidence, not owned for cleanup.

No new task artifact is placed at repository root.

## Surface classification

| Surface | Classification | Evidence/use |
|---|---|---|
| `CLASSROOM-HERMES-RADAR-MASTER-BLUEPRINT-2026-08-21.md` | active reference doc | adopted panel plan |
| `panel-classroom-hermes-radar-claude-2026-08-21/` | QA/review evidence | four seats, Fable synthesis, ledger |
| `h0-setup/` | active legacy runtime/reference | offline floor and paper package |
| `AGENT-HANDOFF-PROMPT.md` | active reference doc | Mac cloud-agent privacy boundary |
| `mac-prep/` | active implementation handoff | current task |
| `desk/` and `sorter/` | legacy but still referenced | prior deterministic prototypes |
| numbered `00`–`101` panel packets/reviews | archive-only historical record candidate | preserve until explicit archive approval |
| HTML mockups (`for-her`, `the-desk`, `switchyard`, `r4-blueprint`) | QA/design artifacts | useful visual history; not current runtime |

## Competing/duplicate surface finding

The old H0 `Assistant.command` and the new Hermes profile could become competing
assistant entry points. `H0-WRAP-DECISION.md` resolves the product surface to one
front door and preserves the old launcher only as rollback during acceptance.

The older `HANDOFF-PROMPT.md`, `NEXT-AGENT-HANDOFF.md`, and
`AGENT-HANDOFF-PROMPT.md` overlap as session entry documents. They are historical
or prior-phase handoffs; this package does not rewrite or delete them.

## Candidate archive/move list — no execution approval

- Move completed numbered review rounds into a dated `archive/panel-history/`
  only after reference grep and explicit approval.
- Group old HTML visual artifacts under a dated `qa/mockups/` only after link
  checks and explicit approval.
- Retain the current panel and master blueprint in place.

## Recurrence proposal

If later runs emit logs, receipts, or screenshots, place them under
`mac-prep/evidence/<date>/`; do not add root-level dumps. No `.gitignore` change is
proposed yet because the current package creates no recurring runtime output in
the repo.

