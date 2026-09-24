# R5-08 cadence migration — the pre-migration measurement (superseded in place)

**Status:** SUPERSEDED by the migration itself. Preserved because one measurement here is not
repeated in `07-checkpoints.md`.

At the time this was written, the prose decision had **not** migrated the controller: a fresh
`status` still reported `cadence: final-fable` and `S83…S90` identifiers. The point being recorded
was that noting a decision is a **record**, not an **execution**.

`workflow-override-evidence.mjs:12–33` defines the cadences, and it says Astra was always the
default:

- `final-astra` — documented as *"the historical behavior, unchanged"*: `seat: 'astra'`,
  `provider: 'openai-codex'`, **`billing: 'subscription'`**, `effort: 'xhigh'`.
- `final-fable` — *"an explicit-request opt-in"*.

**Why that mattered:** the migration therefore **retires an opt-in** and restores the default,
rather than changing the cadence model. It also means the `final-astra` cadence bills the
**$0 subscription** leg this work has actually been using, not `paid-api`.

**Mechanism:** the migration is a C0 deliverable via
`node workflow.mjs migrate <state> <input.json>` (`--check` validates without writing). It
validates `taskId`, `sessionId`, `repoRoot`, `planFiles`, per-slice `files` scopes, `carriedCalls`
with hash-bound evidence, and a hash-bound `previousState`.

**Outcome:** the migration was subsequently performed through that supported mechanism — see
`07-checkpoints.md` §"R5-08 closure — the cadence migration is now performed".
