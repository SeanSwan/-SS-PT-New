---
originating_model: claude-opus-5
co_reviewers: none (no external or paid model consulted this session)
captured: 2026-08-13
surface: mission QA Playwright harness (production read-only audit)
boards: SWA-157 (permanent allowlists → suppressions registry) — related, not closed here
status: shipped (6975b3c13 on claude/qa-harness-slice0-20260811 — committed, not pushed)
models_used:
  - model: claude-opus-5
    role: builder + hostile reviewer + final decider
    did: ran the live production audit, classified findings, built the beacon registry, wrote the
      failing tests first, ran the dry-loop, verified the pre-existing failure against a clean tree
    cost: subscription (flat rate)
skills_touched:
  - id: rule-20 / rule-54 (sibling sweep)
    change: reinforced
    motivating_failure: I edited the first of five duplicated copies before running the sweep that
      found the other four. Sweep-then-edit, not edit-then-sweep, or the fix ships partial.
  - id: rule-56 (baseline disclosure)
    change: applied
    motivating_failure: whole-project tsc OOMs here, so "typecheck clean" had to be scoped and
      disclosed rather than claimed globally.
  - id: none created
    change: n/a
    motivating_failure: n/a — no new skill was warranted; the existing rules covered this, the
      failure was in applying them in the right order.
---

# Gates that cry wolf, and guards nobody runs

Durable lessons from running the live production Playwright audit and finding that the harness,
not the site, was wrong — and that a second guard had been failing unnoticed for months.
Privacy: IDs and roles only; no PII, no credentials.

---

## 1. A gate that fails on correct behaviour is a gate people stop reading

The production audit failed every non-authenticated check on
`POST /api/telemetry/funnel`. That endpoint is a public funnel beacon: fail-soft, always 204,
server-side event allowlist that silently drops client-claimed conversions, PII sanitizer,
`navigator.sendBeacon` so the UI never reads the response. It mutates no business record. The
site was behaving exactly as designed.

The harness's read-only write allowlist knew about exactly one beacon. A second beacon shipped.
Every run since has been red for a working feature — and **every real finding sat behind that
red**. The cost of a false positive in a gate is not the false positive; it is the true positives
nobody looks for anymore.

**Rule: when a gate fails, classify before fixing — is the SUT wrong, or is the gate stale?
Read the endpoint's actual semantics from source. The failure message names a symptom, never a
cause.**

---

## 2. The defect was duplication, not the missing entry

The tolerated endpoint was hardcoded in **five** places: the worklist filter, the report filter,
both live route guards, and a console-noise suppression. Adding the second beacon therefore
required five coordinated edits and received zero.

Fixing only the symptom (adding one string in five places) would have rebuilt the trap for the
third beacon. The fix is one registry, imported everywhere.

**Rule: N copies of a policy string do not drift *maybe*. They drift the first time the system
grows. When you find yourself adding an entry to a list, grep for other copies of that list
BEFORE editing the first one.** The same repo had already learned this — the worklist carries a
comment saying two sources of truth "is what this refactor exists to remove" — and then grew a
fifth copy anyway. Written lessons do not enforce themselves; only shared code does.

---

## 3. A guard test that has been red for months is proof nobody runs it

While verifying, the backend mission-QA guard test failed. It asserted the QA report generator
contained `residualRisks` and `blockedWrites` — internals of a read-nothing report facade that was
deleted in `d528fd25f`. Neither string has existed since. The test has been red ever since, and
nobody noticed: **the guard on the QA report was itself unguarded.**

Re-anchored to what the generator really emits (`## Coverage`, `## Ranked repair list`,
`## Suppressions`) plus the exit-code contract that is the actual CI gate. Intent unchanged.

**Rule: when a rewrite lands, the tests that assert on the OLD implementation's vocabulary must
be re-anchored in the same slice. A test asserting on internal strings is a tripwire pointed at
the implementation, not the behaviour — it survives refactors only by luck.** Classify every such
edit explicitly as RE-ANCHOR (pointing at the true surface) or SILENCE (deleting the check); a
pass count that includes assertions you just rewrote is not proof.

---

## 4. Suppressions are more dangerous stale than allowlists

Two of the five copies were *suppressions* — they silence console noise. A stale allowlist makes
the gate noisy (safe direction, annoying). A stale suppression makes the gate quiet (unsafe
direction, invisible). Both were registry-driven in the fix, but the suppression got the stricter
treatment: substring matching is permitted for console prose, and only in combination with a
transport-failure signature, with the reasoning written down at the function.

**Rule: when generalising a tolerance, ask which direction the error runs. Widening what you
IGNORE needs a stronger argument than widening what you REPORT.**

---

## 5. Type gates that do not run are not gates

Playwright transpiles specs with esbuild and never typechecks them. Whole-frontend
`tsc --noEmit` exhausts the V8 heap here even at 8 GB. Net effect: the entire mission QA
directory had **no type gate at all** — and it was concealing a real error. `installMissionUser`
inferred its parameter type from a *client* fixture, so every trainer or admin caller was a type
error that nothing would ever report.

A scoped `tsconfig.mission-check.json` made the directory checkable in seconds and immediately
surfaced it.

**Rule: "it compiles" is a claim about the code a compiler was actually pointed at. When the
project-wide check cannot run, the honest statement is "this directory has no type gate," not
"typecheck clean."**

---

## Who did what

- **claude-opus-5 (me)** — everything: ran the audit, classified the 12 failures into
  harness-stale (4) vs correctly-loud-missing-auth (8), read the beacon route and client lib to
  confirm the endpoint was benign, built the registry, wrote the failing tests before the fix,
  ran the hostile dry-loop that found copy #5 and the two adjacent defects, and proved the one
  unrelated failure was pre-existing by stashing and re-running against a clean tree.
- **No external model was consulted.** No Kimi, HY3, Gemini, Codex, or Village call. Nothing here
  is second-hand; every claim was executed.
- **Where I was wrong:** see the mistakes section — I misread the finding's class on first pass,
  edited before sweeping, ignored a known OOM gotcha I had in memory, and wasted ~25 minutes
  backgrounding runs this harness kills.

## Skills created or changed

None created. This session did not warrant a new skill: the governing rules (20/54 sibling sweep,
56 baseline disclosure, 73 proof-before-done) already covered every failure. What went wrong was
**ordering and application**, not absence of doctrine. Recording a new skill here would have been
cargo-cult — the honest correction is procedural and lives in the ledger below.

## Mistakes I made

- **Misclassified the finding on first read.** Seeing `POST /api/telemetry/funnel` in the blocked
  writes, my first framing was "production is doing an unexpected write." It was the harness that
  was stale. Caught before any edit by reading the route and the client lib. The correction:
  classify SUT-wrong vs gate-stale from source, before touching anything.
- **Edited before sweeping.** I changed `crawlWorklist.ts` first, then ran the sibling sweep that
  revealed five copies. Had I stopped after the first edit — which looked complete and made a test
  pass — the fix would have shipped partial. Sweep first.
- **Ran whole-project `tsc` twice (default heap, then 8 GB) before scoping it.** Both OOMed. The
  OOM was already a recorded repo gotcha in my own memory. ~5 minutes lost to not applying a
  lesson I was carrying.
- **Backgrounded long Playwright runs three times; all three died with zero-byte output.** The
  runner buffers through `spawnSync` and this harness kills long background tasks, so a killed run
  and a running run look identical (empty file). ~25 minutes lost. The fix is procedural: run
  bounded `--grep` slices in the foreground; never background the full contract suite here.
- **Was about to call an unrelated failure "pre-existing" from reasoning alone.** My change was
  type-only and provably could not cause a "Connecting to Server" failure — sound reasoning, still
  not evidence. Stashed and re-ran against a clean tree; it failed identically. Reasoning is a
  hypothesis; the clean-tree run is the proof.
- **Repeated from a prior session:** the OOM gotcha and the "verify the instrument before
  believing a negative" discipline were both already written down in memory, and I still had to
  re-learn them at cost this session. That repeat is the highest-signal line in this packet.

## Error → fix → repeat ledger

| Error class | Times this session | Previously written up? | What finally stopped it |
|---|---|---|---|
| Treating a gate failure as a SUT defect | 1 (caught pre-edit) | No | Read the endpoint source before classifying; the failure message is a symptom |
| Editing one copy before sweeping for siblings | 1 | **Yes — rules 20 and 54** | Procedural: run the sweep as the FIRST action after locating any policy string, not after the first edit |
| Running whole-project `tsc` despite known OOM | 2 (default heap, then 8 GB) | **Yes — in memory** | Scoped tsconfig; the durable fix is that the scoped config now exists in-repo so the next agent never repeats it |
| Backgrounding a long Playwright run in this harness | 3 | No | Bounded `--grep` slices in the foreground; zero-byte output is indistinguishable from progress |
| Asserting "pre-existing" without a clean-tree run | 0 (caught before claiming) | **Yes — rule 52 / proof-before-done** | Stash + re-run; the discipline held this time |

The two rows marked "previously written up" are the ones that matter. Both were documented, both
recurred anyway. In each case the written form was **resolutional** ("remember to sweep", "tsc
OOMs here") and the correction that actually holds is **procedural and in-repo**: the scoped
tsconfig is committed, so the OOM cannot recur for the next agent regardless of what it
remembers. The sweep lesson still has no such artifact — which predicts it will recur again.

## External-model calibration

No external or paid model was consulted this session, so there is nothing to calibrate. Recording
the absence deliberately: the audit, the classification, and the hostile dry-loop were all run
in-session. Paying a vendor to hostile-review this would have bought nothing that executing the
suite did not already prove.
