# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWA200-MIGRATION-RAILS-REVIEW-PACKET-2026-08-23.md
**Seed:** (none)
**Tokens:** 1630 in / 10238 out · **Cost:** ~$0.0645 · **Wall:** 247.9s · **finish:** stop

---

**REVISE.** Strongest objection: the only hard control is a session lock held on the *wrong* connection, and everything that would actually stop or reverse a bad production migrate is unplugged, warn-only, or looking at an empty database.

You still migrate production as a side effect of building `main`. The rails sit next to that fact and do not change it.

---

## What fails silently first

A destructive Sequelize migration — `removeColumn`, `dropTable`, `changeColumn` (often drop+recreate), or any `DELETE`/`UPDATE` data migration — goes green on the empty shadow DB, twice, idempotently. The badge is named like a real check. Someone merges. `render.yaml` still runs `safe-migrate.mjs` unsupervised. Production data is gone. `SequelizeMeta` says success. App boots. The guard did not run (not wired) or ran warn-only and wrote a backup that was never restore-tested and may not have left the build container.

Nobody is paged. The next deploy is also green. You notice when a customer query looks for a column that CI never saw a row in.

That is not a hypothetical later. It is the only new gate that is actually on.

---

## What next, ranked

1. **Put the lock on the session that issues DDL.** Same process, direct (non-pooled) URL, keepalive, abort the migrate if that session dies. Kill the parent-holds-lock / child-migrates design.
2. **Stop migrating inside the Render build.** Build an artifact. Apply schema as a gated release step with a recorded restore point. Push-to-main → production DDL is the hazard; wrapping it accepts it.
3. **Make backup failure fatal only after the backup is durable and restore-probed.** `pg_restore --list` against remote storage, or a sidecar restore, every time. If it cannot survive the build container, delete the backup step — it is a lie.
4. **Shadow against a production-shaped fixture, not empty `postgres:16`.** At minimum a committed `pg_dump --schema-only` plus a small anonymized data slice. Statically fail `removeColumn` / `dropTable` / destructive `changeColumn` / raw `DELETE` unless labeled.
5. **Post-apply verify.** Diff `information_schema` + `SequelizeMeta` against an expected snapshot. You still have zero `verify`. Pre-flight without a post-condition is how Meta lies.
6. **One thing nobody is proposing:** kill the doctrine that `DATABASE_URL` points at production and therefore no real migration can be tested. That constraint is the parent of every fake gate in this packet. Stand up a staging clone. Until you do, you will keep manufacturing rails you are not allowed to prove.

---

## The six questions

**1. The lock.**  
“Session-scoped so it cannot leak” answers the failure mode you are afraid of (bricked deploys) and not the one the lock exists to prevent (two migrates at once).

Parent holds `pg_try_advisory_lock` on connection A. Child runs DDL on connection B. Cancel, OOM, idle timeout, pooler recycle, or a dropped TCP session ends A. The lock is gone. B may still be running. Render routinely starts the next build before the previous one is fully dead. The second guard acquires the lock and migrates in parallel.

If that lock is taken through Sequelize’s pool, or through Render’s pooler, it is weaker still: session locks on pooled connections release at return, at transaction end, or on a client you no longer own. You did not state a raw `pg.Client`, `pgbouncer` bypass, or keepalive.

Session scope means the lock *cannot* outlive the babysitter. A parent/child split needs the opposite property. You fixed “lock released before migrate starts” by holding it in a process that is still not the migrator. Same class of bug, longer window.

**2. Warn-only backup.**  
Wrong default, and the justification conflates two failures. “Guard crashes / is unloadable” → fail-open is a deploy-availability argument. “Backup explicitly failed” → you *know* there is no recovery artifact → proceeding is negligence. You already halt on lock contention, so you do not actually believe “never block a deploy.” You believe “don’t block on the expensive, untested part.” That makes the backup decorative: a log line on a Render build nobody reads, then the risky operation runs anyway. `SWAN_MIGRATE_GUARD=enforce` will not be set by the same humans who left `render.yaml` unrouted.

**3. Backup never restored.**  
An unverified backup taken at migrate time is a confidence file. If `backup-db.mjs` writes inside the Render build container, it is deleted at the end of every deploy you would want to restore — worth *zero*, negative if people believe it exists. The packet never states a durable destination. That omission is the defect.

Even if it lands on S3: no restore probe, no PITR cursor recorded, no automatic restore on migrate failure. You already pay for Render Postgres PITR, then add a logical dump on the production hot path during a *build*, with no size/time budget, holding the (wrong) lock the whole time. Runtime tax, worse recovery, never exercised. Not worth it until a restore runs in this path.

**4. Empty shadow DB.**  
Class that passes there and destroys production: **destructive DDL and data migrations.** Concrete: `queryInterface.removeColumn`, `dropTable`, Sequelize `changeColumn` that rewrites a column, `bulkDelete`, raw `DELETE`/`UPDATE` with a WHERE that matches nothing on zero rows, `addColumn` with a default that backfills the wrong value onto real rows.

Syntax and double-apply idempotence are worth having. Calling it `migration-shadow-check` is not. A green check on an empty database makes people *less* careful — that is the silent-failure mechanism above. Rename it to what it is (`empty-db-syntax-idempotence`) or it is anti-safety.

**5. Bypass ledger.**  
A gitignored file the bypasser can delete is a diary, not a ledger. It authorises nothing, stops nobody, and is not tamper-evident — you said that, then still counted it as a rail. An agent that sets `SWAN_RULE45_OK=1` can unlink the file; an agent that uses `--no-verify` / `HUSKY=0` never hits it. The CI workflow is the actual non-bypassable piece. Keep the diary if you want local metrics. Do not put it in the safety story.

**6. What nobody is proposing.**  
Everyone is wrapping the start of `migrate`. Nobody is proposing to **stop applying DDL as a compile side-effect**, or to **prove the database is true when migrate ends**. You still have no `verify`, no staging clone, no destructive-op taxonomy, no committed production schema fixture. SWA-200 guarded the command. The hole is the database.

---

## This is theatre — not the work, the safety

The child-process lock fix, the lazy sequelize import, the uncommitted `render.yaml` flip, the known-limits section: that is real engineering. The *controls as they will exist on production* are theatrical.

- Production path unchanged (`render.yaml` not routed).
- Default guard cannot stop a bad migrate (warn-only, fail-open).
- Fail-open is indistinguishable from working — you wrote that down and shipped it anyway.
- The one enforced gate tests a database that cannot contain the failure.
- The backup may not outlive the build.
- The ledger is a local file named like an audit log.
- 41 mutation-verified tests prove the mocks twitch. Nothing here was run against a real migration, by your own doctrine.

You cannot approve a gap-closing build that leaves the gap’s production path untouched and then fail-opens the rest. Reviewing unplugged rails is reviewing a brochure. Wire nothing until the lock lives on the migrator, the backup is restorable from outside the build container, and CI sees something shaped like production. Until then this is costume on `npm run migrate:production`.
