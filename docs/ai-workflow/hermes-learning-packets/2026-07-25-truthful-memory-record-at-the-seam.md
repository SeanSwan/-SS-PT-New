---
originating_model: claude-opus-5[1m]
tier_gate: PASS
date: 2026-07-25
topic: Building a truthful cross-surface memory — record at the existing seam, project rather than narrate, and never conflate two different falses
surfaces: [swan-coach-command-lane, ai-workout-events, workout-logger, admin-workout-planner, bootcamp-builder, pain-chart]
---

> **Tier note.** `claude-opus-5` designated at/above Fable's level by Sean 2026-07-25 via Rule 68's own designation mechanism.

## What was decided/built (Fable-tier lesson)

Swan Coach's C2 slice: give the assistant a memory that survives moving between four surfaces **without letting it lie**. The design lesson is not the data structure — it is *where* the instrumentation went and *what the memory is allowed to claim*.

---

### Lesson 1 — The truth signal usually already exists and is being discarded

The plan called for building an event-sourced command bus. A bus already existed: `aiWorkoutEvents.ts` (193 lines) dispatches four `AI_*` families through **one** function, `dispatchWithAcknowledgement`, which already returned whether a mounted effector handled the event.

**Every caller threw that boolean away.** Recording it at that single seam produced the event log with **9 added lines** in the vocabulary file and **zero changes to any of the four families or any handler**.

- **Rule:** before building an instrumentation layer, find the narrowest existing chokepoint every action already passes through. Systems that route through one function are far more common than they look, and one wrapper there beats N call-site edits.
- **Detection heuristic:** grep for a shared dispatch/apply/commit helper and count its callers. If the count is high and its **return value is widely ignored**, that return value is usually the truth you need.

### Lesson 2 — One boolean can be two different facts

`dispatchWithAcknowledgement` returned `handled: false` for two materially different situations:

- **no effector was mounted** — nobody was listening
- **an effector acked `false`** — it looked and deliberately changed nothing (real instance: a handler acks `next !== prev`)

*"Nobody heard you"* and *"it was considered and changed nothing"* are different facts about the world. A memory that records both as "didn't apply" is less wrong than one recording them as applied — but still lossy, and the loss is exactly where a retry decision goes wrong.

- **Fix shape:** track whether the acknowledge callback was **invoked at all**, separately from the **value** it carried. Two booleans, three outcomes: `unhandled` / `noop` / `applied`. The public contract stayed byte-identical; only the recorded detail got richer.
- **Generalizes:** any callback-ack protocol collapsing "not called" and "called with false" into one value is hiding a distinction. Look for it in webhook handlers, middleware chains, and plugin/hook systems.

### Lesson 3 — Memory is a projection, never a transcript

The failure being designed against: Coach proposes an edit in one surface, the trainer moves to another, the edit silently failed (validation, permission, unmounted effector). A conversation-shaped memory now holds a belief the database contradicts, and **every later proposal compounds it**. A confident continuous lie is worse than amnesia — amnesia at least fails visibly.

The projection therefore separates and never blurs:

```
believed   = applied ONLY            → safe to state as fact
pending    = unsettled               → state as intent, never as outcome
failed     = unhandled | failed      → must be surfaced, never hidden
noop / superseded                    → settled and harmless; in NEITHER bucket
```

- **Rule:** derive memory from an append-only log of outcomes; never let the assistant's own narration become the record. Only one outcome may be asserted as fact.
- **Subtlety worth keeping:** `noop` and `superseded` belong in neither bucket. Reporting them as failures manufactures false alarm; reporting them as applied is a lie. Most state machines get this wrong by having only success/failure.
- **Append-only is load-bearing.** Terminal outcomes are immutable — a failed intent stays in the record. Mutating history is how a memory starts lying.
- **Bound it.** A memory that grows forever is its own outage; the log is a ring buffer.

### Lesson 4 — Client scoping is a safety boundary, not a filter

Intents recorded with a **null** client are never folded into any client's memory — they surface in a separate `unattributed` bucket. This is the C0.5 lesson (a live wrong-client write path in production) expressed one layer up: an unattributed intent is the *shape* a wrong-client write takes, so absorbing it silently into whoever happens to be selected recreates the bug in the memory layer.

- **Rule:** when a record's subject is unknown, surface it as unknown. Do not default it to the current context. Defaulting is what turns a missing attribution into a wrong attribution.

### Lesson 5 — Empty must say "I don't know", not "nothing happened"

Empty memory reports: *"No confirmed actions on record — this means nothing is known, not that nothing happened."* Voice-origination rate returns **null** with no data rather than `0`, because `0` reads as *measured zero usage*.

This is the same absence-vs-emptiness distinction that had to be fixed one slice earlier in the intake layer, arriving independently in the memory layer. **When the same distinction shows up twice in two layers, it is a system-level principle, not a local fix** — worth encoding once and applying everywhere a consumer reads derived state.

### Lesson 6 — Scope discipline under an unprovable environment

The slice as planned bundled five things: bus, memory, offline queue, client-lock re-anchor UX, and a large file decomposition. **Three were deferred with stated reasons** (offline needs persistence/sync design; re-anchor needs a UI design contract; decomposition folds into a slice that actually touches the file).

The deciding factor was verification capacity: with no installable test runner, the honest move was to build the part that could be **executed and proven pure** and defer the parts that could not. Building all five would have shipped four unverified changes behind one verified one.

- **Rule:** let provable surface area set slice size when the environment limits verification. "It's all one mechanism" is an argument for *coherent design*, not for *one commit*.

---

## Technique worth reusing

`node --experimental-strip-types` executes TypeScript modules directly with no build step. Where a frontend test runner cannot be installed, this converts "CI-deferred, not claimed" into genuine execution of the shipped source. Pair it with a stubbed `window`/`CustomEvent` to prove **integration at the seam**, not just unit behavior — that seam test is what confirmed the public contract was unchanged while the recorded detail got richer.

Caveat: raw Node ESM needs explicit file extensions, while the repo's Vite convention is extensionless. Rewrite the specifier in a staged copy rather than changing the shipped source to fit the harness.

## Provenance & privacy

`originating_model: claude-opus-5[1m]`, designated Fable-tier by Sean 2026-07-25. Sanitizer PASS — IDs and roles only, no client names, no PII, no credentials, no absolute paths. All client references are synthetic test ids.
