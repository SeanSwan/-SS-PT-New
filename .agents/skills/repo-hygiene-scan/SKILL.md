---
name: repo-hygiene-scan
description: Runs the Phase 1 non-destructive hygiene scan required by AGENTS.md rules 32-39 and REPO-HYGIENE-PROTOCOL.md. Produces a dated inventory doc. Never moves, renames, or deletes files. Use before major refactors, dashboard audits, route-tracing with competing surfaces, or any session where the repo feels confusing.
---

# Repo Hygiene Scan

**Role:** standardized execution surface for AGENTS.md rules 32-39. Produces the Phase 1 non-destructive inventory doc in a consistent format so every scan looks the same and no classification is skipped.

This skill is a **Phase 1 only** procedure. It never moves, renames, or deletes files. Phase 2 (physical relocation) and Phase 3 (code-level dead-surface cleanup) are separate passes that require explicit Sean approval.

## When to invoke (from AGENTS.md rule 32)

**Mandatory before:**
- Major refactors or architecture changes
- Dashboard audits
- Route-tracing or debugging tasks with competing surfaces
- Any fresh session where Sean says the repo feels confusing or cluttered

**Mandatory after:**
- Any large workstream that created many artifacts or planning docs

**Optional:**
- Quarterly

## Mandatory output

Produce a dated inventory doc at `docs/ai-workflow/REPO-HYGIENE-INVENTORY-YYYY-MM-DD.md` with the structure below. Follow the format of the first formal inventory at `docs/ai-workflow/REPO-HYGIENE-INVENTORY-2026-04-12.md`.

### Required sections

```
Section A — Root directory summary
  Total entries, runtime dirs, operating files, clutter classes

Section B — Existing archive folders map
  archive/, docs/archive/, docs/ai-workflow/archive/,
  docs/ai-workflow/AI-HANDOFF/debate-archive/,
  AI-Village-Documentation/validation-prompts/archive/ (note: real path)

Section C — QA screenshots at repo root
  Count, prefix subclasses, proposed destination

Section D — Planning/spec files at repo root (.yml, ad hoc .md)
  Labels: active reference / planned blueprint / superseded

Section E — Log / build artifacts at repo root
  Proposed .gitignore additions (rule 39)

Section F — Temp / accidental files
  Always classify, never "safe to delete"

Section G — Ad hoc .md notes at repo root
  Labels: active reference / archive / ambiguous

Section H — Orphaned source files at repo root
  Files outside frontend/src that cannot be bundled by Vite
  Import reference check results

Section I — Empty / test folders
  Classification required

Section J — Bug-class-specific dormant/legacy-route inventory
  If the triggering task is a route/surface bug, enumerate all related paths

Section K — Legacy/orphaned under current route tree
  Use exact wording "legacy/orphaned under current route tree"
  Do NOT claim "dead" without a repo-wide import audit

Section L — .gitignore proposals (rule 39)
  Proposed patterns for recurring clutter
  Pre-flight grep required before any Phase 2 execution

Section M — Phase 2 readiness checklist
  What Sean must approve before Phase 2 starts

Section N — Phase 3 readiness checklist
  What must be satisfied before code-level cleanup

Section O — What this inventory did NOT do
  Explicit list of actions not taken

Section P — Open questions for Sean
  Classification ambiguities requiring human decision
```

## Language rules (rule 34)

**Forbidden phrases in the inventory output:**
- "safe to delete"
- "guaranteed deletable"
- "nothing to lose"
- "definitely dead"
- "100% unused"

**Required replacements:**
- "likely deletion candidate pending Phase 2 approval"
- "appears unreferenced based on current grep"
- "requires final reference check before destructive action"
- "legacy/orphaned under the current route tree"
- "not rendered by the currently verified canonical route tree for this surface"

Any hygiene scan output that contains a forbidden phrase must be rewritten before being shown to Sean.

## Classification taxonomy (rule 33)

Every non-trivial discovered file gets exactly one label:
- active runtime code
- active reference doc
- planned/unimplemented blueprint
- legacy but still referenced
- orphaned candidate
- archive-only historical record
- QA artifact / screenshot / temp output
- ambiguous (requires Sean's call)

## Hard constraints (no exceptions)

- No `mv`, `rm`, `git mv`, `git rm`
- No `.gitignore` edits (propose only)
- No runtime code deletion
- No claim of "safe to delete"
- No moving "obviously orphaned" files — every classification is a proposal pending approval

## Integration with protocol doc

Full workflow: `docs/ai-workflow/references/REPO-HYGIENE-PROTOCOL.md`

This skill is the execution surface. The protocol doc is the process. Rules 32-39 in AGENTS.md are the binding contract.

## Integration with other Swan skills

- **`swan-orchestrator`** dispatches to this skill when rule 32 triggers
- **`canonical-surface-audit`** may run alongside for route-tracing tasks
- **`closeout-evidence-lock`** runs at the end and may reference the hygiene output in its residual-risk section

## Non-goals

- Does not move files (Phase 2)
- Does not delete files (Phase 3+)
- Does not edit .gitignore (Phase 2)
- Does not audit routes (that's `canonical-surface-audit`)
- Does not produce design work (that's `swan-design-router`)
