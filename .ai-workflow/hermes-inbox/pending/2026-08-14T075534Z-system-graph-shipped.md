# The system is now queryable — and Graphify was never built

**Agent:** Opus 5 · **Landed:** `ce4fc357c` on main · **Doc:** `docs/ai-workflow/SYSTEM-GRAPH.md`

## For Hermes — a new capability you can use

Any agent can now ask the production schema questions without loading it:

```bash
node backend/scripts/query-system-graph.mjs neighbors <table>   # what touches it
node backend/scripts/query-system-graph.mjs path <a> <b>        # is there a route
node backend/scripts/query-system-graph.mjs orphans|components|empty --connected
node backend/scripts/query-system-graph.mjs unindexed|hubs|find|stats
```

Snapshot: `docs/ai-workflow/system-graph.json` (committed, ~72 KB — QUERY it, don't
load it). Regenerate: `node backend/scripts/export-system-graph.mjs > docs/ai-workflow/system-graph.json`.
Read-only: `pg_catalog` + `COUNT(*)`, no DDL/DML. Rows are POINTERS, never canon;
the tool warns past 7 days.

**Rule 72 is intact.** No vector store, no embeddings, no graph engine, no LLM in
the query path — a generated file plus a deterministic script, the same shape as
CATALOG.md. It earns its place only on chain questions ("is there a path from A to
B") that grep genuinely cannot answer.

## Findings worth carrying

- `Users` holds **60% of every FK in the database** (238/396) — every schema
  decision routes through one table.
- **62% of tables (158/254) hold zero rows.**
- **41 disconnected components.** Whole features have NO path to `Users`: the
  8-table `gallery_*` cluster, `leads`+`lead_activities` (marketing data attached
  to no user), `Factions`+`FactionMemberships`, `flags`+`flag_overrides`,
  `e2ee_key_bundles`+`e2ee_one_time_prekeys`, `Parties`+`PartyMembers`.
  Correct-by-design or drift? That is the orphan-disposition slice's question.

## Graphify: the record, corrected

Sean asked to see it run. It has **no code** — 5 markdown files (policy, index,
templates, a checkpoint), zero scripts, no package.json entry, no graph dependency.
It was a plan retired before implementation, not a feature that was switched off.
Nothing was disabled; nothing exists to enable.

## Mistakes I made

- **REPEAT of the mistake I wrote up in my last memo.** Last time: published an
  artifact and never rendered it, so Sean couldn't see it. This time I published
  the map having verified only JS syntax and data injection — *not* that it
  actually painted — and only ran a browser afterwards. Same family, one turn
  later. Publishing without rendering is not verification; the rule is: open it in
  a browser BEFORE it goes out.
- **Said "Graphify is tombstoned" twice without checking whether any code existed.**
  It took Sean asking a third time for me to run the one grep that produced the
  real answer (zero executables). "Retired" implied a switch; there was no switch.
  Carried-forward claims need re-verification, which is exactly what stale-check
  exists to force.
- **My first fix made the page visibly worse.** Stronger gravity + a lower zoom
  floor "fixed" the offscreen nodes by shrinking the whole system to a speck. I
  had assumed the failure mode instead of measuring it; the actual cause was 41
  disconnected components, which one diagnostic revealed immediately. Measure the
  failure before fixing it.
- **Hit the same ESM-resolution trap twice in one turn** — `pg`, then
  `@playwright/test`. Node resolves from the FILE's directory, not cwd, so a
  script in `c:/tmp` or repo root cannot import a package installed under
  `backend/` or `frontend/`. I re-learned it minutes after learning it.
- Wrote a `sed` that assumed a shell variable would survive into `node -e` as a
  Windows path; it produced `C:\c\Users\...`. Path style does not cross the
  bash→node boundary for free.

## External-model calibration

None consulted this turn — the work was verification and rendering, both of which
I could prove locally with the project's own Playwright.
