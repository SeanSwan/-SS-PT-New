# 03 — Contracts

All tools are MCP tools on the streamable-HTTP endpoint. Every request carries
the seat's bearer token (HTTP header `Authorization: Bearer <token>`); the
server maps token→agent identity — identity fields in payloads are validated
against it, never trusted from the client (R9/R10).

## Config contract

Tracked template `scripts/swan-coordination/config.template.json` (placeholder
values, fails closed) → real config at
`.ai-workflow/swan-coordination/local.json` (gitignored):

```json
{ "port": 8377, "protocol_version": "1.0",
  "seats": { "claude": {"token": "<32-hex>"}, "codex": {"token": "<32-hex>"},
             "glm": {"token": "<32-hex>"}, "grok": {"token": "<32-hex>"},
             "deepseek": {"token": "<32-hex>"}, "qwen-local": {"token": "<32-hex>"} } }
```

`node scripts/swan-coordination/init.mjs` mints tokens (`node:crypto`
randomBytes) into the local file. Missing/placeholder config ⇒ server refuses
start with a repair hint (fail-closed). `SWAN_COORD_DISABLED=1` ⇒ refuse start.

## Tool schemas (v1 — 12 tools)

Common result envelope: `{ ok: true, data: … }` or
`{ ok: false, error: { code, message, hint? } }`. Validation failures are
`ERR_VALIDATION` (field list in message). Unknown/extra fields rejected.

| Tool | Input (required in **bold**) | Result data | Errors | Tier |
|---|---|---|---|---|
| `coord_register` | **agent_id**, **model**, **harness**, **pid**, **worktree**; protocol_version | `{ seat, session_id, server_time, active_seats[] }` | `ERR_VERSION_MISMATCH`, `DENIED_TOKEN` | T2 |
| `coord_heartbeat` | — | `{ ok, active_count }` | `DENIED_TOKEN` | T0 |
| `coord_who_is_active` | `include_stale?` | `[ {agent_id, model, harness, pid, state: active\|stale, last_heartbeat, claims[]} ]` | — | T0 |
| `coord_claim_files` | **paths[]** (workspace-relative), **reason** (≤200 chars); `ttl_minutes?` (≤240) | `{ granted: [{path, expires_at}], denied: [{path, code, holder, holder_age_s}] }` | `ERR_VALIDATION`, `DENIED_TOKEN` | T2 |
| `coord_release_claims` | **paths[]** | `{ released[] }` | `DENIED_TOKEN` | T2 |
| `coord_post_activity` | **kind** (`started\|progress\|blocked\|done\|review\|note`), **note** (≤2048 B); `refs[]` (≤10 paths) | `{ id, created_at }` | `ERR_VALIDATION`, `DENIED_RATE` | T2 |
| `coord_get_activity` | `since?` (ISO), `limit?` (≤100, default 30) | `[ {id, agent_id, model, kind, note, refs, created_at} ]` | — | T0 |
| `coord_request_review` | **packet_path**, **scope**; `seats?` | `{ rr_key, queue_entry }` | `ERR_VALIDATION`, `DENIED_RATE` | T2 |
| `coord_get_reviews` | `status?` (`open\|resolved`) | `[ {rr_key, packet_path, scope, requested_by, status, verdicts[]} ]` | — | T0 |
| `coord_post_verdict` | **rr_key**, **verdict** (`APPROVE\|REVISE\|REJECT`), **findings[]** (≤20) | `{ status }` | `ERR_VALIDATION`, `DENIED_TOKEN` | T2 |
| `coord_ask` | **seat** (`glm\|grok\|deepseek\|sol\|kimi`), **document** (path), **remit**; `confirm_spend` (bool) | `{ status: ok\|refused\|error, output_path?, est_usd? }` | `DENIED_SPEND_GATE`, `DENIED_SEAT_BUSY`, `ERR_VALIDATION` | T2 + spend |
| `coord_status` | — | `{ server, uptime_s, seats, claims, counters, retention }` | — | T0 |

## Error codes

| Code | Meaning | Operator hint |
|---|---|---|
| `DENIED_LOCK_HELD` | path claimed by another live seat | see holder in payload; `coord_status` or force-release |
| `DENIED_RATE` | rate limit or >2 KB note | post less; trim note |
| `DENIED_TOKEN` | missing/unknown bearer token | run `init.mjs`; check seat config |
| `DENIED_DISABLED` | kill switch active (`SWAN_COORD_DISABLED=1`) | remove env to start |
| `DENIED_SPEND_GATE` | paid consult without Rule 16 confirm + env | set `confirm_spend:true` and `SWAN_ALLOW_PAID_CONSULT=1` |
| `DENIED_SEAT_BUSY` | consult seat already has one call in flight | wait; one in flight per seat (v3.1) |
| `ERR_VALIDATION` | schema violation | fix listed fields |
| `ERR_VERSION_MISMATCH` | protocol_version drift | update seat or server |
| `ERR_STATE_CORRUPT` | SQLite integrity check failed at start | restore from `.bak` written at last clean start |

## Data model (SQLite, WAL)

```
agents(id PK, agent_id, model, harness, pid, worktree, registered_at,
       last_heartbeat, state)            -- state: active|stale
claims(id PK, agent_id→agents, path_norm, reason, acquired_at, expires_at,
       status)                            -- granted|released|reaped|expired|force_released
activity(id PK, agent_id→agents, kind, note, refs_json, created_at)  -- 30-day retention
reviews(id PK, rr_key UNIQUE, packet_path, scope, requested_by, created_at, status)
verdicts(id PK, rr_key→reviews, agent_id, verdict, findings_json, created_at)
consults(id PK, seat, requested_by, document_sha8, confirm_spend, created_at,
         status, est_usd, out_tokens)     -- status: refused|ok|error
daily_counters(seat, day, ok_count, refused_count, PRIMARY KEY(seat, day))
audit(id PK, actor, action, detail_json, created_at)  -- force-release, reaps, refusals
meta(key PK, value)                       -- protocol_version, schema_version
```

`path_norm` = lowercase, forward slashes, workspace-relative, `..` rejected.
`expires_at` = acquired + TTL (default 30 min, renewable via claim on same
path by same agent). Consult hard budgets: DeepSeek counter cap default
$5.00/month-equivalent tracked per calendar month; `coord_ask` refuses at cap
with `DENIED_SPEND_GATE` (console cap remains the outer guard).

## review-queue.md append block (R5 — house format)

```markdown
## <title> — <YYYY-MM-DDTHH:MM:SSZ>

**Review requested:** <packet_path> · scope: <scope> · rr_key: <key>
Requested by <agent_id> (<model>) via Swan Coordination MCP.
**Status:** OPEN for independent hostile review; Fable remains final decider.
```

Idempotency: the append transaction searches for `rr_key: <key>` first; a
duplicate key performs no write and returns the existing entry.

## Lane projection (R7 — server-owned file only)

`.ai-workflow/coordination/swan-coordination.lane.md`, rendered in today's
lane-file shape: `**Status:**`, `### 🔒 CLAIMED NOW` list (`path — holder
(model, age)`), `### Activity (last 10)`, `**Updated:**`. Never contains
tokens; ports appear only in the ops doc, not projections.

## Permissions & trust boundaries

| Boundary | Control |
|---|---|
| Non-loopback access | bind check fails closed at start (R9) |
| Seat impersonation | per-seat token; identity derived server-side |
| Secret egress via payloads | scan before persist (fail-closed) |
| Paid spend | Rule 16 double gate (param + env) + daily/monthly counters |
| Provider-key exposure | server stores none; consult scripts keep their own env |
| Production SaaS | zero coupling — no frontend/backend/DB code paths |

Trust model: loopback + single-operator machine is the trusted envelope; the
token layer defends against *accidental* cross-seat acts and stray local
processes, not a determined local attacker with the config file — stated
plainly so nobody over-trusts it (08/F6).
