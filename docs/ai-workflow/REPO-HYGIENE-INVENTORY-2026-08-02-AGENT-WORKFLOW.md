# Repo Hygiene Inventory - 2026-08-02 - Agent Workflow Refactor

**Phase:** 1, non-destructive inventory
**Baseline:** clean `origin/main` worktree at `00a1be8286153b8f99719c71383f1d20144f7817`
**Scope:** root layout, workflow/skill competing surfaces, stale instruction references, and artifacts created by this audit

## Section A - Root directory summary

The clean worktree root contained 35 entries: 17 files and 18 directories. Runtime and source directories are `frontend/`, `backend/`, `shared/`, `scripts/`, `tests/`, and `tools/`. Operating files include `CLAUDE.md`, `AGENTS.md`, `ACTIVE-INDEX.md`, `README.md`, package manifests, Render configuration, skill lock, and agent configuration directories.

No root screenshots, logs, patches, `.codex-tmp-*`, or similar clutter classes were present on the clean baseline. The original shared checkout contains substantial unrelated untracked/modified work, but that tree is outside this inventory's classification authority and was not cleaned.

## Section B - Existing archive folders map

Verified present:

- `archive/`
- `docs/archive/`
- `docs/ai-workflow/archive/`
- `docs/ai-workflow/AI-HANDOFF/debate-archive/`
- `AI-Village-Documentation/validation-prompts/archive/`

These are active archive destinations. Their presence does not authorize moving material into them.

## Section C - QA screenshots at repo root

Count: 0 on the clean baseline. No destination proposal is needed for this slice.

## Section D - Planning/spec files at repo root

- `ACTIVE-INDEX.md` - active reference doc.
- `AGENTS.md` - active operating file with generated project mirror.
- `CLAUDE.md` - active operating source of truth.
- `README.md` - active reference doc.
- `render.yaml` - active infrastructure configuration.

No ad hoc root planning blueprint was found.

## Section E - Log / build artifacts at repo root

Count: 0 on the clean baseline. No new `.gitignore` pattern is proposed from this worktree evidence.

## Section F - Temp / accidental files

No repo-root temp files were found. Audit clones, the sanitized Kimi packet, and the isolated worktree live under `C:/tmp`; they are QA/temp outputs outside the repo. They require a separate exact-target cleanup decision after handoff.

## Section G - Ad hoc .md notes at repo root

No ad hoc root Markdown note was found. The four root Markdown files are classified in Section D.

## Section H - Orphaned source files at repo root

No root JavaScript, TypeScript, JSX, TSX, Python, or shell source file was found outside the established runtime/script directories. No Vite-orphan candidate was identified in this scoped scan.

## Section I - Empty / test folders

`tests/` is active runtime test infrastructure. This scan did not identify or classify empty directories repo-wide because the triggering work is workflow governance, not physical cleanup. Any empty-folder cleanup requires a dedicated inventory pass.

## Section J - Bug-class-specific dormant/legacy-route inventory

Not applicable: this task does not change a frontend URL, API endpoint, model, or mounted runtime surface. The competing surfaces are instruction and skill registries, classified below.

| Surface | Classification | Evidence |
|---|---|---|
| `CLAUDE.md` | active operating source | mirror script consumes it |
| `AGENTS.md` body | active generated mirror | `scripts/sync-agents-mirror.mjs --check` |
| `ACTIVE-INDEX.md` skill counts | active reference with stale content | claimed 13 before repair |
| `SKILLS-REFERENCE.md` counts | active reference with stale content | claimed 14 before repair |
| `.claude/skills/` | active Claude skill surface | filesystem inventory |
| `.agents/skills/` | active agent/Codex skill surface | filesystem inventory |
| split Seedance skill references | orphaned candidate references | named paths absent; unified skill exists |

## Section K - Legacy/orphaned under current route tree

The split `seedance-swan-workout-video` and `seedance-swan-cinematic-video` references were legacy/orphaned under the current skill route tree. Current filesystem evidence exposes the unified `seedance-swan-video` entrypoint instead. The stale split names are corrected in operating documentation; no runtime video implementation is removed.

Exact numeric skill totals embedded in operating prose were stale snapshots, not reliable inventory truth. They are replaced by the deterministic validator command rather than archived.

## Section L - .gitignore proposals

No `.gitignore` change is proposed from the clean worktree because no recurring root artifact class was present. The unrelated dirty shared checkout may warrant its own scan after its active work is reconciled. Pre-flight reference and ownership checks are required before any future proposal becomes an edit.

## Section M - Phase 2 readiness checklist

Before any physical cleanup:

- Sean approves the exact files or directories.
- Active branches and worktrees are checked.
- Imports, references, mounts, scripts, and ownership are checked where relevant.
- Material uncommitted work is preserved or handed off.
- Exact absolute targets are resolved.
- Recovery method is documented.

This inventory does not request Phase 2 for any repo file.

## Section N - Phase 3 readiness checklist

Before code-level cleanup:

- canonical runtime ownership is proven;
- repo-wide references are checked;
- tests cover the removed behavior;
- security, data, billing, and deploy impact are reviewed;
- a separate implementation slice is approved;
- closeout verification is defined.

No Phase 3 cleanup is proposed.

## Section O - What this inventory did NOT do

- It did not move, archive, rename for cleanup, or delete repo material.
- It did not edit `.gitignore`.
- It did not inspect secrets or `.env` contents.
- It did not modify production, databases, deployments, external trackers, or remote hosts.
- It did not classify unrelated dirty files in the original shared checkout.
- It did not claim any candidate is unreferenced beyond the exact grep and filesystem evidence stated here.

The case-only `skill.md` to `SKILL.md` changes in this implementation are portability corrections to active skill entrypoints, not Phase 2 cleanup.

## Section P - Open questions for Sean

None block this workflow slice. The unrelated dirty shared checkout remains owned by its existing workstreams and should receive a separate, non-destructive classification pass before any reconciliation or cleanup.
