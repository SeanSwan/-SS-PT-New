# S4 — Results, and two new defects the build found

Recorded 2026-09-19. Everything below was measured in the salvage worktree
(`tmp/worktrees/brain-console-salvage-20260918`, branch `swan-brain-console-v3-salvage-20260918`).
**Nothing is committed.** `main` is untouched; no production surface was contacted.

## What was built, and its evidence

| Item | Files | Evidence |
|---|---|---|
| **S4.1 Gate Health** | `gateHealth.mjs` (245), `gateHealth.test.mjs` (281), `app/app-gates.mjs` (189), `app/app-gates.test.mjs` (111), `app/tabs.json` row, `assetRoutes.mjs` (64) | 22 + 10 node tests green; live console shows **10 tabs / 10 panels**, `gate-health` reachable by arrow keys at position 6 |
| **S4.1 MCP tool** | `mcp/tools.mjs` (259), `mcp/searchDoctrine.mjs` (100), `mcp/tools.test.mjs` (284), `mcp/server.test.mjs` | exact-set pin observed RED at `expected: 4, actual: 5`; then 24 + 10 green |
| **S4.2 Screenshot diff** | `shot-diff.mjs` (249), `shot-diff.test.mjs` (136), workflow edit, `docs/qa/baseline/three-worlds/README.md` | 16 node tests green; identity guard verified against a real wrong app |
| **S4.3 Adaptive cap** | `capProbe.ts`, `renderSlots.ts`, `__tests__/capProbe.contract.test.ts`, `runtime.contract.test.ts` | `configureSlots` RED observed (`5 failed \| 57 passed`), then **98/98** green across three files |

**Combined node suites: 166/166 across eleven files.** Frontend three-worlds: **98/98**.
`console-verify.mjs`: **19/19** against a live console (up from 18 — see below).

## The real gate-health report (`pass: 0` of 5)

```
stale         planning-validation    result is 200 days old (limit 14) — not evidence about today
not_evidence  provider-ab            mode "mock" — a simulated run proves nothing about the real system
not_run       three-worlds-render    no persisted result — "did it run?" has no answer
not_run       engine-contract        no persisted result — "did it run?" has no answer
fail          gate-shadow-window     expired 14 day(s) ago — these gates block again; review at expiry
```

That last row is actionable: `.ai-workflow/gate-mode.json` says `"until": "2026-09-06T00:00:00Z"`, so
`dual-tier-gate` and `hermes-closeout-gate` have been **blocking again since 2026-09-06**, and the file's
own `_review_at_expiry` says the review was due. Nobody noticed, because nothing surfaced it.

## Defect found and fixed in `console-verify.mjs` (the harness could not reach its own assertion)

The rewritten registry-driven tab check **aborted the whole run at check 6 of 18** when the shell died:
`#fleet-summary [data-card="collisions"]` never rendered, the locator threw a 30s `TimeoutError`, and the
uncaught throw killed the process — so the check written specifically to catch a dead shell **never
executed**. That is the D14–D21 reachability class turned on the harness itself.

Fixed by running every check inside an isolated `step()` wrapper (and `page.setDefaultTimeout(5000)`), so a
throw becomes a named FAIL and the run continues. Verified by re-running the original defect:

```
FAIL  boot: no console errors      — Failed to load resource: 404
FAIL  engine: status reads BLOCKED — reads "—"
FAIL  fleet: 20 rows rendered      — 0
FAIL  a11y: tab strip matches the registry — registry [9 incl. judge] vs DOM [8]
[browser] 10/18 checks passed      exit=1
```

All 18 checks now report, and the registry check names the defect explicitly.

Two reporting defects were also fixed: an empty `Error('')` message rendered as a bare em-dash
(`?? err` keeps `''`, which is not nullish), and the engine check now prints the value it saw.

## New defect **D22** — S4.3's probe has no permitted caller

`capProbe.applyDerivedCap()` is exported and **nothing in S4's file table calls it**. Every file that
could — a component that mounts the worlds — lies outside the slice. So in production the cap is still
`4`; what changed is that it is now changeable in one line instead of impossible.

This is the D14–D21 defect class recurring **inside S4's own resolution**: D18 correctly moved the probe
to the frontend and correctly identified the missing seam, but the slice's permitted changes still cannot
reach the slice's deliverable. Filed rather than papered over.

## New defect **D23** — S5's lit families reverse a documented decision, and break S4.2

`SCENE_SIGNATURES`' own comment (`paramsCore.ts`) records that the fleet was **deliberately moved off lit
PBR materials** so scenes render identically under hardware and software GL:

> "Every material below is MeshBasicMaterial / PointsMaterial / LineBasicMaterial — that is what the
> builders actually construct, because the fleet was moved off lit PBR materials so scenes render
> identically under hardware and software GL. The table kept declaring MeshStandardMaterial and
> MeshPhysicalMaterial long after the builders changed."

S5 asks for `lit.ts` with `MeshPhysicalMaterial` + `transmission`. That reintroduces exactly the material
class the fleet was moved off. Two consequences:

1. It **reverses a documented design decision**, which is Sean's call, not the builder's.
2. It interacts badly with S4.2: a lit PBR family renders differently under hardware vs software GL, so
   any `LOOKS` row pointing at a lit family makes **screenshot baselines environment-dependent** — the
   baseline recorded on a GPU runner would fail on a SwiftShader runner and vice versa. `shot-diff` would
   then be a gate that fails for a reason unrelated to the change under test.

**S5 is therefore held, not skipped.** The gap it addresses (8 families behind 20 compositions) is real
and the D19 ruling is sound about the file table; the question is whether to accept lit materials, and
that is a decision, not an implementation detail.

## Blocker: the `renders` job cannot boot locally

```
Error: [safe-delete][SAFE_DELETE_BULK_CONFIRM_REQUIRED]
  {"count":152,"threshold":50,"targets":[".../frontend/node_modules/.vite/deps"]}
```

Vite's forced re-optimization tries to bulk-delete 152 files and the local safe-delete guard refuses
deletion above 50 files, so vite dies at startup. This blocks **both** `gallery-verify.mjs` and
`shot-diff.mjs` — the entire `renders` job. Consequence: `docs/qa/baseline/three-worlds/` is **empty**, so
the new CI step will fail until baselines are committed. That is recorded as the honest state of the gate
rather than softened with a tolerant exit code.

While diagnosing it, `:5199` was found serving a **theme-lens harness from a different worktree**. The
workflow's readiness probe accepted any HTTP 200 from that port and would have measured the wrong
application. Both the probe and `shot-diff.mjs` now check the harness title. `verify-all.mjs` already had
this guard locally; the workflow did not.

## Rule 4 — re-counted, as the cross-slice rules require

Every file touched was re-measured. Four violations were created by the build and fixed:

- `tools.test.mjs` 354 → **284** (RED records moved to `mcp/RED-RECORD.md`; gate-health tests moved beside
  their module)
- `server.mjs` 308 → **280** (route table extracted to `assetRoutes.mjs`)
- `gateHealth.test.mjs` 208 → **281** (grew when B10 moved in, still legal)
- `app.js` 250 → **258**

**One pre-existing violation remains and was NOT touched:** `gallery-verify.mjs` is **553 lines**, and it
is not in any slice's file list. Flagged for the review round rather than silently changed.

## Guard quality — what was actually falsified

| Guard | RED actually observed? |
|---|---|
| `gateHealth` "not run ≠ pass" | **Yes** — `ERR_MODULE_NOT_FOUND`, then a 16-case sweep |
| exact-set pin, 4→5 tools | **Yes** — `expected: 4, actual: 5`, 2 assertions red |
| transport `tools/list` | **Yes** — 2 subtests red on the fifth tool |
| Gate panel renders a row per gate | **Yes** — table not appended → `0 rows rendered for 5 declared gates`, 18/19 |
| `configureSlots` override | **Yes** — `5 failed \| 57 passed` |
| `capProbe` floor clamp | **Yes** — exactly 1 of 19 assertions red |
| `shot-diff` identity | **Yes** — refused a real wrong app by name |
| `shot-diff` pure classifier | **No** — written after the module; 16/16 first run. NOT claimed otherwise |

Also corrected in-flight: an earlier draft of `capProbe.contract.test.ts` claimed **five** branches had
been individually falsified. Only one had. The comment was rewritten to say so, because a falsification
record that overstates itself is worse than none.
