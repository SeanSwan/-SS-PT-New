---
originating_model: claude-opus-5[1m]
tier_gate: PASS
date: 2026-07-25
topic: Four durable classes from the Swan Coach C2-remainder/C3/C4 batch — the silent success, the dormant artifact, deriving contracts from data that already exists, and proving work when no test runner installs
surfaces: [workout-logger-offline-queue, swan-coach-command-registry, backend-eval-harness, ai-workout-events]
---

> **Tier note.** `claude-opus-5` designated at/above Fable's level by Sean 2026-07-25 via Rule 68's own designation mechanism. Opus 4.8 and below remain blocked.

## What was decided/built (Fable-tier lesson)

Three slices shipped in one batch to `main` (`c60e5f851`): the offline-queue honesty fix, the voice confirmation contract, and the intent-resolution eval. 78 committed assertions executed. The classes below are what should change how the next slice is written.

---

### Class 1 — The silent success: a confirmation for something that did not happen

The offline queue's `writeQueue` swallowed its error and returned `void`. `queueSubmission` then set `pendingCount` from the **in-memory array it hoped to write** and toasted *"Workout saved offline. Will sync when connected."* unconditionally. With storage full or blocked — private browsing, a case the code's own comment anticipated — the workout was gone and the trainer was told it was safe.

Offline, mid-session, with a client waiting, that is the worst available failure shape: **silent data loss delivered with positive confirmation**. Nothing threw, nothing logged, no test failed.

- **Rule:** a persistence helper must report whether it persisted. Never `void`, never a swallowed catch that reads as success. And the caller must derive its state from **what is on disk**, never from the array it intended to write — that mismatch is the bug.
- **Absence of a throw is not evidence of persistence.** A storage backend that silently no-ops (quota-capped, sandboxed, extension-shimmed) throws nothing at all. **Verify by reading back.** This is now a test, and it is the case a naive `try/catch` fix would still miss.
- **Detection heuristic:** grep for `catch {}` and `catch { /* ... */ }` adjacent to any user-visible success message. The distance between a swallowed error and a confident toast is where this class lives.
- **Generalizes to:** anything reporting success from an unverified side effect — cache writes, analytics beacons, background sync, file saves, "copied to clipboard".

### Class 2 — The dormant artifact: correct code nobody calls

This batch adopted `eval/coachCommandCenterGoldenScenarios.mjs` — written weeks earlier with exactly the right shape (`expectedIntent`, `expectedClientRef`), **never imported by anything**, flagged as an open item in a hygiene inventory, and still unwired 8 days later. All four of its cases passed against the live classifier on first run. It was correct the entire time. It was simply disconnected.

Then, in round 4 of the hostile sweep on this very batch, **I found I had shipped one myself**: the new `voiceConfirmationTier.mjs` had zero consumers — the exact shape I had spent the program flagging in other people's code.

- **Rule:** **a dormant file that says so is a plan; one that doesn't is rot.** If a module ships without a consumer, the header must state that it is deliberately unconsumed, why wiring it now would be wrong, and which slice consumes it — and it must be tracked externally, because a comment alone has already failed once.
- **Legitimate dormancy exists.** The tier contract genuinely could not be wired: gating commands behind a spoken confirmation that no surface can yet collect would *break* the command lane, not protect it. A contract must exist before its consumers so each surface consumes one rule instead of inventing its own. The sin is silence, not the dormancy.
- **Detection heuristic:** for every module added in a slice, grep for importers excluding tests and itself. Zero importers is either a bug or a decision — never let it be neither.

### Class 3 — Derive the contract from the data that already exists

The voice confirmation tiers were not declared per command across **134 commands in 19 registries**. They are **derived** from fields `CommandDefinition` already carried: `destructive`, `requiresConfirmation`, `roleRequired`, `requiresClientRef`. A new command inherits correct voice behaviour without its author thinking about voice at all.

> **A live instance of this very lesson, found while fact-checking this packet.** `commandRegistry/index.mjs` carries a hand-maintained docblock whose category counts (A–N) sum to **119**. The real count of command definitions is **134**. The declared number drifted 15 commands behind reality, nobody noticed, and *I cited the stale 119 in two earlier commit messages before verifying*. Hand-maintained counts in comments are the cheapest possible example of the class — and they mislead precisely the readers who trust the codebase most.

The same instinct produced the C2 event log: the dispatch seam already returned whether an effector handled the event, and every caller discarded it. Recording it cost 9 lines and touched no handler.

- **Rule:** before adding a field, a flag, or a registry, ask what existing data already implies the answer. Declared metadata drifts from reality the moment someone adds a command and forgets the new field; derived metadata cannot.
- **The one invariant that makes derivation safe: escalate-only.** When several rules apply, the strictest wins, and later rules can never soften an earlier one. Numeric read-back is evaluated *after* the destructive triggers precisely so a destructive command can never be downgraded to silent. Test both orderings — that property is the whole safety argument.
- **Guard against over-escalation too.** Client ids arrive as strings from some transports; treating `42` and `'42'` as different clients would fire a cross-client confirmation on every action and train the user to confirm reflexively, destroying the value of the strict tier. **A confirmation that always fires is equivalent to no confirmation.**

### Class 4 — Prove the work when no test runner will install

`backend/` and `frontend/node_modules` are both empty in every local tree; neither runner installs. Rather than deferring verification, three techniques recovered genuine execution of **78 committed assertions**:

1. **Local runner shim** — a minimal `describe`/`it`/`expect` module dropped into gitignored `node_modules/vitest`, so the **real committed test files execute in place**. Copying tests to a scratch directory does *not* work: relative imports break.
2. **`node --experimental-strip-types`** — executes TypeScript modules directly, no build step.
3. **Staged specifier rewrite** — add explicit `.ts` extensions for raw Node ESM when the repo's bundler convention is extensionless. Rewrite in a staged copy; never bend shipped source to fit the harness.

- **The line that must not be crossed:** stub to satisfy an *import*, never to fake a *behaviour*. A `zod` stub was tried to load the eval graph, observed to make the real validators return garbage rather than fail cleanly, and **removed** — a greener number bought with a fake validator is worse than an honest gap.
- **Corollary:** extract the logic that matters into small pure modules. Both the coverage block and the queue persistence were extracted *because* their hosts (2267 and 193 lines, one a React hook) could not be exercised. **Extraction is often the cheapest path to provability**, not merely to tidiness.

---

## Meta-observation worth carrying

**Seven planned "build this" items in this program turned out to already exist** — the Coach backend, a CI-wired eval harness, its golden-scenario seed, the event bus, the typed-intent schema, the entire 21-source enrichment layer, and the offline queue.

Seven out of seven. That is no longer a series of surprises; it is a property of this codebase. **Trace before building is not caution here — it is the correct default**, and a plan's confidence about what is missing carries approximately no evidential weight.

## Standing gap, now disclosed on two consecutive ships

No release/commit marker exists. `/health` returns `{status, timestamp, server, checks, message}`; no `RENDER_GIT_COMMIT` appears anywhere in routes, server, or core. Every backend deploy is confirmable as **up and not crash-looping**, and never as **running the pushed commit**. One `/health` field would convert deploy verification from inferential to real and retire a recurring disclosure permanently.

## Provenance & privacy

`originating_model: claude-opus-5[1m]`, designated Fable-tier by Sean 2026-07-25. Sanitizer PASS — IDs and roles only, no client names, no PII, no credentials, no absolute paths. All client references are synthetic ids.
