# Astra — A2 Landing Record: the MCP server

- **Date:** 2026-09-26 · **Author:** sable (WorkBuddy AI) · **Slice:** A2 (`05-SLICES-AND-REVIEW.md` §1)
- **Base:** `30134b1b6` (A1). **Supersedes, for the sections it names:** `04-TESTS-TRACEABILITY.md`
  T-I-08/T-I-09/T-P-02 and the A2 traceability rows, `02-BLUEPRINT.md` §7's "what to reuse" list.
- **Read this before coding A3 onward.** Astra now has a second consumer of the same brain, and the
  way it avoids becoming a second brain is a structural property, not a promise.

---

## 1. What A2 actually built

| Artifact | Lines | What it is |
|---|---|---|
| `scripts/astra/mcp/server.mjs` | 184 | stdio JSON-RPC 2.0 transport. `--list-tools` is the slice's exit criterion. |
| `scripts/astra/mcp/tools.mjs` | 261 | The 9-tool registry, the dispatcher, and the ONE guarded write. |
| `scripts/astra/core/worlds.mjs` | 122 | **NEW** — the World Engine catalogue READER. |
| `scripts/astra/core/worldRoulette.mjs` | 241 | **NEW** — the catalogue's own `world-roulette.v1`. |
| `scripts/astra/core/doctrine.mjs` | 162 | **NEW** — the bounded doctrine search behind `brain.doctrine`. |
| `scripts/astra/tests/a2-mcp.test.mjs` | 272 | T-I-08, T-I-09, T-P-02, and what the surface IS. |
| `scripts/astra/tests/a2-transport.test.mjs` | 140 | **NEW** — how it SPEAKS. Split for Rule 4. |
| `scripts/astra/evidence/a2-tests.txt` | 110 | The captured exit evidence. |

**Rule 4 budget (`T-F-04`), measured:** **0 of 15 modules over 300.** Largest is `a1-core.test.mjs` at
287, then `tools.mjs` at 261.

**Measured:** `node --test scripts/astra/tests/*.test.mjs` → **51 pass / 0 fail** (was 30). The
pre-existing `shared/` guard → **5 pass / 0 fail**. No regression.

---

## 2. The nine tools, and the two design decisions inside them

```
brain.directions(brief, n)        read   free          Gate 0, tier rule applied honestly
brain.compile(brief, caps)        read   free          returns lawChecks; blocked compiles still register
brain.explain(compileId)          read                 slots, facets, every lawCheck, seed, version
brain.capabilities()              read                 the honest board — SAME function the surface calls
brain.tuning.get()                read
brain.tuning.preview(patch)       read   NO write      returns wrote:false, plus unknownKeys
brain.worlds(seed, n, ...)        read                 the catalogue + a deterministic draw
brain.doctrine(query, limit)      read                 bounded corpus search
brain.reject(compileId, confirm)  WRITE  needs confirm THE ONLY WRITE
```

**Decision 1 — `TOOL_NAMES` is DERIVED from `TOOL_SPECS`, never a second list.** The other console's
header records the cost of the alternative: a prose count of the tools went stale when a tool moved in,
and its fix was to *delete the number* rather than maintain a second copy. Here the list **is** the
specs. The remaining drift risk — a spec with no handler — is caught by `verifyToolRegistry()`, which
`--list-tools` runs and exits non-zero on.

**Decision 2 — there is deliberately no `brain.tuning.commit`.** `brain.tuning.preview` computes what a
patch *would* do and returns `wrote: false`; committing is a dial on the console surface (A4), not an
MCP call. The preview exists so the absence is **a decision the operator can see**, not a gap. An
unreviewed tuning write can move the auto-corroboration gate — the one automated write to
canon-adjacent state — so it is the last thing that should be reachable from an agent.

---

## 3. Corrections to the packet

| # | Packet said | Code says | Action |
|---|---|---|---|
| **C12** | `03-INTERFACE.md` §4.4: the tool is `brain.doctrine(query)` — "corpus search" | the corpus is real (`docs/ai-workflow/design-brain/`, 54 files) but there was no Astra-side search module | Built `core/doctrine.mjs` **reusing the pattern, not the module**. `02` §7 says reuse `searchDoctrine.mjs` as a model and *not* share that console's data; importing it would couple two consoles the blueprint wants independent. |
| **C13** | `02` §7: reuse the MCP shape `mcp/server.mjs` + `mcp/tools.mjs` | true, but the shape needed a third module to hold Rule 4 | Kept the shape; the split is `tests/` into two files, not the surface into three. `tools.mjs` at 261 fits. |
| **C14** | §4.4 "any tool that changes canon or spec mode" is forbidden | a prose rule is not a mechanism | **`FORBIDDEN_NAMES`** — 21 names, checked at dispatch, so the refusal is a line of code with a name on it. `T-P-02` asserts every one is refused. |
| **C15** | §4.4: `brain.reject(compileId, confirm)` — "requires `confirm: true`" | correct, and the ordering is the whole point | The guard is **the first statement** in the handler; `T-I-08` asserts `outcome: 'pending'` afterwards, and a second test asserts the guard **precedes** the write in source order. |
| **C16** | `04` T-I-09: MCP board vs surface board "identical output from one source" | true by construction — both call `capabilities()` | Test asserts `deepEqual` against the live function, **plus** that the board is non-empty and mixed. A `deepEqual` of two empty arrays would pass a naive version. |
| **C17** | `worlds.md` is "18 DNA recipes" | 18 worlds in **5 families**, and the count is *declared in the file* | `readWorlds()` reports `matchesDeclared` and `unlabelledFields`. A parse that disagrees with the document is **the finding**, not a rounding error. |

---

## 4. Defects found and fixed during A2

Nine, and the pattern in the middle three is the one worth carrying forward: **the instrument was
wrong, not the thing it measured.**

| # | Defect | Class |
|---|---|---|
| **D6** | `worlds.md` is **CRLF**, and JavaScript's `.` does **not** match `\r`. With the `\n` already consumed by `split('\n')`, the trailing `\r` sits at end-of-string, so `(.+)$` could not match it and `$` could not match before it. **Every anchored pattern failed on every line**, and the symptom was a silent `0 families / 0 worlds` rather than an error. | A parser that fails to silence. Fixed at the read boundary with `split(/\r?\n/)`. The dash was a red herring — the earlier diagnosis blamed U+2014; the byte dump (`2014` in the codepoint list) exonerated it. |
| **D7** | The palette law was read at **line offset +2**; the document puts it at **+4** (heading, meta, DNA, audience, palette). So every world got `paletteLaw: 'unspecified'` and `lawA: false`, and the `swan-brand` licence filter **rejected all 18 worlds**. | **The worst shape in this slice.** A filter that could not read its input was indistinguishable from a filter that rejected everything. Fixed two ways: locate fields **by label**, and make an unreadable licence `null` (NOT EVALUATED) rather than `false` (failed). Measured after: **13 eligible / 5 rejected / 0 unreadable**. |
| **D8** | `searchDoctrine` threw **named** errors without setting `.code`, so `E_DOCTRINE_QUERY` reached the MCP surface as a generic `E_TOOL_FAILED`. A sweep found the same defect at **3 more sites** (`worldRoulette.mjs` ×3, `cli.mjs` ×1). | The name exists in prose and is lost to every caller that branches on it. All four fixed. |
| **D9** | `spawnSync(..., { input })` fails with **EBUSY** on this machine for **every** stdio configuration — measured with default stdio, `['pipe','pipe','pipe']`, and `['ignore','pipe','pipe']`. Only the no-`input` form succeeds. | **Third face of one Windows/libuv trap** (`a1-core.test.mjs` recorded the piped-but-unwritten form). Fixed by passing an **opened fd** as stdin, which behaves like a file. |
| **D10** | My T-I-09 test asserted on `lane.state`. The field is **`status`**. It collected twelve `undefined`s and reported an empty set. | Test asserted a guessed field name. Caught only because the test also asserted the set was **non-empty** — a bare `deepEqual` would have passed. |
| **D11** | My T-P-02 scan matched `/\.env\b/` and fired on `tools.mjs` — because `FORBIDDEN_NAMES` contains the literal `'brain.env'`, a **declaration** that we refuse the tool. | **The scan read a declaration as the thing declared.** Same class as round 32's coverage sweep and A1's D4. Fixed: assert on **access** (`process.env`, a `taste/` path literal, a dotenv import), not on the word. |
| **D12** | The same scan then fired on **its own file**, matching the regex literal inside its own assertion. | Third appearance of this class in this slice alone. Fixed by excluding `tests/` — the property is about the shipped surface. |
| **D13** | My T-A2-08 asserted `lines[1].id === 7` and measured **8**. Responses arrived `parse-error, ping(8), tools/call(7)`. | **JSON-RPC 2.0 guarantees a set, not a sequence** — `tools/call` is `await`ed while `ping` replies synchronously. The server was right; the test read order into a protocol that promises none. Fixed with `byId`. |
| **D14** | `a2-mcp.test.mjs` reached **350 lines** — over Rule 4. | Caught by the evidence capture, not by review. Split at the real seam: what the surface **IS** vs how it **SPEAKS**. |

**Two properties are now proven rather than promised:**

1. **The licence filter distinguishes three outcomes, not two.** `lawA: true` → eligible, `false` →
   rejected, `null` → held out **and named** in `licenceUnreadable`. D7 is why this matters: collapsing
   "unreadable" into "failed" is exactly how a parser bug becomes a plausible-looking verdict.
2. **The one write is guarded by ordering, not by a message.** `T-I-08` inspects the registry after a
   refused call and requires `outcome: 'pending'`, and a second test asserts the guard precedes
   `setOutcome(` in the stripped source. A guard that wrote first and complained afterwards passes the
   first test's naive form and fails both of these.

---

## 5. What is explicitly NOT done

- **A3–A8 are not started.** No HTTP surface, no panes, no Tune commit path, no Ledger, no Tauri shell.
- **`brain.reject` writes to the in-memory registry only.** The durable ledger is A6. This is honest
  rather than complete: `session.mjs` does not persist, so a `reject` does not survive a restart, and
  `E_COMPILE_UNKNOWN` says so in its message instead of guessing.
- **No `brain.accept`.** Accepting is a dial on the console surface. An agent that could both compile
  and accept would be spending and approving in one turn.
- **`brain.worlds` evaluates 2 of the spec's 5 eligibility stages.** Licence and recent-use diversity
  are implemented; audience/content fit and the capability ceiling have **no machine-readable predicate
  in the catalogue**, so they are reported `notEvaluated` rather than assumed to have passed. The
  receipt says so, and `T-A2-04` asserts it.
- **No Astra-scoped module smoke guard exists.** `backend/tests/node-runner/moduleSmoke.test.mjs` covers
  `shared/` only, so a new `scripts/astra/core/*.mjs` module is currently verified only by whichever
  test happens to import it. **Named as gap G3** rather than silently skipped — Astra now has 15
  modules and the repo's own orphaned-code lesson applies. Not built here because A3–A8 will add more
  modules and the guard is better written once, at the end.

---

## 6. Exit evidence

`scripts/astra/evidence/a2-tests.txt` — 110 lines: the `--list-tools` output (9 tools, exit 0), the
51-test suite result, every A2 test named with its verdict, the pre-existing guard at 5/5, the
per-module line budget with `modules over 300: 0`, and the measured catalogue facts
(`world-catalog.2026-07-12.v2`, 5 families / 18 worlds, `matchesDeclared: true`, `unlabelledFields: []`,
a replay-identical draw, and `swan-brand: eligible=13 rejected=5 unreadable=0`).

**A3 is unblocked** (entry: A2 exit met — `--list-tools` shows 9).
