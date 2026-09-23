# Repo Hygiene Inventory — Swan Coach/OX Review

**Date:** 2026-08-24
**Phase:** 1 — non-destructive inventory only
**Scope:** Swan Coach unified-brain review, OX-inclusive panel artifacts, and competing Coach surfaces
**Execution rule:** no files moved, renamed, deleted, staged, deployed, or enabled

## Plain inventory

The checkout is already materially dirty before this task. Root-level inventory currently includes 33 PNGs, 2 logs, 1 temporary file, 15 PowerShell scripts, 93 MJS files, and 70 patch files. The working tree also contains many unrelated modified and untracked AI-workflow artifacts. This report does not classify unrelated content beyond the broad categories below.

## Task-scope classification

| Item/class | Classification | Evidence / proposed destination | Action in this phase |
|---|---|---|---|
| `frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.tsx`, route tree, AI chat/command handlers | active runtime code | Mounted/consumed by the canonical Coach route and backend mounts in the review packet | Keep in place; no code edits |
| `scripts/debate/panel-debate.mjs`, parser test | active review tooling | Used by the fresh packet-fingerprinted run; parser/self-test green | Keep in place; no cleanup |
| `PANEL-SWAN-COACH-UNIFIED-BRAIN-2026-08-23.md` | active reference doc | Sanitized canonical evidence packet | Keep in place |
| `PANEL-SWAN-COACH-BLUEPRINT-SYNTHESIS-2026-08-23.md` | planned/unimplemented blueprint input | Provider-neutral AI synthesis packet | Keep in place |
| `PANEL-SWAN-COACH-BLUEPRINT-GLM-FINAL-2026-08-23.md` | archive-only historical record / superseded blueprint | Baseline synthesis superseded by the OX-inclusive revision | Candidate for `docs/ai-workflow/archive/` only after Sean approval |
| `PANEL-SWAN-COACH-BLUEPRINT-GLM-OX-FINAL-2026-08-24.md` | planned/unimplemented blueprint | Current AI design authority; no runtime implementation yet | Keep in place |
| `PANEL-SWAN-COACH-OX-RECONCILIATION-2026-08-24.md` | active reference doc | OX amendments and synthesis instructions | Keep in place |
| `panel-run-clean-2026-08-23/`, `panel-run-ox-clean-2026-08-24/` | QA artifact / debate output | Exact round transcripts, state, and final candidates | Keep for auditability; archive only after approval |
| `SwanCoachAssistantPage` | legacy but still referenced | Not mounted by the verified Coach route; tests/references remain | Do not move/delete; blueprint requires a test-plan gate |
| `APP-AI-HIVE-MIND.md` | active reference doc with runtime drift | Referenced prose conflicts with the mounted multi-lane runtime | Do not edit/move; blueprint requires reconcile/retire decision |
| Root PNG screenshots and visual exports | QA artifact / screenshot / temp output | Existing root clutter; destination convention is dated QA/archive folders | Likely relocation candidates pending Phase 2 approval |
| `combined.log`, `error.log`, `FOREIGN-PROBE.tmp` | QA artifact / temp output | Recurring root log/temp class | No deletion; propose ignore/archive policy |
| `graphify-out/` | ambiguous | Generated knowledge graph may be useful to another workflow | No move until ownership/reference check |
| Unrelated dirty modified/untracked files shown by `git status` | ambiguous | Outside this task’s ownership | Preserve; do not stage or clean |

## Competing-surface inventory

- Canonical UI: `CoachCommandCenterPage` mounted for Admin, Trainer, and Client role configurations.
- Legacy UI: `SwanCoachAssistantPage` remains referenced but was not shown as mounted in the verified route tree.
- Shared capability lanes: `/api/ai-chat`, `/api/ai-command`, `/api/coach/intake`, and `/api/coach/proposals` have separate contracts and remain competing/shared until the blueprint’s S0–S10 gates prove one boundary.
- Adjacent lanes: `/api/ai/debate` and `/api/hermes` remain conditional/operator-distinct; no merge is inferred.

## Proposed recurring-artifact `.gitignore` update (Phase 1 only)

Review and approve separately before editing `.gitignore`:

- root `*.log` (`combined.log`, `error.log`)
- root `FOREIGN-PROBE.tmp` and other explicitly named temp probes
- root QA PNGs unless under `qa-screenshots/` or a dated Playwright folder
- generated panel run directories only if the project chooses a retention policy; do not ignore them before Sean approves the audit-retention decision

## Exit status

Phase 1 inventory is complete. No physical cleanup is authorized by this document. Phase 2 requires Sean’s explicit approval of specific paths, reference checks, and destination mapping. The current Swan Coach blueprint remains planned/unimplemented; this inventory does not authorize building or enabling any lane.
