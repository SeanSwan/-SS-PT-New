# Swan Coordination MCP Server — build packet

Artifact: `SWAN-COORD-MCP-20260911` · Version 1.0 · Owner: Sean
Status: **PLAN READY** — planning/documentation only this session. No
implementation was performed or authorized. Build proceeds slice-by-slice only
on Sean's go, executed by a builder agent under the v3.1 roles (see §Builder
handoff). Scope authority: Sean's 2026-09-11 direction — "connect all these AI
harnesses via MCP so they actively see and talk to each other in real time…
one cohesive system instead of scattered pieces."

## What this system is

One local, loopback-only MCP **server** (the hub) that every AI coding harness
in Sean's fleet connects to as an MCP **client** (the spokes): Claude Code,
Codex, ZCode/Z-App (GLM), Kilo Code/OpenCode (SuperGrok), and the DeepSeek
Harness. Through it the seats share presence, file claims, an activity feed,
the hostile-review queue, and gated cross-model consults. It **unifies the
scattered coordination pieces this repo already runs** — Rule 67 lane files,
`review-queue.md`, `fusion-triangle.mjs`'s polling board, the `consult-*.mjs`
scripts, and the `redact-egress` subscription guards — into one state store
with two access paths: native MCP tools, and the existing file conventions as
a guaranteed fallback.

## Read this packet

| Artifact | Purpose |
|---|---|
| [01-requirements.md](01-requirements.md) | Actors, R1–R12 with acceptance criteria, invariants, non-goals |
| [02-architecture.md](02-architecture.md) | Components, transport/storage decisions, security posture, compatibility, rejected alternatives |
| [03-contracts.md](03-contracts.md) | Tool schemas, error codes, data model, projection format, permissions/trust matrix |
| [04-diagrams.md](04-diagrams.md) | Mermaid: context, claim state machine, conflict/recovery + spend-gate sequences |
| [05-wireframes-headless.md](05-wireframes-headless.md) | Headless DX wireframes (tool responses, status CLI, all states) |
| [06-test-plan.md](06-test-plan.md) | Test matrix T-R\*-\*\*, RED-first protocol, fixtures, traceability matrix |
| [07-slices-operations.md](07-slices-operations.md) | Slices S1–S7 with entry/exit evidence, rollout, rollback, budgets, ops runbook |
| [08-hostile-review.md](08-hostile-review.md) | Self-hostile findings F1–F12 with dispositions, decision log, unresolved items |
| [readiness.json](readiness.json) | Machine-checkable receipt (validated by `check-readiness.mjs`) |

## Verified baseline (2026-09-11, this session)

- Repo `SS-PT`, branch `wip/comms-notifications-2026-07-05`, HEAD `a89cbf0`.
  Working tree intentionally dirty with this session's routing-doc work
  (uncommitted; builder must stage explicit paths only).
- Node `v24.19.0` (→ built-in `node:sqlite` available; **zero new npm
  dependencies** is a packet invariant), Windows/win32, Git Bash.
- Canonical coordination surfaces, classified:
  - `CLAUDE.md` Rule 67 + `.ai-workflow/coordination/*` — **CANONICAL_CURRENT**
    (file-lane coordination; becomes the projection target, never deleted).
  - `scripts/fusion-triangle.mjs` + `scripts/lib/fusion-board.mjs` —
    **CANONICAL_CURRENT** (proven shared-folder polling pattern; keep as
    Codex-without-CLI fallback).
  - `scripts/consult-*.mjs` + `scripts/lib/redact-egress.mjs` —
    **CANONICAL_CURRENT** (consult transports; wrapped, not replaced).
  - `docs/ai-workflow/references/PANEL-AND-MODEL-ROUTING.md` —
    **CANONICAL_CURRENT** (formal panel; untouched).
  - `docs/ai-workflow/references/PROVIDER-SUBSCRIPTION-ROUTING.md` §
    "Harness interconnect via MCP — PLANNED" — **SUPERSEDED-BY-THIS-PACKET**
    for build detail; its guardrails carry forward verbatim.
- Existing test inventory for the touched area: `scripts/*.test.mjs` run under
  `node --test` (house convention, cf. `consult-glm.*.test.mjs`). Frontend/
  backend suites are out of scope for this dev-tooling slice.

## Gap analysis — what this packet adds beyond the chat-level plan

1. **Transport decision**: stdio MCP spawns one server *per client* (state
   forks per seat — the silent killer of "shared" coordination). Packet pins
   streamable HTTP on `127.0.0.1:8377`, one shared process (§02).
2. **Identity & anti-spoofing**: per-seat bearer tokens minted at config time;
   the server maps token→agent identity, so no local process can impersonate
   Codex to grab locks (§03).
3. **Dead-agent recovery**: probe-then-expire (PID liveness check before
   denial/TTL reap) + operator force-release, per the repo's own GOOD-IDEAS
   "probe stale locks, do not age-expire them" (§03, §06).
4. **Degraded mode as a first-class requirement**: server down ⇒ today's
   file-lane workflow, proven by an executed kill drill (R8, S6).
5. **Spend gates at the tool layer**: `coord_ask` enforces Rule 16
   (`confirm_spend` + env), the v3.1 8,000-token/600 s caps, one-call-in-flight
   per seat, and a DeepSeek counter as a second guard behind the console's $5
   cap (§03, §06).
6. **Behavioral RED rule**: import/setup errors are not RED proof; each slice
   ships a skeleton first so its tests fail on behavior (§06).
7. **Prior-art verdict**: Agent-MCP evaluated and **rejected as a dependency**
   (AGPL-3.0 network copyleft, OpenAI-embeddings dependency, experimental,
   admin/worker pattern mismatched with Sean's peer-seat fleet); its file-lock
   and task-board *patterns* are borrowed (§02).

## Builder handoff (v3.1 roles — non-negotiable)

- Builder: `gpt-5.6-luna` `xhigh`, or one user-selected, identity-verified
  subscription alternative. Architecture/adjudication/repair: `gpt-6-astra`
  `xhigh`.
- Per-slice and final-combined review route, in order, no reselection:
  `glm-5.3` → `glm-5.3-flash` → `gpt-6-astra`, via the existing guarded
  transports, `--max-tokens 8000`, separately.
- Caps: 3 review rounds/slice, 12 calls/task, one call in flight, 600 s/call,
  zero paid API. Missing/unavailable seats block with a concrete handoff.
- Everything in §01 Invariants is a no-go boundary; violating any halts the
  slice. Fable (or fallback chain) remains Final Decider for any commit.

## What this packet does NOT authorize

No implementation, no commits/pushes, no paid/provider calls, no production
SaaS changes (frontend/backend untouched), no dependency installs, no cleanup
of the file-lane system. Wireframes for a graphical UI are N/A (headless
server); headless DX wireframes are provided instead (§05).

## Preservation

All packet files are NEW; no canonical plan was overwritten. The one edited
canonical file (`PROVIDER-SUBSCRIPTION-ROUTING.md`) receives only a pointer
amendment; its prior full text is preserved in git history and quoted in
`08-hostile-review.md` §Preservation-notes. The repo's blueprint
vault (`scripts/hooks/vault-guard.mjs`) is a Claude-Code-surface hook and is
NOT active on the authoring surface (ZCode/GLM) — disclosed per skill rules;
git history is the preservation mechanism for this packet's own versions.
