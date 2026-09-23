# 07 — Implementation slices, rollout, operations

Review route for EVERY slice and the final combined state, in order, no
reselection: `glm-5.3` → `glm-5.3-flash` → `gpt-6-astra` (guarded transports,
`--max-tokens 8000`, separate calls). Caps: 3 rounds/slice, 12 calls/task,
one call in flight, 600 s/call, zero paid API. Unresolved review evidence
blocks slice advancement. Builder: Luna-class (or verified alternative);
Astra adjudicates.

## S1 — Server core + registry + security shell
Entry: this packet PLAN READY; branch clean of unrelated edits. Work: HTTP
streamable transport, config fail-closed + `init.mjs` token minting, kill
switch, SQLite (WAL) schema init + integrity check, `coord_register/
heartbeat/who_is_active/status`, provenance stamps. Tests: T-R1-01/02,
T-R9-01..03, T-R10-01, T-R12-01 (RED first — behavioral). Exit: green suite;
two simulated clients see each other; auth negatives proven; evidence links
in this packet (status: IMPLEMENTATION VERIFIED recorded per slice).

## S2 — Claims, reaper, projection
Entry: S1 exit. Work: claim/release/normalize, structured denial, PID-probe
reaper (real process), TTL backstop, operator force-release + audit, lane
projection writer. Tests: T-R2-01..03, T-R3-01..04, T-R7-01. Exit: race test
exactly-one-grant; dead-PID reap on a real killed child; golden projection.

## S3 — Activity feed
Entry: S2 exit. Work: post/get, budgets (2 KB), rate limit (30/min/seat),
secret-scan on payload, 30-day retention + prune. Tests: T-R4-01/02,
T-R9-04, T-R11-01. Exit: scan rejection proven; prune keeps audit rows.

## S4 — Review bridge
Entry: S3 exit. Work: request/get/verdict, review-queue.md idempotent house-
format append, SQLite index. Tests: T-R5-01..03. Exit: duplicate-key
idempotency; golden block matches house format.

## S5 — Cross-consult bridge
Entry: S4 exit. Work: `coord_ask` wrapping consult scripts, Rule 16 double
gate, one-in-flight, daily counters, DeepSeek cap counter, redact-egress
import. Tests: T-R6-01..05. Exit: all refusal paths proven with ZERO process
spawns; fake-consult happy path recorded.

## S6 — Seat wiring + drills + ops docs
Entry: S5 exit. Work: MCP client configs for the five seats (D1/D2 verify
tasks executed and recorded; fallbacks documented where unsupported), status
CLI finalize, `drills/degrade.mjs`, runbook README in
`scripts/swan-coordination/`, pointer updates (PROVIDER doc, ACTIVE-INDEX,
CLAUDE.md one-liner + mirror regen). Tests: T-R8-01/02, T-R11-02 + executed
drill receipts. Exit: degrade + kill-switch drills PASS with teed output;
docs pointers live.

## S7 — (optional, separately authorized) near-always-on awareness
Hook-injected peer digests at prompt/session start (prompt-watcher pattern)
for Claude Code first; other seats as supported. **Not authorized by this
packet** — Sean approves it as its own slice after v1 ships.

## Rollout / compatibility / migration

- Dev tooling only; production SaaS untouched (invariant 1, R12). No feature
  flags needed beyond the kill switch; adoption is per-seat config, one seat
  at a time, file lanes continue regardless (R8).
- Migration: none (new subsystem). DB schema versioned in `meta`;
  `schema_version` bump ⇒ start refuses with migration hint (no auto-migrate).

## Rollback / recovery

Stop server (`SWAN_COORD_DISABLED=1` or process kill) → seats auto-degrade to
file-lane rules → revert seat MCP configs → delete
`.ai-workflow/swan-coordination/` (regenerable state) → the system is fully
removed with zero production residue. Corrupt DB ⇒ server refuses start,
points at the last clean-start `.bak` (T-R8-01 covers restore).

## Logs, metrics, budgets

- Log: `.ai-workflow/swan-coordination/logs/server.log`, 5 MB rotation ×3.
- Metrics (via `coord_status`/CLI): active/stale seats, claims held, deny
  counts by code, consult ok/refused per seat per day, DeepSeek $-counter.
- Budgets: note ≤2,048 B; ≥30 posts/min/seat rejected; activity retained
  30 days; claim TTL 30 min default (≤240 max); consult ≤8,000 output tokens
  and ≤600 s (v3.1); p95 local tool latency <50 ms (loopback, measured in
  T-R2-01 run); DeepSeek soft cap $5.00/month tracked server-side.
- Operational owner: Sean (sole operator); runbook lives with the code.

## Definition of done (packet-level)

All slices' exit evidence linked; green suite `node --test
scripts/swan-coordination/` fully passing; drills executed with receipts;
V1/V2 verification recorded; docs pointers updated; readiness receipt moved to
`phase: implementation` with PASS statuses; combined-state review
glm-5.3 → glm-5.3-flash → gpt-6-astra recorded. Distinguish
PLAN READY (now) → IMPLEMENTATION VERIFIED (per slice) → shipped-in-tree
(never "deployed" — nothing deploys; this is local tooling).
