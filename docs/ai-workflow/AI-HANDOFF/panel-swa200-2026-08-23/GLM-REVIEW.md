# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/SWA200-MIGRATION-RAILS-REVIEW-PACKET-2026-08-23.md
**Tokens:** 1361 in / 9769 out (reasoning: 8494) | total 11130
**Wall:** 167.9s

---

## Verdict: REVISE

**Strongest objection (your #1):** The advisory lock is coupled to the wrong lifetime. Lock lifetime = TCP session lifetime; the thing it protects = the migration's lifetime; the guard's intent = "until the child exits." These are three different clocks and the build assumes they're one. Concretely: the lock connection is **idle for the entire migration**, and idle sessions are exactly what gets reaped. If the lock rides sequelize's pool — the packet never says it doesn't — the pool's idle reaper (default ~10s) closes it minutes before a slow migration finishes. If `DATABASE_URL` transits Render's pgBouncer in transaction mode, session advisory locks are *unsupported* and the lock is void from second zero. If the guard's connection silently drops mid-migration, Postgres releases the lock, the orphaned migration keeps running, and the next deploy's guard acquires the lock cleanly and runs **concurrently** — the exact collision this build exists to prevent, with a green log line saying a lock was held. And the inverse: if the guard dies without a TCP RST (partition, NAT timeout), the backend holds the lock until keepalives fire — possibly hours — and every deploy halts on contention. "Session-scoped so it cannot leak" is true only in the failure modes that don't matter. Since no integration test exists, *nothing can ever detect any of this.* A control that logs "held" while guaranteed-vacuous is worse than no control; it will be cited in the postmortem as a safeguard that existed.

Not theatre overall — the child-process lock fix and the unbypassable shadow gate are real engineering. But two rails are theatre-*shaped*: the unproven lock, and a warn-only backup (your #2) that reports failure into a build log nobody reads while the risky operation proceeds. That's compliance, not safety.

## What fails silently first

**The shadow gate's green check on a data migration.** Mechanism: empty shadow DB → the migration's data-transform touches zero rows → applies cleanly twice → entry point imports → green. Merge. Deploy. The transform runs against real rows and silently rewrites them wrong — a bad `WHERE`, a mangled charset, an off-by-one batch. No error anywhere: `safe-migrate` sees success because the migration did what it was *told*, CI saw zero rows, the guard saw a clean backup. Production is wrong; detection is user reports. The green check is a multiplier, not a floor — it substitutes for reviewer scrutiny with a signal that certifies "syntactically applies to void."

Runners-up: the **fail-open guard** (a guard bug skips lock *and* backup, exits 0, and is indistinguishable from a working guard until the day you need the backup that was never taken) and the **lock evaporating mid-migration** (above).

## What next, ranked

1. **Prove the lock's session or replace it with a lease.** Dedicated `pg.Client` — never the sequelize pool — TCP keepalives on, and confirm the connection path has no pgBouncer. Better: add a `migration_lease` table (holder, heartbeat every N s, TTL). A row lease survives connection loss via heartbeat gap, dies with the holder via TTL, and releases explicitly — the correct lifetime coupling, plus an audit record of any overlap.
2. **Conditional enforcement (your #2), using the pending-set the guard already computes.** Pending = 0 → skip the backup, block nothing, zero new deploy risk. Pending > 0 → backup failure is fatal. This dissolves the warn-only dilemma: fatal exactly when it matters, never on routine deploys. Break-glass is the documented override plus a ledger entry.
3. **[Nobody is proposing] Restore-drill pipeline: your backups are your shadow dataset.** Scheduled job restores the *latest real backup* into an ephemeral Postgres — that restore *is* the restorability test — then runs pending migrations and sentinel reads against production-shaped rows. One mechanism closes three stated limits at once (empty shadow, never-restored backup, no real-data testing), it's the only lawful source of prod-shaped data under your no-local-DB doctrine, and it yields your real restore-time metric, which nobody has measured. Note and write down: backup RPO = deploy duration; a restore loses every write between backup and cutover.
4. **Seed the CI shadow with adversarial fixtures** — NULLs in every column, duplicate pairs, max-length/unicode/emoji strings, orphaned FK rows. Cheap subset of #3; closes the `NOT NULL`-on-populated and unique-index-over-duplicates classes (your #4) this week.
5. **Make fail-open visible (your #5-adjacent).** The guard writes a `migration_audit` row (SHA, lock id, backup checksum, mode) before the child runs; a scheduled job flags deploys with no matching row. Fail-open stops being indistinguishable from working.
6. **Post-migrate verification gate.** After migration, before the new instance takes traffic: run the app's N hottest queries and row-count invariants read-only against prod. Your own measurement — zero occurrences of `verify`/`smoke` — is *unchanged by this build*. Everything built asks "can we start"; nothing asks "is it right after."
7. **Move the ledger into the commit (your #5).** Escape use requires a `Bypassed: <gate> <reason>` trailer. Git history is the append-only store the bypasser can't quietly delete, and the forge surfaces it for free. Keep the local file as convenience only.
8. **Wire `render.yaml` last.** The one-line human change goes *after* 1–2, so what you install in production is proven rather than aspirational. Adopt expand/contract discipline while you're at it: no destructive DDL in the same deploy as the code that stops reading it — policy, zero tooling.
