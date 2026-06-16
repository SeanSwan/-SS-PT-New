# Fusion Portability Protocol

> The AI Village Fusion triangle is a **cross-project tool**, not a SwanStudios-only
> feature. This doc defines where its output goes so a run on another project never
> writes into the SwanStudios repo. Established 2026-06-16 (Sean).

## The problem
The fusion scripts physically live in the SwanStudios repo (`SS-PT/scripts/`). Two
of them historically hardcoded the output root to **this repo** (script-anchored):
`fusion-triangle.mjs` and `fusion-prune.mjs`. So running the SS-PT triangle from a
*different* project wrote that project's `answers/` + `synthesis.md` into
`SS-PT/.ai-workflow/fusion/` — cross-project pollution.

## Phase 1 — output routing (LANDED 2026-06-16, backward-compatible)
A single resolver, `resolveFusionRoot(env, fallbackDir)` in
`scripts/lib/fusion-handoff.mjs`, decides the output root:

1. **`SWAN_FUSION_ROOT`** (env) — if set, resolved to an absolute path and used as the
   fusion root (the dir that holds `<runId>/`). Point any project at its own
   `.ai-workflow/fusion` — or a global home like `~/.swan-fusion` — so runs land there.
2. **Fallback** — the caller's historic default (script-anchored for the launcher/prune;
   CWD-relative `.ai-workflow/fusion` for direct handoff use).

**Backward-compatible by construction:** with `SWAN_FUSION_ROOT` *unset*, every caller
returns exactly its historic path. A triangle already running on another project is
unaffected (Node loads `.mjs` into memory at start, so disk edits don't touch a live
process; and the next run, env-unset, behaves identically).

### Usage
```bash
# From any non-SwanStudios project — route output to that project:
SWAN_FUSION_ROOT="C:/path/to/other-project/.ai-workflow/fusion" \
  node "C:/.../SS-PT/scripts/fusion-triangle.mjs" --task "..." --agents claude,gemini,codex

# Or a single global home shared across all projects:
SWAN_FUSION_ROOT="$HOME/.swan-fusion" node .../fusion-triangle.mjs --task "..."

# Prune respects the SAME root (cleans where the triangle wrote):
SWAN_FUSION_ROOT="$HOME/.swan-fusion" node .../fusion-prune.mjs
```
Wired in: `fusion-triangle.mjs` (FUSION_ROOT), `fusion-prune.mjs` (FUSION_DIR),
`fusion-handoff.mjs` (DEFAULT_FUSION_ROOT). Covered by a unit test in
`scripts/lib/fusion-handoff.test.mjs` (`resolveFusionRoot`).

## Phase 2 — portable tool (PLANNED, do when no run is in flight)
Promote the fusion scripts out of the SwanStudios repo into a **project-agnostic home**
so SwanStudios becomes "just another project" that uses the shared tool:
- Option A: a global tool dir (e.g. `~/.swan-fusion/bin/`) invoked by absolute path / a
  shell alias; output defaults to the **calling project's** CWD `.ai-workflow/fusion`.
- Option B: its own tiny git repo / npm package (`fusion-triangle`) installed globally:
  `fusion-triangle --task "..." [--out <dir>]`, output defaulting to CWD.
Either way: **output goes to the invoking project, never hardcoded to SS-PT.** Schedule
Phase 2 when no other project is mid-run (coordinate timing first — Sean's standing rule:
don't change fusion code while it's actively in use elsewhere).

## The rule
**Fusion output belongs to the project that invoked the run.** Never assume the
SwanStudios repo. New fusion code paths must route through `resolveFusionRoot(...)` (or
accept an explicit `root`/`--out`), never a bare hardcoded `.ai-workflow/fusion`.

## Related
- `.claude/skills/ai-village-fusion/SKILL.md` — the tiers + board
- `scripts/lib/fusion-handoff.mjs` — `resolveFusionRoot`, run scaffolding
- `scripts/fusion-triangle.mjs` / `scripts/fusion-prune.mjs` — env-aware root
