# RED records — observed failures, kept as evidence

A guard that has never been seen to fail is a guard nobody has read. This file holds the
**observed RED runs** for the Swan Brain Console's MCP surface, kept as prose because they
are records rather than assertions.

**Why they are not inside the test modules:** they were, until S4. A 33-line comment block at
the foot of `tools.test.mjs` was pushing that module toward the 300-line budget for no
behavioural reason, and prose in a test file is prose nobody re-reads. Moving the records
here is what brought `tools.test.mjs` back under budget — the assertions were not touched.

---

## B6 — a forbidden capability must be shown failing (2026-09-19)

Procedure, run against the finished S1 suite:

1. Injected into `TOOL_REGISTRY` in `tools.mjs`:

   ```js
   promote_variant: { description: '…', inputSchema: {…}, handler: async () => ({}) },
   ```

2. `node --test scripts/swan-brain-console/mcp/tools.test.mjs`
   → **RED, 6 of 24 failing**, from three independent guards:
   - B1 `the exported names equal the allowed set` — 5 names where 4 are allowed
   - B1 `there are four of them` — expected 4, actual 5
   - B2 `no forbidden name appears in the registry`
   - B2 `every tool name uses a read-only verb`
   - B2 `calling a forbidden tool is refused…`
   - and the transport suite's `tools/list` / `-32601` assertions
3. Removed the entry; re-run → **GREEN, 34/34**.

### The RED caught a real bug in the guard itself

The verb rule read `name.split('_')[1]`, which assumes the `swan_` prefix is present — so the
probe reported `uses verb "variant"` instead of `"promote"`. The guard went red for the right
verdict with the **wrong reason**, and a message that pointed at nothing. It now strips the
optional prefix first and reads the leading token; the corrected message is
`tool "promote_variant" uses verb "promote"`.

That is the argument for red-first runs in one line: a guard that is only ever seen green is a
guard nobody has read. This one was wrong in its diagnostics and would have stayed wrong.

### Why the transport suite is a separate file

It was **split out** to `server.test.mjs` to satisfy Rule 4 — which is why the acceptance
command names **both** files. A command naming only one would silently stop covering the
server.

---

## The exact-set pin, RED on the fifth tool (2026-09-19, S4)

S1 shipped four tools; `swan_get_gate_health` was ruled to S4 (D17c) because it depends on
`gateHealth.mjs`. When S4 added it to the registry, `tools.test.mjs` was run **before** the pin
was updated, and it failed exactly as designed:

```
not ok 1 - B1 — the tool list is EXACTLY the four allowed names
  expected: 4
  actual:   5
# tests 24
# pass 22
# fail 2
```

That is the pin earning its keep: adding a tool to a read-only surface is not a silent
operation, and the number in `tools.test.mjs` is the thing that makes it loud.

---

## Rule 4 is enforced by a test, so it caught its own violation (2026-09-19, S4)

Adding the fifth tool and its suite pushed `tools.test.mjs` to **354 lines**. The B7 test in
that same file failed on it:

```
not ok 9 - B7 — Rule 4: every new module stays within budget
# tests 29  # pass 28  # fail 1
```

The fix was structural, not a trim: the RED records moved here, and the gate-health behaviour
tests moved to `gateHealth.test.mjs` beside the module they exercise. The cross-slice rule
that warned about this is worth quoting, because it was right:

> **Re-count every file you touched** when you split a file to satisfy Rule 4 — the split that
> fixed one violation created another in the design-brain workstream.
