# Swan Brain Console — MCP server (read-only)

A stdio [Model Context Protocol](https://modelcontextprotocol.io) server that lets an
agent read the design workstream's real state — the learning engine's declared status,
the 20-variant Three.js fleet, doctrine coverage — without a browser and without
starting the console.

**This server cannot write anything.** That is not a policy it follows; it is the
absence of any capability to do so. See [The read-only contract](#the-read-only-contract).

### What "cannot write" is scoped to — read this before quoting it

**Round 12 (2026-09-20), Astra F22.** The claim above is about *this server and the tools it
exposes*. It was previously left unqualified, and the unqualified version is **false** for the
directory it ships inside — so the boundary is written down here instead of being implied:

| Path | Effect on your machine |
|---|---|
| `mcp/server.mjs` and every tool it exposes | reads only — no repo write, no engine write, no browser storage |
| the HTTP console (`server.mjs`) | reads only, and GET/HEAD are the only methods it answers |
| the browser Judge panel | writes your picks to **browser `localStorage`** |
| `generate-worlds.mjs`, `wire-playground.mjs` | write **repository files** when run directly |

The last two are standalone generators, not routes. They are absent from `ASSET_ROUTES` and
from the browser's module graph, and `app/asset-routes.test.mjs` asserts exactly that — so no
HTTP request and no MCP call can reach them. **No repository-write exploit through HTTP or MCP
is claimed or known.**

---

## Register it

Any MCP client. For Claude Code, add to `.mcp.json` (or your client's equivalent):

```json
{
  "mcpServers": {
    "swan-brain-console": {
      "command": "node",
      "args": ["scripts/swan-brain-console/mcp/server.mjs"]
    }
  }
}
```

No install step, no build step, no dependencies. The server imports the console's own
reader modules, so it works from a clean checkout.

**The console does not need to be running.** There is no HTTP dependency at all — see
[Why direct imports](#why-direct-imports).

## Tools

| Tool | Arguments | Returns |
|---|---|---|
| `swan_get_state` | none | the full snapshot: `engine`, `fleet` (20 rows), `doctrine`, `copy` |
| `swan_list_variants` | `{ filter?: { field, value } }` | fleet rows; `field` ∈ `nav_model`, `hero_mechanics`, `grid` |
| `swan_get_engine_state` | none | `durableWrites`, `reason`, `declaration`, `gateDeclared` |
| `swan_search_doctrine` | `{ query, limit? }` | matching doctrine lines, each with `file:line` |
| `swan_get_gate_health` | none | every declared gate with its status, detail and age — the classifier's own verdicts |

**The table is the list.** There is deliberately no count in the prose above or below: a number
restated in two places is a defect the moment the two can disagree, and this file has already
been wrong about this exact count once (see [the note further down](#a-note-on-the-tool-count)).
`mcp/tools.test.mjs` asserts that the tool names documented here are exactly `TOOL_NAMES`, so a
tool cannot be added, renamed or dropped without this table going RED.

### `swan_get_engine_state` — read the three states carefully

`durableWrites` is **one of three**, and never a bare `BLOCKED`:

- `DECLARED_BLOCKED` — the engine's own documentation declares the gate, without
  negation. This is a **declaration**, not a verification, and the label says so.
- `VERIFIED_BLOCKED` — reserved for a probe that reads the gate itself. **No such probe
  exists in this repo**, so this state is currently unreachable; it is named so the gap
  is explicit rather than implied.
- `UNKNOWN` — the declaration is absent, negated or unreadable. Never a false
  all-clear, and always paired with a demand for review.

The console is read-only and cannot *test* a write gate, so it must not speak as though
it had. `declaration` carries the matched clause as quoted evidence, so you can check the
verdict instead of trusting it.

### `swan_search_doctrine` is bounded, on purpose

One allowlisted root (`docs/ai-workflow/design-brain/`), a query capped at 200
characters, `limit` defaulting to 10 and capped at 50, and a scanned-file cap. Results
report `truncated: true` rather than implying completeness.

## The read-only contract

**These tools must never exist:** `promote_variant`, `accept_claim`, `write_receipt`,
`run_seat`, `set_engine_state` — or anything that writes, promotes or spends.

That absence is the contract, and it is enforced two ways in
[`tools.test.mjs`](./tools.test.mjs):

1. **An exact-set pin.** The exported tool names must equal an exact literal. Adding
   any tool fails the suite.
2. **A structural verb rule.** Every tool name's leading token must be one of
   `get`, `list`, `search`. This catches a write tool nobody thought to add to the
   forbidden list — which is the only kind that will actually arrive, since a blocklist
   can only name capabilities someone already imagined.

Both guards were shown **failing** on an injected `promote_variant` before being
trusted, and that run found a real bug in the verb rule's diagnostics. The procedure and
the evidence live in [`RED-RECORD.md`](./RED-RECORD.md).

**Round 8 (2026-09-20) — two stale sentences corrected here, and the mechanism named.**
This file said the literal was a *"four-name"* one (it is five, and has been since
`swan_get_gate_health` arrived from S4), and it pointed at *"the foot of `tools.test.mjs`"*
for the RED evidence, which moved to `RED-RECORD.md` in S4. Both are the same defect: a
restated fact with no link to the fact, so it drifted while every test stayed green. The
count is now deliberately ABSENT — the list lives in `tools.mjs` and the pin in
`tools.test.mjs`, and prose that does not restate a fact cannot contradict it.

A refusal is returned as a **normal result with `isError: true`**, never as a JSON-RPC
protocol error. A tool that correctly refuses is working, not broken, and conflating the
two teaches an agent to retry a request that will never succeed.

## Degraded mode

A failed data read is a **correctable error, not a crash**: `{ error, tool, detail, hint }`,
with the process staying up. An agent that discovers a dead tool learns nothing; an agent
that gets a hint learns the fix.

This is deliberately *not* "the console is down". With direct imports there is no console
to be down, so that trigger would be vacuous. The real trigger is a missing or unreadable
data file — a partial checkout, for instance.

## Why direct imports

The tools call the console's reader modules (`fleetData.mjs`, `engineState.mjs`,
`doctrine.mjs`, `copyPack.mjs`) rather than `GET /api/state`. Requiring a running HTTP
console would make the tools unavailable exactly when they are most useful, and would
create a second source of truth that can drift from the first. This was a plan decision
(ruled D17a) that replaced the original contract's `GET /api/state` backing claim.

## Tests

```bash
node --test scripts/swan-brain-console/mcp/tools.test.mjs \
            scripts/swan-brain-console/mcp/server.test.mjs
```

`tools.test.mjs` covers the tool surface; `server.test.mjs` spawns the real process and
covers the transport — including that a malformed frame does not end it. Both files are
named explicitly because a directory argument is not globbed by Node's test runner.

## Bounds

Reads files under `docs/` and `frontend/src/pages/HomePage/three-worlds/`. No network,
no database, no `.env`, no writes, no cache. Counts are computed at read time, never
transcribed — a hand-maintained number is a number that goes stale invisibly.
