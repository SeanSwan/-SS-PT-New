# Repo Hygiene and Dirty-Tree Release Audit — 2026-07-15

**Mode:** Phase 1 inventory and hostile release review only  
**Repository:** SwanStudios / SS-PT  
**Branch inspected:** `wip/comms-notifications-2026-07-05`  
**HEAD:** `62e26c5a1c7ea1a933ee10e8bc1b00de537bfcf6`  
**Current `origin/main`:** `12dd2725a376186c048704b64146b2b4c5d77d33`

## Release decision

**[VERIFIED] BLOCKED AS A DIRECT RELEASE CHECKOUT.** No push from this shared branch to `main` is technically justified. The branch is **612 commits behind and 5 commits ahead** of current `origin/main`; its working tree contains **1,214 dirty status entries**: 345 modified, 115 deleted, and 754 untracked. Nothing is staged.

This is not one release. It is a mixed preservation workspace containing already-shipped copies, older reviewed-but-never-released work, unreviewed feature work, generated review output, local tooling, client-specific data tooling, and root QA/temp artifacts. Release candidates must be recovered into clean worktrees based on current `origin/main`, one bounded lane at a time.

**[VERIFIED] Moving-tree note:** the 1,214-entry figure is the pre-existing audit snapshot. During the audit, another agent created eight new root .codex-tmp-swanguard-* patch artifacts, and this inventory added one document. At 2026-07-15T21:33Z, the post-audit full-untracked count was 1,223 entries (345 modified, 115 deleted, 763 untracked). The checkout is actively mutating, so later counts may rise. Those eight patches are active owner-uncertain work and must not be moved, deleted, staged, or released by this lane.

## Hostile findings, highest risk first

1. **[VERIFIED] Stale-base release risk:** direct merging or pushing from this branch would mix work created across a 612-commit divergence with current production code.
2. **[VERIFIED] Review-evidence expiry:** the communications lane was reviewed on 2026-07-01, but current main has since changed at least eight same-path communications files. Its prior green suite is historical evidence, not a current release gate.
3. **[VERIFIED] Quality-gate failures:** full-tree `git diff --check` reports 840 errors; the runtime-only check reports eight whitespace/EOF errors. Sixty-one dirty JavaScript/TypeScript source or test files exceed the repository's 300-line ceiling.
4. **[VERIFIED] Migration and integration risk:** the communications lane includes six unpublished migrations plus auth, server, socket, model-association, delivery, audit, and UI changes. It cannot be treated as a frontend-only feature.
5. **[VERIFIED] Generated-output contamination:** all 115 tracked deletions are under `AI-Village-Documentation`; AI Village churn is interleaved with app work and must not enter an application release batch.
6. **[VERIFIED] Data-safety hold:** a new client-specific history seed script performs database writes and destructive-style operations. It requires a separate data-change review, exact target/rollback receipt, de-identification check, and explicit approval before it is run or published.
7. **[VERIFIED] Dependency drift:** the dirty backend package manifest requests `archiver` 8.x while current main already uses 7.x. That change is not release-ready and must not hitchhike with gallery/content work.
8. **[VERIFIED] Ownership uncertainty:** recent unclaimed edits exist despite no current shared-runtime lane lock. Absence of a lock is not proof that a file is abandoned.

## Push / hold / preserve matrix

| Lane | Evidence | Classification | Current decision |
|---|---|---|---|
| Secure native client CSV export | Final commit `4be8f03ca` is an ancestor of current main and was live-verified on both services | Active runtime, already released | **No push needed.** Shared-tree export variants are stale/ambiguous and must not replace main. |
| Schedule ghost-slot layer | Local commits `cd0e3e469` and `7223c6711` are patch-equivalent to current main (`git cherry` marks both `-`) | Active runtime, already represented on main | **No push needed.** |
| Communications / messaging / notifications | 171 dirty paths; 124 absent from current main; six migrations; historical 39-backend-file/22-frontend-file review packs | Active but unreleased WIP | **Highest-value recovery candidate, not a direct push.** Rebase/transplant into a clean branch, split, repair, and rerun gates. |
| Pain-chart insight upgrade | Unique commit `d7e501559`; 10 files; 1,294 insertions; two new files exceed 300 lines | Unreviewed active WIP | **Hold.** Decompose, review caller/data truth, test, and hostile-review before release consideration. |
| Progress/Fable consultation tooling | Unique commit `7b774b52a`; primarily docs, model registry, and `scripts/consult-fable.mjs` | Active reference/tooling candidate | **Separate non-Render batch.** Review against current workflow docs first. |
| Local Codex permission changes | Unique commit `62e26c5a1` changes `.claude/settings.json` | Local operator configuration | **Do not ship to Render.** Reconcile only as an explicit tooling-policy change. |
| AI Village outputs and archive churn | 285 unique dirty paths in the release-lane classification; 115 deletions | QA/generated/archive material | **Quarantine from app releases.** Cleanup is a separate approved pass. |
| Workout / Coach / Client Hub / nutrition mix | 127 unique-vs-main dirty paths; most paths also exist on main with different content | Competing/ambiguous WIP | **Hold and split by canonical surface.** Compare each lane against newer main before preserving any patch. |
| Bootcamp / equipment | 44 unique-vs-main dirty paths; prior coordination marked an owner-fenced lane | Active or planned WIP, ownership-sensitive | **Do not touch until owner/recovery mapping is refreshed.** |
| Challenges / gamification | 25 unique-vs-main dirty paths; most also exist on main and differ | Competing/ambiguous WIP | **Hold.** Current main contains later social/group changes; perform semantic comparison first. |
| Gallery / content studio | Eight unique-vs-main dirty paths plus package-version drift | Competing/ambiguous WIP | **Hold.** Separate feature logic from dependency changes. |
| Root patch/log/image/temp artifacts | About 54 release-classified unique root artifacts, including malformed zero-byte filenames | QA artifact / temp output / orphan candidates | **No release.** Phase-2 cleanup only after reference checks and approval. |
| Current Claude D-pack document | Live coordination lock on `docs/ai-workflow/brainstorms/agent-platform-pack-2026-07-14.md` | Active authored work | **Do not touch.** |

The lane counts above are release classifications and may overlap at boundaries; they are not intended to sum to the Git status total.

## Verification snapshot

| Gate | Fresh result | Meaning |
|---|---|---|
| `git status --short` | 1,214 entries; 0 staged | Confirms mixed dirty workspace. |
| `git rev-list --left-right --count origin/main...HEAD` | 612 behind / 5 ahead | Blocks direct release from this branch. |
| Dirty path vs current-main comparison | 325 dirty paths exactly match current main; 889 do not | A material portion is duplicate overlay, while the rest needs lane recovery. |
| `git cherry -v origin/main HEAD` | Two ghost-slot commits patch-equivalent; three commits unique | Separates already-landed patches from unreleased commits. |
| Frontend `npm run type-check` | Exit 0 | Current mixed frontend type-checks. |
| Frontend `npm run build` | Exit 0; 6,317 modules | Current mixed frontend bundles. This is not release evidence for any isolated lane. |
| Full `git diff --check` | Exit 2; 840 errors | Whole dirty tree fails hygiene. |
| Runtime-only `git diff --check -- backend frontend scripts` | Exit 2; 8 errors | Runtime subset also fails hygiene. |
| Source/test line-cap scan | 61 dirty JS/TS files over 300 lines | Requires decomposition or explicit legacy accounting before release. |
| Backend full suite | Not run | Mixed tree is too broad to produce trustworthy lane-level evidence. Each recovered lane needs its own current suite. |
| Production health | Frontend HTTP 200; backend `/health` and `/api/health` HTTP 200 | No current production outage was found. |
| Render deploy state | Frontend live on current main; backend live on the latest backend-affecting main commit | Main is serving; a dirty-tree bulk push is not needed to restore health. |

A successful mixed-tree frontend build does not override the stale base, migrations, review expiry, line-cap violations, whitespace failures, ownership ambiguity, or missing current backend verification.

## A. Root inventory summary

- **[VERIFIED] Audit-input root:** 193 immediate entries: 33 directories and 160 files. Eight concurrent Swanguard patch artifacts raised the post-audit root to 201 entries.
- The 2026-07-14 inventory recorded 123 entries, so the root grew by 70 entries in roughly one day.
- Root growth is dominated by patch, prompt, QA, log, image, metrics, and temporary helper artifacts rather than canonical runtime modules.
- Canonical root operating files remain `CLAUDE.md` and `ACTIVE-INDEX.md`; the expanded artifact population conflicts with the root-minimalism rule.

## B. Existing archive map

| Location | Current role | Immediate children |
|---|---|---:|
| `archive/` | Broad historical material | 4 |
| `docs/archive/` | Documentation archive | 26 |
| `docs/ai-workflow/archive/` | AI-workflow historical records | 7 |
| `docs/ai-workflow/AI-HANDOFF/debate-archive/` | Retired debate packets | 12 |
| `AI-Village-Documentation/validation-prompts/archive/` | Validation-prompt history | 20 |

The archive structure exists; the issue is classification and approved movement, not absence of destinations.

## C. Screenshot and image inventory

The root image set remains classified as QA/reference output, not application assets. It includes mobile audits, console screenshots, and generated visual-reference files. No root image is imported by the verified runtime based on the existing reference scan. Each remains an **orphaned candidate pending final reference check and Phase-2 approval**. The complete filename inventory is retained in `REPO-HYGIENE-INVENTORY-2026-07-14.md`.

## D. Planning/spec files at root

Root planning-like outputs include the Apex navigation diff, mobile metrics JSON, generated prompts, and one-off audit packets. They are **QA artifacts / temp outputs** unless a current operating document references them. Canonical plans belong under `docs/ai-workflow/`, not at root.

## E. Logs and build artifacts

Root logs and generated build/audit output are non-runtime artifacts. The fresh frontend build updated ignored `frontend/dist` content only. No build output belongs in a release commit unless already tracked by an explicit deployment contract.

## F. Temp and accidental files

- Root `.codex-*.patch`, `.codex-tmp-*`, `.tmp_*`, `*.diff`, and one-off helper sources are **orphaned candidates pending reference checks**.
- Two malformed zero-byte filenames appear to be captured shell fragments; they require a final path/reference check before any destructive action.
- AI Village validation output is generated QA material and must remain outside application batches.

## G. Root Markdown inventory

Root Markdown remains restricted to canonical operating files. Ad hoc handoffs, plans, and review notes belong under the existing `docs/ai-workflow/` structure. No Markdown file was moved during this audit.

## H. Source-code files at root

Root helper scripts and temporary generated source files are not canonical runtime modules. Their logic must be either preserved in a named script location through a separate review or classified for later cleanup. No source file was moved or rewritten.

## I. Empty, test, and placeholder folders

Previously identified empty dashboard card/style directories remain **ambiguous placeholders** until import and route checks confirm their status. Test directories are active QA infrastructure and are not cleanup targets merely because they do not ship to Render.

## J. Duplicate-feature and competing-surface inventory

| Surface family | Current classification | Required resolution |
|---|---|---|
| Client export shared-tree variants vs final main implementation | Legacy/competing copies vs canonical released surface | Preserve main; inspect only the one unpreserved extra test before cleanup. |
| Communications center / notification views / delivery health | Active unreleased WIP with same-path main drift | Recover on current main and prove mount, API, route ownership, schema, and migrations. |
| Workout/Coach/Client Hub/nutrition edits | Competing/ambiguous | Split into individual canonical-surface audits. |
| Challenges/gamification edits | Competing/ambiguous | Compare against newer main social/group work. |
| AI Village validation outputs | QA/generated | Keep out of runtime release history; classify for archive/cleanup later. |

No canonical-surface repair claim is made by this inventory.

## K. Legacy/orphaned candidates affecting the current route tree

- Shared-tree client-export variants do not supersede the released main implementation.
- The communications lane appears active but is not proven against the current route tree; it needs a new Canonical Surface Receipt before edits or release claims.
- Mixed workout, Coach, challenge, and gallery files are **competing/ambiguous**, not automatically legacy.
- Root QA/temp artifacts appear unreferenced based on the current grep and remain candidates pending Phase-2 reference checks.

## L. Proposed `.gitignore` additions

For a later explicitly approved cleanup pass, evaluate:

```gitignore
/.codex-*.patch
/.codex-tmp-*
/.tmp_world*.py
/*.diff
/*.jpeg
/*.jpg
/swanguard-mobile-metrics.json
```

The metrics entry requires an ownership check first. No `.gitignore` change was made.

## M. Phase-2 readiness

**Not ready for one global cleanup or release pass.** Phase 2 must be split:

1. Create clean worktrees from current `origin/main`.
2. Recover communications in bounded backend/migration, frontend, and integration batches.
3. Preserve and review the untracked client-specific seed script without running it.
4. Reconcile unique commits (pain chart; Fable/progress tooling; local permissions) independently.
5. Re-run references before any root or AI Village move/archive/delete proposal.
6. Obtain Sean's approval before cleanup execution, migration release, paid AI Village review, or main push.

## N. Phase-3 recommendation

After releases are isolated and shipped or rejected, run root minimization as a separate task: archive approved QA evidence, remove approved malformed/temp artifacts, add recurring-artifact ignore rules, refresh `ACTIVE-INDEX.md`, and verify a clean root inventory.

## O. Explicitly not done

- No runtime code, migration, package manifest, or test was edited.
- No file was moved, archived, deleted, staged, committed, pushed, or deployed.
- No migration or client-specific seed script was run.
- No AI Village mode was invoked.
- No backend full suite was represented as current release proof.
- No continuity closeout was appended.

## P. Recommended next decision sequence

1. **Communications recovery first:** create an isolated branch/worktree from current main; transplant only the communications lane; split migrations/backend core, frontend UX, and integration wiring; repair line limits and diff-check failures; produce route/schema/migration receipts; rerun backend and frontend packs; then hostile review.
2. **Pain-chart review second:** decompose the two over-limit files and verify the real mounted pain-history/data path.
3. **Tooling/docs third:** reconcile Fable/progress docs and permission changes as non-Render work.
4. **Cleanup last:** perform the approved root and AI Village cleanup only after runtime work is preserved in named branches or commits.

The first safe action is therefore **not a push**. It is a clean-current-main communications recovery branch with a no-main-push gate until fresh evidence is complete.



