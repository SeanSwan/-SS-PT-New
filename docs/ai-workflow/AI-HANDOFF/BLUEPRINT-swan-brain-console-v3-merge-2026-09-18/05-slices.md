# 05 — Slices, with executable acceptance criteria

Each slice ends with a **STOP line**. Do not begin slice N+1 until the checkpoint passes.

> ## ✅ DECIDED — 2026-09-19 · execution order `S0 → S0b → S1 → S3 → S2 → S4 → S5`
> **All eight plan defects (D14–D21) are ruled on.** The rulings are authoritative and live in
> **`DECISIONS-D14-D21.md`** in this packet — read that before this file. Two structural consequences:
> **a new slice `S0b` (manifest port) follows S0**, and **S3 precedes S2** (Judge Mode arrives as a
> registry row, not a hardcoded tab, because S3's whole acceptance criterion is "a new panel needs no
> shell edit"). Slice *IDs* are unchanged so every existing cross-reference still resolves; slice
> *order* is now explicit and is not ID order. The acceptance tables below are the evidence record;
> where a ruling changed a criterion, the change is marked inline.

---

## S0 — SALVAGE *(blocking; nothing else starts until this passes)*

**Scope:** move 77 files out of a gitignored directory whose git link is dead, into a live branch.
**No source edits.**

**Source:** `tmp/worktrees/brain-console-20260913/`
**Scopes:**
```
scripts/swan-brain-console/
frontend/src/pages/HomePage/three-worlds/
frontend/qa-worlds.html
frontend/qa-worlds.tsx
frontend/tsconfig.three-worlds.json
.github/workflows/three-worlds-fleet.yml
docs/ai-workflow/AI-HANDOFF/SWAN-BRAIN-CONSOLE-V3-*.md
docs/ai-workflow/AI-HANDOFF/ZCODE-HOSTILE-ROUND4-*.md
```

**Steps**

```bash
# 1. Snapshot a hash manifest of the source BEFORE anything moves
cd tmp/worktrees/brain-console-20260913
find scripts/swan-brain-console \
     frontend/src/pages/HomePage/three-worlds \
     frontend/qa-worlds.html frontend/qa-worlds.tsx \
     frontend/tsconfig.three-worlds.json \
     .github/workflows/three-worlds-fleet.yml \
     -type f -print0 | sort -z | xargs -0 sha256sum > /tmp/S0-BEFORE.sha256
wc -l /tmp/S0-BEFORE.sha256        # record this number

# 2. Create a REGISTERED worktree from origin/main
cd <repo-root>
git worktree add tmp/worktrees/brain-console-salvage-20260918 \
  -b feat/swan-brain-console-v3-salvage-20260918 origin/main
git worktree list                  # the new path MUST appear — this is the fix

# 3. Copy the scopes in, preserving paths exactly
SRC=tmp/worktrees/brain-console-20260913
DST=tmp/worktrees/brain-console-salvage-20260918
mkdir -p "$DST/scripts" "$DST/frontend/src/pages/HomePage" "$DST/.github/workflows" \
         "$DST/docs/ai-workflow/AI-HANDOFF"
cp -r "$SRC/scripts/swan-brain-console"                      "$DST/scripts/"
cp -r "$SRC/frontend/src/pages/HomePage/three-worlds"       "$DST/frontend/src/pages/HomePage/"
cp    "$SRC/frontend/qa-worlds.html" "$SRC/frontend/qa-worlds.tsx" \
      "$SRC/frontend/tsconfig.three-worlds.json"             "$DST/frontend/"
cp    "$SRC/.github/workflows/three-worlds-fleet.yml"         "$DST/.github/workflows/"
cp    "$SRC"/docs/ai-workflow/AI-HANDOFF/SWAN-BRAIN-CONSOLE-V3-*.md \
      "$SRC"/docs/ai-workflow/AI-HANDOFF/ZCODE-HOSTILE-ROUND4-*.md \
      "$DST/docs/ai-workflow/AI-HANDOFF/"

# 4. Same manifest from the destination
cd "$DST"
find scripts/swan-brain-console \
     frontend/src/pages/HomePage/three-worlds \
     frontend/qa-worlds.html frontend/qa-worlds.tsx \
     frontend/tsconfig.three-worlds.json \
     .github/workflows/three-worlds-fleet.yml \
     -type f -print0 | sort -z | xargs -0 sha256sum > /tmp/S0-AFTER.sha256

# 5. THE ACCEPTANCE CRITERION
diff /tmp/S0-BEFORE.sha256 /tmp/S0-AFTER.sha256 && echo "S0 PASS: byte-identical"
```

> **MSYS trap (cost a prior session real time):** `mktemp -d` yields `/tmp/tmp.X`, which **native
> Node** resolves as `C:\tmp\tmp.X`. Use a Windows-form root (`C:/tmp/...`) for anything Node reads,
> or use plain `/tmp` paths **only** in bash-only steps as above.

**Acceptance criteria**

| # | Criterion | Command | Expected |
|---|---|---|---|
| A1 | Source manifest exists and is non-empty | `wc -l /tmp/S0-BEFORE.sha256` | `77` (or the recorded count) |
| A2 | Destination is a **registered** worktree | `git worktree list` | new path listed |
| A3 | Every file arrived byte-identical | `diff` of the two manifests | empty, exit 0 |
| A4 | git can read the destination | `git status --short` there | runs (does not say "not a git repository") |
| A5 | The two scopes are **untracked but visible** | `git status --short \| grep -c three-worlds` | `> 0` |
| A6 | Engine guard still passes in the new location | `node --test scripts/swan-brain-console/engine-contract.test.mjs` | `# pass 12 / # fail 0` |
| A7 | Fleet + runtime suites still pass | `node ./node_modules/vitest/vitest.mjs run src/pages/HomePage/three-worlds/__tests__/` (from `frontend/`) | `Tests 66 passed` |
| A8 | No `git add -A` was used | inspect the staged set | explicit paths only |

**A6 and A7 are the ones that matter.** Moving files across a filesystem can break module resolution
silently; the suites are the proof it did not.

**Commit:** explicit paths only, on the new branch. **Do not push.** Requires Sean's approval.

> **STOP — do not begin S0b until A1–A8 all pass and the checkpoint verdict is PASS.**

---

## S0b — MANIFEST PORT *(NEW — ruling D14, ⚠ corrected; follows S0, precedes S1)*

**Scope:** **one** one-line addition. **Copying either manifest file is prohibited.**

| # | Criterion | Command | Expected |
|---|---|---|---|
| M1 | `verify` exists at the root | `node -e "console.log(require('./package.json').scripts.verify)"` | the `verify-all.mjs` command |
| M2 | `@types/three` is declared | `node -e "console.log(require('./frontend/package.json').devDependencies['@types/three'])"` | `^0.169.0` — **passes as-created; no edit needed** |
| M3 | **No dependency was lost** | compare the dependency sets before/after | 0 removals |
| M4 | **No script was lost** | compare the script sets before/after | 0 removals, 1 addition |
| M5 | A clean install still resolves | `cd frontend && npm ci` | exit 0 |
| M6 | The scoped type check passes with the salvaged files | `npx tsc --noEmit -p tsconfig.three-worlds.json` | exit 0 |

**M3 and M4 are the load-bearing criteria and must be RED-first** — remove a destination script,
confirm M4 fails, restore it.

**⚠ Correction (2026-09-19).** This slice was originally scoped to two additions and warned that copying
the frontend manifest would delete `barcode-detector`, `dompurify` and `react-big-calendar`. **That was
wrong** — those three deps exist only on the unrelated working branch `creator-brains-engine-r2-20260915`,
not in `origin/main` and not in the orphan. Measured against `origin/main` (the tree S0 actually copies
from), the frontend manifests are **identical in every key set**, so there is nothing to port on the
frontend side and `@types/three` needs no change. The single genuine gap is the root `verify` script.
See `DECISIONS-D14-D21.md` §D14 for the full correction table.

> **STOP — do not begin S1 until M1–M6 pass.**

---

## S1 — MCP server (read-only)

**Scope:** `scripts/swan-brain-console/mcp/` (4 files). No changes to the existing console.

> **⚠ Ruled D17 — S1 ships FOUR tools, not five.** `swan_get_gate_health` **moves to S4**, because it
> is backed by gate result files and the module that reads them (`gateHealth.mjs`) is an S4 artifact.
> B1 previously said *"exactly the five allowed names"*, which contradicted the ruling; it now says
> four, and S4's acceptance gains *"the MCP tool list is now exactly five"*. **D17(a):** the tools use
> **direct imports**, not `GET /api/state` — `03-contracts.md`'s `GET /api/state` backing claim is
> deleted. **D17(b):** degraded mode is re-scoped from "console is down" (vacuous without HTTP) to
> "a data module fails to load" — the process must not exit. **D17(d):** `filter` becomes
> `{field, value}` and the doctrine search gets an allowlist plus a bounded limit.

**Acceptance criteria**

| # | Criterion | Command | Expected |
|---|---|---|---|
| B1 | Tool list is **exactly** the four allowed names | `node --test scripts/swan-brain-console/mcp/tools.test.mjs scripts/swan-brain-console/mcp/server.test.mjs` | pass, incl. the exact-set assertion |
| B2 | **No write tool exists** | the same run | adding one makes it fail |
| B3 | `swan_get_state` returns the real snapshot | call the tool | `fleet.rows.length === 20` |
| B4 | `swan_get_engine_state` never emits a bare `BLOCKED` | call it | `durableWrites` ∈ {`DECLARED_BLOCKED`,`VERIFIED_BLOCKED`,`UNKNOWN`} |
| B5 | Degraded mode: a failed data load is a typed error, not a crash | drive a handler that cannot honour its input | typed error + hint; the process does not exit |
| B6 | Red test first | inject `promote_variant` into the registry, run B1 | **RED** — then remove it |
| B7 | Rule 4 | `wc -l` on the **5** new files | all ≤300 |
| B8 | `filter` actually narrows | `swan_list_variants({filter:{field:'nav_model',value:'…'}})` | returns a strict subset, never all 20 |
| B9 | The doctrine search is bounded | call with an absurd `limit` | ≤50 results; every result carries `file:line` |

> **⚠ B1/B6/B7 AMENDED AT BUILD TIME — a fifth file, and a directory argument that does not work.**
> Two corrections, both from running the thing:
> **1.** `node --test <directory>` is **not** globbed by Node 22's runner — it tries to *require* the
> directory and dies with `MODULE_NOT_FOUND`. Both test files must be named explicitly. A criterion
> written as a directory would have failed on a correct implementation.
> **2.** The transport suite was **split into `server.test.mjs`** to satisfy Rule 4 (one file testing
> both the handlers and the transport was 336 lines). So S1 ships **five** files, not four, and B7
> counts five. `tools.test.mjs` tests `tools.mjs`; `server.test.mjs` tests `server.mjs`.
> See `04-build-order.md` §S1 for the updated table.

**B6 is mandatory.** A guard for a forbidden capability must be shown failing on the capability
before it is trusted.

**S1 result — 2026-09-19: ALL PASS.** `# tests 34 / # pass 34 / # fail 0` across the two files;
`engine-contract.test.mjs` unregressed at `# pass 12 / # fail 0`. B6's RED was **observed**, not
assumed: injecting `promote_variant` turned 6 of 24 assertions red across three independent guards.
**That RED run then found a defect in the guard itself** — the verb rule read `name.split('_')[1]`,
which assumes the `swan_` prefix, so it reported `uses verb "variant"` instead of `"promote"`: the
right verdict, the wrong reason, and a message pointing at nothing. Fixed, and the corrected
message re-verified. B5's original wording ("point a tool at an absent repo root") was **not
reachable** — the readers resolve their own root from their module location, so no such parameter
exists; the criterion now states what is actually provable.

> **STOP — do not begin S2 until B1–B7 pass.**

---

## S2 — Judge Mode

**Scope:** `app/app-judge.js`, `app/judge.css`, `app/judge-export.mjs`, `app/judge-export.test.mjs`,
plus two additive rows in `server.mjs` `ASSET_ROUTES`.

**Acceptance criteria**

| # | Criterion | Expected |
|---|---|---|
| C1 | Exporter is **pure** — no DOM, no network, no fs | unit-testable in `node:test` with no browser |
| C2 | 10 pairs = 20 variants, each judged at most once | assertion in the test |
| C3 | `1`/`2`/`E`/`N` produce the four verdict kinds | test |
| C4 | Verdicts persist across reload | browser check |
| C5 | Export downloads both `.json` and `.md` | browser check |
| C6 | **No server write** — the GET-only contract holds | `grep -c "method !== 'GET'"` unchanged; no POST handler added |
| C7 | Console still boots, tabs still keyboard-navigable | `console-verify.mjs` 17/17 |
| C8 | No h-overflow at 375px | `console-verify.mjs` |

> **STOP — do not begin S3 until C1–C8 pass.**

---

## S3 — Registries + tab convergence

| # | Criterion | Expected |
|---|---|---|
| D1 | `tabs.json` drives the tab strip | removing a row removes a tab |
| D2 | **A new panel needs no shell edit** | fixture test: add a row, it renders |
| D3 | `seats.json` with `gate: "relay"` renders a stop-card, not a Run button | test |
| D4 | Registries read at request time | adding a row needs no restart |
| D5 | Existing 8 tabs unchanged in behaviour | `console-verify.mjs` 17/17 |

**D2 is the whole point of S3.** It is the cheap, correct form of Sean's "merge it into one app".

> **STOP — do not begin S4 until D1–D5 pass.**

---

## S4 / S5 — Upgrade and fidelity backlogs

> **⚠ READ `04-build-order.md` D18–D21 BEFORE STARTING ANY OF THESE.** Round 4 of the hostile review
> opened this section — round 3 had left it explicitly unaudited — and found that **all four items
> carry the same defect as D14–D17: the slice's permitted file changes cannot reach the slice's own
> deliverable.** In particular: **D18** — `capProbe.mjs` is a Node file while two of its three inputs
> and its entire output are browser-only, and `MAX_LIVE_WORLDS` is a read-only `export const` with no
> setter anywhere; **D19** — a new scene family requires four edits in `scenes/paramsCore.ts`
> (exhaustive `Record<SceneFamily, …>` tables make them compile-mandatory) plus `LOOKS` rows in
> `scenes/looks.ts`, and no slice lists either file; **D20** — the screenshot-diff step needs a
> baseline set, a comparator and a tolerance policy, none of which exists; **D21** — the worked
> example in `04-build-order.md` cites the wrong axis. Also, item 1's Gate Health **tab** is
> downstream of D16.

Run as independent slices, each with its own RED-first test. Order by value:

1. **Gate Health tab** (S4.1) — makes "not run ≠ pass" visible. *(Downstream of D16: tabs are a
   hardcoded literal in `app.js`, so the tab needs the S3 registry.)*
2. **Screenshot-diff CI** (S4.2) — **the rationale stated here previously was stale, and is corrected
   rather than deleted.** The rail-reserve class is *already* automated by the `LAYOUT OVERLAP GUARD`
   in `gallery-verify.mjs`, which the workflow already runs. What no guard catches today is a
   **fleet-wide palette/token regression**: the existing digest is a *sampled* hash compared only
   within a single run, so twenty shifted variants still yield twenty unique digests and pass. That is
   the real reason to build this — and D20 records what it would additionally require.
3. **Adaptive context cap** (S4.3) — `MAX_LIVE_WORLDS = 4` is a desktop constant; mobile previewing
   20 variants does not work today. *(See D18 — the probe must live in the frontend, and the cap must
   become injectable.)*
4. ~~**Lit families** (S5)~~ — ⛔ **REJECTED AS SPECIFIED by D25; `lit.ts` is struck.** The fleet is
   deliberately unlit. The slice's real subject — the 8-families-behind-20-compositions gap — was
   served instead by building the missing **signature ↔ construction** guard
   (`scenes/signatureAudit.ts` + `__tests__/scenes.contract.test.ts`), which makes any future family's
   `SCENE_SIGNATURES` row machine-verified. **Adding a family is now a low-risk art-direction call for
   Sean**, not a blocked slice. D25 also **corrects D23**, which had rested on an attribution the
   project retracted (ban 34).

---

## Cross-slice rules

1. **RED before GREEN** for every new guard. A guard that has never been seen to fail is not a guard.
2. **Write the test for what a guard must NOT catch**, for every guard that *reports* rather than
   *writes*. (Learned the hard way in the design-brain review: a spurious write corrupts data you can
   inspect; a spurious report corrupts the operator's attention and leaves no trace.)
3. **Never `git add -A`.** Explicit paths only.
4. **Never commit or push** without Sean's explicit approval.
5. **Re-count every file you touched** when you split a file to satisfy Rule 4 — the split that fixed
   one violation created another in the design-brain workstream.
