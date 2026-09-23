# Repository Hygiene Inventory — 2026-09-04

**Phase:** 1, non-destructive inventory only
**Trigger:** commit/loose-ends audit; checkout contains competing worktrees and generated artifacts
**Snapshot:** 2026-09-04, 09:54 PDT; branch `wip/comms-notifications-2026-07-05`

## Section A — Root directory summary

- 346 root entries: runtime directories (`backend`, `frontend`, `shared`, `scripts`, `tests`), operating directories (`.ai-workflow`, `.claude`, `.github`, `.githooks`), and multiple worktree/output directories.
- Current checkout snapshot: 764 status entries = 41 modified, 2 deleted, 721 untracked; nothing staged.
- The root contains recurring patch, backup, temporary-script, log, screenshot, and generated-output classes.

## Section B — Existing archive folders map

The following archive locations exist and are candidates for approved Phase 2 destinations: `archive/`, `docs/archive/`, `docs/ai-workflow/archive/`, `docs/ai-workflow/AI-HANDOFF/debate-archive/`, and `AI-Village-Documentation/validation-prompts/archive/`.

## Section C — QA screenshots at repo root

- 41 root image files were found, including `*-414`, `*-1440`, `*-4k`, `review-*`, `viz-*`, `forge-*`, `swan-*`, and SwanGuard audit captures.
- Classification: **QA artifact / screenshot / temp output**.
- Candidate destination: the existing QA/archive structure, after each file's reference and retention need is checked.

## Section D — Planning/spec files at repo root

- 16 root Markdown files were found. `AGENTS.md`, `CLAUDE.md`, `ACTIVE-INDEX.md`, and `README.md` are **active reference doc** files.
- Root `SWAN-*.md` packets and `SOUL.md` are **ambiguous** between active reference doc, planned/unimplemented blueprint, and archive-only historical record; classify individually before relocation.

## Section E — Log / build artifacts at repo root

- `combined.log`, `error.log`, `FOREIGN-PROBE.tmp`, and `swan-lens-review-packet.tmp.md` are **QA artifact / screenshot / temp output** candidates pending final reference checks.
- Recurrence is visible in `.codex-tmp-*`, `.patch`, `.bak-*`, generated report, and `graphify-out*` classes.

## Section F — Temp / accidental files

- Root `.codex-tmp-*`, `.tmp_*`, `.patch`, `fix*.tmp.py`, `.bak-*`, and `output/` entries are **QA artifact / screenshot / temp output** or **ambiguous** when an active script may still consume them.
- No file was moved or deleted. Each item requires a final reference check before destructive action.

## Section G — Ad hoc Markdown at repo root

- `SWAN-DECISION-PACKET.md`, `SWAN-FORGE-*`, `SWAN-SERIALIZER-REVIEW-PACKET.md`, and `swan-lens-review-packet.tmp.md` require individual classification.
- Classification proposal: active reference doc or planned/unimplemented blueprint when still linked by current handoffs; archive-only historical record when superseded and unreferenced; otherwise ambiguous.

## Section H — Orphaned source files at repo root

- No root-level JavaScript/TypeScript source file was identified as a Vite-bundled application entry outside the recognized runtime trees.
- `swanguard-graphify-corpus/` and `graphify-out*` are **ambiguous** corpus/QA output trees, not candidates for runtime cleanup without ownership confirmation.

## Section I — Empty / test folders

- Empty directories include `.codex-local`, `.codex-worktrees`, `.worktrees`, `deploy-style-lens`, several historical `.ai-workflow/fusion/*/answers` folders, inbox pending/consumed folders, and an old Forge worktree temp folder.
- Classification: **ambiguous** or **archive-only historical record** until the owning workflow confirms whether the directory is a required mount point.

## Section J — Bug-class-specific dormant/legacy-route inventory

Not applicable to this commit-history audit. No route ownership or UI bug was patched.

## Section K — Legacy/orphaned under current route tree

The existing index records `frontend/src/components/ClientDashboard/*` as **legacy/orphaned under current route tree** pending the required import and mount audit. This scan does not change that classification or claim runtime removal.

## Section L — `.gitignore` proposals

Proposal only; no `.gitignore` edit was made. Review recurring classes for patterns covering root `*.log`, `*.tmp`, `*.bak-*`, generated `graphify-out*/`, local `output/`, and disposable patch/temporary-script outputs. Pre-flight grep and owner review are required before any Phase 2 change.

## Section M — Phase 2 readiness checklist

- Sean approves the destination and retention policy for each root screenshot, packet, patch, log, and generated tree.
- Every candidate is grep-checked for imports, links, route mounts, scripts, and worktree references.
- Active Claude/Codex lane locks and all relevant worktrees are reconciled before any move.
- Explicit paths are staged; no broad staging is used.

## Section N — Phase 3 readiness checklist

- A canonical route/import audit proves the exact consumer state.
- Candidate code is classified as active runtime code, legacy but still referenced, orphaned candidate, or ambiguous.
- Focused regression checks run against every affected surface.
- Removal is separately approved and recorded.

## Section O — What this inventory did NOT do

- No files were moved, renamed, deleted, staged, committed, or pushed.
- No production service, database, Render deploy, PR, or GitHub branch was changed.
- No stale lane lock was seized; `coordination-prune.mjs` reported 49 stale locks and left them in place.

## Section P — Open questions for Sean

- Which current root packets and screenshots should remain active, and which belong in an approved archive?
- Should the 97 dirty worktrees be triaged by owner before any pruning decision?
- Which local-only branches are authorized for review/push, especially PLAUD, Aftertaste, model queue, chart unification, cart observability, coach facts, and the security containment lane?
