# 02 — Architecture

## Shape: hub-and-spoke, not peer-to-peer

MCP is client→server ("USB-C for AI applications"). Harnesses never dial each
other; every seat is an MCP **client** of one local **server** that owns the
shared state. This is what makes "everyone sees the same thing at the same
time" structurally true instead of conventionally true.

```
 Claude Code ─┐                          ┌─ SQLite state (.ai-workflow/, gitignored)
 Codex ───────┤   MCP streamable HTTP    ├─ lane-file projection (.ai-workflow/coordination/)
 ZCode/Z-App ─┼─▶ 127.0.0.1:8377 ────────┼─ review-queue.md appends (house format)
 Kilo/OpenCode┤   (bearer per seat)      ├─ consult-*.mjs spawns (gated)
 DeepSeek Harness┘                       └─ metrics/log (rotated)
 Operator: node scripts/swan-coordination/status.mjs  ·  kill switch env
```

## Components & responsibilities

| Component | Path (new) | Responsibility |
|---|---|---|
| Server | `scripts/swan-coordination/server.mjs` | HTTP MCP endpoint, auth, tools, retention, kill switch |
| State store | `.ai-workflow/swan-coordination/state.db` | SQLite (node:sqlite, WAL); only writable state |
| Config | `.ai-workflow/swan-coordination/local.json` (gitignored) + tracked placeholder template | port, per-seat tokens; fail-closed until filled |
| Projection writer | `scripts/swan-coordination/projection.mjs` | lane-file rendering (R7) |
| Review bridge | `scripts/swan-coordination/reviews.mjs` | review-queue.md append (idempotent) + index (R5) |
| Consult bridge | `scripts/swan-coordination/ask.mjs` | wraps consult scripts + spend gates (R6) |
| Status CLI | `scripts/swan-coordination/status.mjs` | operator one-glance + force-release (R11) |
| Reaper | inside server | PID-probe + TTL sweep on demand (R3) |

## State ownership (single source of truth per fact)

| Fact | Authoritative | Projection/fallback |
|---|---|---|
| Seat presence, claims, activity, consult counters | SQLite (server) | lane projection (read-only consumer view) |
| Review requests/verdicts | `review-queue.md` (file of record, house format) | SQLite index (cache for queries) |
| Verdict authority | Fable chain (unchanged) | n/a — server only tracks |
| Tokens/port | gitignored `local.json` | tracked placeholder, fails closed |

## Transport decision (the gap that kills naive designs)

**Chosen: MCP streamable HTTP, `127.0.0.1:8377`, one shared process.**
Rejected: **stdio transport** — it spawns a fresh server per client, so each
harness would hold a *private* state store; "shared" coordination silently
becomes N isolated islands. HTTP keeps one live process → live locks, live
presence. Compatibility risk is bounded: seats without HTTP MCP client support
(D1/D2) use degraded file-lane mode; nothing blocks on them.

## Storage decision

`node:sqlite` (built-in on Node ≥22.5; baseline v24.19.0), WAL mode, single DB
file under `.ai-workflow/swan-coordination/` (gitignored). Zero new npm
dependencies. Rejected: JSON-file store (racy under concurrent HTTP writes
without hand-rolled locking SQLite gives us); better-sqlite3 (native dep,
violates the no-new-dependencies invariant). Known hazard: if the repo sits on
a sync/OneDrive path, WAL files can be sync-raced — mitigation: WAL + busy
timeout + start-up integrity check that fails loud with a repair hint (08/F9).

## Security posture (details & matrices in 03)

Loopback-only bind (hard fail otherwise). Per-seat bearer tokens minted by a
one-time `init` command into gitignored `local.json`; the server maps
token→agent identity, so a stray local process cannot impersonate a seat.
Provider keys never enter the server (consult scripts already load their own).
Fail-closed tracked placeholder config (continuity-config pattern). Payload
secret scan reuses `scripts/scan-secrets.sh` shapes as an importable check;
rejection happens before persistence. Every tool is T0–T2 (local read/write);
no tool performs external-visible or destructive actions (T3/T4 absent by
design); paid consults additionally require Rule 16 confirm + env.

## Integration points (exact)

- `scripts/lib/redact-egress.mjs` — imported by `ask.mjs`; the `z-ai/*`→
  OpenRouter refusal is the existing guard's, with its existing test suite
  guarding behavior (`redact-egress.subscription-seat.test.mjs`).
- `scripts/consult-{glm,grok,kimi,sol,muse}.mjs` — spawned as child processes
  with `--max-tokens 8000`; unchanged themselves.
- `.ai-workflow/coordination/*.md` — projection target (two server-owned files
  only: `swan-coordination.lane.md` projection + nothing else); existing lane
  files (`claude.lane.md`, `codex.lane.md`, `glm.lane.md`) stay hand/agent-owned.
- `.ai-workflow/coordination/review-queue.md` — append-only, house-format block
  (idempotency key), parse-on-read for `coord_get_reviews`.
- `scripts/fusion-triangle.mjs` / `lib/fusion-board.mjs` — untouched; remains
  the Codex-without-MCP path (D1 fallback).
- `scripts/coordination-prune.mjs` — untouched; server prune mirrors its
  retention conventions (30 days) internally.

## Tradeoffs accepted

- **Polling, not push**: agents see peer state at decision points and via
  tool calls; nothing interrupts a running turn (Phase 3 hook-digest slice is
  separate, optional, later).
- **Single process**: simplest correct shared state; a crash = degraded mode
  (R8), not data corruption (WAL + integrity check on start).
- **Projection staleness ≤ write lag**: file projection is best-effort for
  humans; the server is authoritative — conflicts resolve toward the DB.
- **v1 single-repo**: multi-repo/Pi seats explicitly out (non-goals, 01).

## Rejected alternatives (decision record in 08)

1. **Adopt Agent-MCP** — AGPL-3.0 network copyleft on Sean's proprietary
   workflow tooling, requires an OpenAI key for its memory/RAG, experimental,
   10-agent admin/worker model that mismatches the peer-seat fleet. Borrowed:
   file-lock, task-board, and messaging patterns only.
2. **Peer-to-peer mesh / A2A** — no native MCP peer channel; A2A targets
   cross-trust-domain agents (cloud); unwarranted complexity for one machine.
3. **Vector memory / RAG layer** — violates Rule 72 anti-RAG doctrine; the
   Catalog is the recall layer.
4. **Rewrite lane files as DB-only** — breaks Rule 67 consumers, Hermes
   bridge reads, and human debuggability. Files stay.
