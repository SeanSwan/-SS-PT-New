# Astra — Requirements

Requirement IDs are stable and referenced by `04-TESTS-TRACEABILITY.md`. Acceptance criteria are
measurable; anything not measurable is in §6 (unresolved) rather than dressed up as one.

---

## 1. Job, outcome, scope

**Job.** Sean wants to watch the Design Brain decide, and change his mind in front of it, without
knowing a shell command. Today the brain's reasoning is real but invisible: `compileImage` returns
`lawChecks`, `slots` and `facetsApplied` and **nothing renders them**; the only way to see options is
`forge bracket … --confirm-spend`, which bills before he has chosen anything.

**Outcome.** A local console where the loop `bracket → see options → pick → refine → record` is
visible and steerable, where every decision carries its reason, and where the parts of the brain that
are deliberately switched off say so instead of looking idle.

**In scope.**
- A read/write adapter over the Design Brain (`shared/swanPromptCompiler.mjs`, `scripts/forge.mjs`,
  `scripts/design-brain/config/*`).
- The three **legal dials** (§4).
- A loopback web surface.
- An MCP server exposing the same read surface to agents.
- A Tauri shell (last slice).

**Out of scope (non-goals).**
- **Not** a second taste writer. `swan-taste-brain`'s probe page remains the only writer of taste
  events. Astra may read `GET /api/profile`; it must never write `taste/events/*.jsonl` or
  `taste/*.md`. (`taste-discovery-grill.md` §2 law 2, §8.)
- **Not** a canon editor. New tokens/colours/spacing are a **proposal to Sean** plus a paired update
  to `SWAN-CINEMATIC-DESIGN-SYSTEM.md` §B. (`design-brain/README.md` §3 rule 4.)
- **Not** a replacement for `swan-design-router` (rule 40) — Astra loads what the router loads.
- **Not** a job queue, a provider transport, or a spend enforcer. Those are the session service's
  (`forge-compiler-contract.md` §0.4, §10).
- **Not** a second verify console. `scripts/swan-brain-console/` is the *verify* brain's console;
  Astra is the *design* brain's. Shared primitives are fine; shared data is not.
- **Not** a route to spec mode. `config/spec-mode.json` is `enabled:false` and Astra has no UI that
  changes it.

**Roles.** Sean (operator, sole decision-maker on canon and spend) · builder agent (codes the slices) ·
reviewer agent (hostile review per Rule 86) · the Design Brain (the subject, not a role).

---

## 2. Functional requirements

### R1 — Show the reasoning for any compile
Astra renders, for a chosen compile: the resolved 12 slots, `facetsApplied`, **every** `lawCheck` with
its `passed` flag and detail, `BRAIN_VERSION` read from code, `seed`, `provider`, `modelVersion`, and
each capability's tri-state (`verified` / `claimed` / `false`).

- **AC1.1** For a fixture compile, the surface shows 12 named slots, none blank-by-omission; a slot
  that is legitimately empty renders as *"(deliberately empty — pure phenomenon)"*, not as `—`.
- **AC1.2** Every `lawCheck` returned by the compiler appears, pass **and** fail. Count shown matches
  `lawChecks.length` exactly.
- **AC1.3** `BRAIN_VERSION` displayed equals the module's export at run time. A test asserts the UI
  string is not a literal by mutating the export and re-reading.

### R2 — Gate-0 directions at zero cost (implements the missing `directions()`)
Astra presents `n` text directions **without generating anything**, each with `name`, `sentence`,
`phenomenon`, `facets`, `paletteLaw`, and a `tier` badge of `EVIDENCE` or `PRIOR`.

- **AC2.1** Requesting directions performs **zero** provider calls and **zero** spend. Asserted by a
  spend guard that fails the test if any provider transport is invoked.
- **AC2.2** Each card shows its tier in caps. A `prior` direction never renders without the word
  `PRIOR` visible on the card.
- **AC2.3** The facet swatch strip is derived deterministically from `facets` — the same facets produce
  the same swatches across runs, with no image bytes fetched.
- **AC2.4** Directions never auto-generate previews. A preview requires an explicit action that first
  displays a cost estimate.

### R3 — Slot editing that never mutates the brief
Sean's verbatim text is immutable; refinements arrive as `slotOverrides`.

- **AC3.1** The brief text field is read-only after submit, or every edit creates a new revision.
  The persisted `text` for a given `briefId` is byte-identical to what Sean typed.
- **AC3.2** Editing a slot records an override keyed to that slot; the original brief remains
  retrievable and is displayed alongside.
- **AC3.3** `personify()` is the only way slot 4 (`styleAnchor`) is populated. A raw
  `"[subject] by [artist]"` form is refused with the reason shown.

### R4 — Real-time tuning, staged and reversible
Astra exposes the knobs in `scripts/design-brain/config/tuning.json` and lets Sean see their effect
before committing.

- **AC4.1** The knob editor reads the live file; it never hardcodes a default. A test mutates
  `tuning.json` and asserts the UI reflects it without a code change.
- **AC4.2** A change is **staged**, previewed against a fixed fixture set, and only then committed —
  three distinct states, visibly distinct.
- **AC4.3** Commit is **atomic** (temp file + rename). No reader can observe a half-written file.
- **AC4.4** Every commit writes a note and a prior-value record; a revert restores the previous
  bytes exactly (hash-compared).
- **AC4.5** The blast radius is displayed before commit: the surface names which engine behaviours the
  changed keys feed (novelty scoring, auto-merge gating).

### R5 — The honest state board
Astra lists every design-brain lane as **ACTIVE**, **REFUSED**, or **RETIRED** with the reason read
from the code, not from prose.

- **AC5.1** `synthesize`, `corroborate`, `adjudicate`, `emit-vault`, `log-receipt` appear as REFUSED
  with their stated reason. `attest`, `redact-provenance`, `log-spec` appear as RETIRED.
- **AC5.2** Spec mode shows `enabled:false` read from `config/spec-mode.json`.
- **AC5.3** A capability declared `claimed` renders as **not verified**, because the compiler treats
  `'claimed'` as `false`. A test asserts the board and the compiler agree on this.
- **AC5.4** The board has no control that enables a refused lane.

### R6 — One-keystroke `rejected_all`, and the cost ledger
- **AC6.1** Marking a compile `rejected_all` is a single action requiring no typed reason.
- **AC6.2** `estimatedCents` and `actualCents` are both shown; when they differ the drift is visible,
  not averaged away.
- **AC6.3** A rejected-all trend is viewable by slot and by facet.

> **NOTE (`A6`, `C50`) — `AC6.2`'s two field names do not exist in the shipped code.** The
> requirement is **left exactly as written**, deliberately: rewording a requirement to match the
> implementation is the wrong direction of fix. What is recorded here is the measurement. The
> contract `docs/ai-workflow/design-brain/forge-compiler-contract.md` §7 **specified**
> `estimatedCents` / `actualCents`; the implementation shipped **`costUsd`**. So `AC6.2` is
> satisfied **by conversion** — the Ledger renders cents derived from `costUsd`, asserts the
> derivation, and shows the drift per run with the mean beside it — and whether that satisfies the
> requirement *as written* is a **judgement, recorded as one**. Two further corrections from the
> same measurement: `outcome` is **not** a variant-store field either (Astra owns it, written by
> `core/session.mjs`'s `setOutcome()` against a COMPILE), and **`AC6.3`'s test id is `T-I-11`**, not
> `T-E-03` (`C54`). Full account: `A6-CORRECTIONS.md` §3.

### R7 — MCP server
- **AC7.1** The server exposes read tools and exactly one write tool (`reject`), and the write tool
  requires an explicit confirmation argument.
- **AC7.2** No tool returns image bytes or provider credentials.
- **AC7.3** `brain.capabilities` returns the same honest board as R5, from the same source.

### R8 — Local-only, and honest about it
- **AC8.1** The server binds `127.0.0.1` only. Binding any other address is refused at startup with a
  non-zero exit, and a test asserts the refusal.
- **AC8.2** Mutating endpoints require a token with `SameSite=Strict`; a request without it is 401.
- **AC8.3** No secret is read into the surface. Provider keys stay in the existing authority layer.

---

## 3. Invariants and forbidden side effects

| ID | Invariant | Forbidden side effect |
|---|---|---|
| **INV1** | The taste store has exactly one writer (the probe page) | Astra writing `taste/events/*.jsonl` or any `taste/*.md` |
| **INV2** | Canon is read, never written | Astra editing `design.md`, `SWAN-CINEMATIC-DESIGN-SYSTEM.md`, or any token value |
| **INV3** | The LAW filter is never skippable | Any UI affordance that compiles past a failed check, or strips silently |
| **INV4** | Generation costs money and is opt-in | Any auto-generation, any preview without a shown estimate, any call without `--confirm-spend`'s equivalent |
| **INV5** | `brainVersion` is pinned and displayed | A hardcoded version string in any surface |
| **INV6** | Sean's brief text is immutable | Any in-place rewrite of `text` |
| **INV7** | Fail-closed on unconfigured providers | Fabricating media, or showing a placeholder as if it were output |
| **INV8** | No fake metrics | Decorative numbers, invented counts, or a "score" with no derivation |
| **INV9** | Loopback only | Binding `0.0.0.0`, or exposing the surface on a LAN address |
| **INV10** | Nothing writes outside its lane | Astra writing into `scripts/swan-brain-console/` state, or into the taste repo |

**A failed LAW check blocks the compile.** Astra must show the block, name the offending slot, and
offer no override — because *"silent stripping teaches the operator nothing and hides taste failures"*
(`forge-compiler-contract.md` §5).

---

## 4. The dial / proposal split (the central decision)

Sean asked to "alter how it thinks in real time". The corpus has hard walls, so this packet splits the
request into two channels with different speeds and different authority.

**Three legal dials — instant, reversible, logged, Astra applies them:**

| Dial | Surface | Reversible by | Blast radius |
|---|---|---|---|
| `tuning.json` knobs | Tune pane | revert to prior bytes | novelty scoring, auto-merge gating |
| `slotOverrides` on a brief | Compose pane | discard the override set | one compile |
| brief fields: `seed`, `aspect`, `intent`, `surfaceClass` | Compose pane | re-issue | one compile |

**One proposal channel — slow, routed to Sean, Astra drafts but never applies:**

new tokens · canon changes · LAW changes · spec-mode activation · taste changes (→ the probe page).

**AC4.6** Every control in the surface is labelled `DIAL` or `PROPOSAL`. A test walks the control
inventory and fails on any control carrying neither label.

---

## 5. Assumptions

- **A1** `shared/swanPromptCompiler.mjs` is the authoritative prompt brain and stays importable.
- **A2** The variant store `scripts/forge.mjs` reads and writes is the same store Astra reads.
- **A3** `scripts/design-brain/config/*.json` are the authoritative tuning inputs and no other process
  writes them concurrently during a commit (mitigated by R4/AC4.3's atomic write).
- **A4** `swan-taste-brain` is not required to run Astra; its absence degrades the taste pane to
  "not connected" rather than failing the app.
- **A5** The console is single-operator on one machine. There is no multi-user model and none is built.

## 6. Unresolved decisions (carried, not silently defaulted)

| # | Decision | Owner | Default until decided |
|---|---|---|---|
| U1 | Is `directions()` implemented **inside** `swanPromptCompiler.mjs` or as an Astra-core module that calls it? The contract puts it on the compiler. | design-brain owner | Implement in the compiler, so the CLI and MCP get it too — one brain, not two |
| U2 | Does Astra's variant view read the CLI's store directly, or through a thin service? | builder + Sean | Read directly in A1; revisit if the store moves |
| U3 | Should `review-answer`'s `usable` / `onBrand` become the console's primary feedback, or is `rejected_all` enough for v1? | Sean | `rejected_all` in v1; `review-answer` surfaced in A6 if cheap |
| U4 | Tauri shell: same repo or a wrapper repo? | Sean | Same repo, `apps/astra-shell/`, last slice |
