# 01 — Requirements

## User / job / outcome

**User:** Sean, operator of a six-seat AI fleet (Codex/Astra, Claude,
GLM via ZCode/Z-App, SuperGrok via Kilo/OpenCode, DeepSeek Flash via capped
API, local Qwen on the 5090) working one shared repository in parallel.
**Job:** let every harness see and talk to every other harness — presence,
file claims, activity, reviews, gated cross-model consults — in near-real
time, through the tool they already speak (MCP), with the current file-based
conventions as a fallback rather than a casualty.
**Outcome:** one cohesive coordination system; fewer collisions; hostile
reviews requested and tracked in one place; no seat invisible to the others.

## Roles

| Role | Instance | Access |
|---|---|---|
| Seat (MCP client) | Claude Code, Codex, ZCode/Z-App, Kilo/OpenCode, DeepSeek Harness | full tool set subject to gates |
| Operator (human) | Sean | status CLI, force-release, kill switch, config |
| Future reader | Hermes/Pi (read-only) | **out of scope v1** (non-goal) |
| Final authority | Fable chain | unchanged; server never grants commit authority |

## Requirements (acceptance = measurable, test-linked IDs in 06)

- **R1 Shared presence.** A seat registers (identity, model, harness, pid,
  worktree) and any other seat can list active seats. *Acceptance:* two
  simulated clients on one server each observe the other in `coord_who_is_active`
  output within 2 s of registration; stale seats (no heartbeat > 5 min) are
  reported as `stale`, not `active`.
- **R2 File claims / locks.** A seat claims paths before editing; a conflicting
  claim is denied with a structured reason naming holder, age, and hint.
  *Acceptance:* N parallel claim calls on the same path yield exactly one
  `granted`, the rest `DENIED_LOCK_HELD` with holder identity; claims on
  distinct paths never conflict (path normalization incl. Windows
  case-insensitivity and separator variance).
- **R3 Dead-agent recovery.** A claim whose holder process is dead is reaped by
  probe, not by blind age expiry; TTL (default 30 min, renewable) is only a
  backstop; the operator can force-release with an audit entry.
  *Acceptance:* with a live holder PID, denial persists past any probe; with a
  real killed child process, the next conflicting claim reaps and grants;
  force-release writes an audit row and appears in activity.
- **R4 Activity feed.** Seats post bounded notes (`kind`, `note`, `refs`) and
  read others' activity since a timestamp. *Acceptance:* `coord_get_activity`
  returns cross-seat entries in order; notes > 2,048 bytes are rejected
  `DENIED_RATE`/`ERR_VALIDATION`; > 30 posts/min/seat rate-limited.
- **R5 Hostile-review integration.** A seat requests a review (packet path +
  scope), any seat lists open reviews, seats post verdicts
  (APPROVE/REVISE/REJECT + findings). *Acceptance:* `coord_request_review`
  appends a block to `review-queue.md` in the house format under an
  idempotency key (`rr_key`); a duplicate request with the same key makes no
  second append; verdicts update status and are visible via `coord_get_reviews`.
- **R6 Gated cross-model consults.** `coord_ask` wraps the existing
  `consult-*.mjs` scripts for seats glm/grok/deepseek/sol/kimi.
  *Acceptance:* paid consult without `confirm_spend:true` → `DENIED_SPEND_GATE`;
  with confirm but `SWAN_ALLOW_PAID_CONSULT` unset → refused, no process
  spawned; with both → script spawned with `--max-tokens 8000`, one call in
  flight per seat (second concurrent → `DENIED_SEAT_BUSY`); a `z-ai/*` model
  addressed to OpenRouter is refused by the existing `redact-egress` guard
  (reused, not reimplemented); DeepSeek counter refuses at the packet budget.
- **R7 File projection (compatibility).** The server projects presence/claims
  into `.ai-workflow/coordination/` lane files in today's format so file-based
  consumers (and humans) keep working. *Acceptance:* after registration and
  claims, the projection file parses in the current lane-file shape (golden
  test); projection never contains tokens, ports are allowed, paths are
  workspace-relative.
- **R8 Degraded mode.** The server is an enhancement, not a dependency.
  *Acceptance:* executed drill — kill the server mid-task; agents continue
  with file-lane conventions; restart resumes state from SQLite with no lost
  claim/audit rows (WAL); `SWAN_COORD_DISABLED=1` makes the server refuse to
  start (kill switch) and tools report `DENIED_DISABLED`.
- **R9 Security posture.** Loopback-only bind; per-seat bearer tokens minted at
  config time into a gitignored local file (tracked placeholder fails closed);
  server holds no provider keys; payloads secret-scanned; every tool labeled
  with its T-tier (all are T0–T2; nothing T3/T4 exists in v1).
  *Acceptance:* non-loopback bind attempt fails closed; unauthenticated request →
  `DENIED_TOKEN`; token file placeholder → refuse start with repair hint;
  secret-shaped payload → `DENIED_RATE` scan rejection, nothing persisted.
- **R10 Identity/provenance.** Every record (activity, claim, verdict, consult)
  carries `agent_id`, model, harness. *Acceptance:* DB rows and projections
  round-trip identity; missing identity fields → `ERR_VALIDATION`.
- **R11 Operations.** Status CLI (`node scripts/swan-coordination/status.mjs`),
  health tool, metrics (active seats, claims held, consult counters, rejects),
  30-day activity retention with prune mirroring `coordination-prune.mjs`
  conventions, rotated server log.
  *Acceptance:* CLI renders one-glance state (see 05); prune test drops >30-day
  activity and keeps audit-class rows; log rotates at 5 MB.
- **R12 Portability & zero production coupling.** Config-driven worktree root
  and port; dev-tooling only — the production SaaS (frontend/backend/DB) is
  untouched. *Acceptance:* repo grep proves zero writes outside
  `scripts/swan-coordination/`, `.ai-workflow/swan-coordination/`, and the
  coordination projection dir; server runs against a temp fixture worktree.

## Business rules & invariants (no-go boundaries)

1. **No new npm dependencies** — Node stdlib only (`node:http`, `node:sqlite`,
   `node:crypto`, `node:child_process`).
2. Never write outside `scripts/swan-coordination/`,
   `.ai-workflow/swan-coordination/` (gitignored state), and
   `.ai-workflow/coordination/` (projection/review-queue append).
3. Never touch `frontend/`, `backend/`, the production DB, or any secret;
   never `git` anything; never auto-retry a failed paid consult.
4. `review-queue.md` is append-only in house format; lane files are never
   deleted by the server (projection rewrites only its own two files).
5. The server never grants commit/merge authority; Fable-chain verdict flow
   is unchanged (R5 tracks, does not gate).
6. Tokens/ports live only in gitignored local config; a tracked placeholder
   template fails closed until filled (continuity-config pattern).
7. Zero PII in payloads (Rule 8); payload secret scan is fail-closed.

## Assumptions

- Harnesses' MCP client support: Claude Code (native), Codex/ZCode/OpenCode/
  Kilo (expected; **V1/V2 verify tasks** in 08) — fallback is degraded mode.
- Single-user, single-machine, one repo at a time (v1); loopback traffic is
  trusted only because a per-seat token gates every call.
- English-only operator surfaces; Sean is the sole operator.

## Unresolved decisions (blockers: none for planning; must close before ship)

- **D1** (builder verify, V1): does Codex CLI's MCP client accept streamable
  HTTP in current build? If no → Codex joins via file lanes + fusion board
  (documented degraded path), server unaffected.
- **D2** (builder verify, V2): Z-App's MCP client configuration surface —
  name/location of its MCP config; same fallback.
- **D3** (Sean at config time): port (default **8377**) and seat-token
  distribution; change is one config file.
- **D4** (Sean, post-v1): whether Hermes/Pi gets a read-only seat (excluded v1).
