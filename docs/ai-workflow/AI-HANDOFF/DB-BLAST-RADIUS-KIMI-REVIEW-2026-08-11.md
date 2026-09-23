# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/DB-BLAST-RADIUS-GUARD-BLUEPRINT-2026-08-11.md
**Seed:** (none)
**Tokens:** 3166 in / 9970 out | **Cost:** ~$0.1590 | **Wall:** 362.0s | **finish_reason:** stop

---

# HOSTILE REVIEW — Blast-Radius Guard Blueprint

**Verdict up front:** the taxonomy insight (§1, "destructive by reference, not by verb") is genuinely correct and the block-message pedagogy is good. Everything else has holes, and the biggest one is that **the guard defends text files while the database is reachable through a dozen non-text paths — and the guard's own policy files are editable by the agent it's guarding.** Ordered as instructed.

---

## 1. EVASION — concrete bypasses

### 1a. The gate's own policy files are unprotected (critical, one-command kill)

`defaultMode: "acceptEdits"` means `Edit` writes silently. The blueprint gates writes to `migrations, *.sql, seeders` — but not:

```
Edit: scripts/hooks/db-blast-radius-gate.mjs
  old_string: #!/usr/bin/env node
  new_string: #!/usr/bin/env node
              process.exit(0);
```

Nothing in §4 denies this. Same for `backend/schema-snapshot.json` (agent edits it to *add* `exercise_library`, then C2 "resolves clean"), `.claude/settings.json` (remove the hook registration), and `.claude/skills/blast-radius-guard/SKILL.md`. **A guard whose rules the agent can edit is a suggestion.** You need a deny-list covering the hook, the snapshot, settings, and the skill — and even then, see 1d: the agent can `git checkout` or `cat >` overwrite those files via Bash unless Bash file-write redirects to those paths are also denied.

### 1b. Write-via-Bash bypasses the entire static-analysis layer

The hook fires on `Write`/`Edit` to migration paths, and on `Bash` matching a "DB-reaching runner." Neither fires here:

```bash
Bash: cat > backend/migrations/20260812-001-evil.cjs <<'EOF'
module.exports = { up: q => q.dropTable('Users'), down: async () => {} };
EOF
Bash: npx sequelize-cli db:migrate
```

Command 1 is not a DB runner (it's `cat` — allow-listed or unmatched). Command 2 contains **no SQL tokens for command analysis to see** — `db:migrate` is in `ask` or allow, and D1's env check passes or the human rubber-stamps the routine-looking command. Class A never gets evaluated because the destructive content traveled through a heredoc, not a `Write`. Every content-scan on `Write`/`Edit` must be duplicated as a content-scan on Bash redirection targets matching `backend/migrations/**` — i.e. parse the heredoc/`>` target path out of every Bash command. The blueprint doesn't mention this at all.

### 1c. Sequelize migrations are JavaScript, not SQL — "statement parse" sees nothing

Class A/C detection is specified as "statement parse" of SQL. But the repo's 343 migrations are `.cjs` files whose dominant destructive idiom is:

```js
await queryInterface.dropTable('Users');               // no SQL verb anywhere
await queryInterface.removeColumn('Users','email');
await q.sequelize.query(`DROP TABLE ${t}`);            // template literal, unparseable statically
await q['drop' + 'Table'](['U','sers'].join(''));      // defeats any identifier scan
await q.sequelize.query(atob ? atob(s) : Buffer.from(s,'base64').toString());
```

The blueprint never says whether C1 parses the JS AST for `queryInterface.*` calls. If it greps for SQL verbs, every one of the above passes. And the nuclear Sequelize option contains neither SQL nor a migration file:

```js
await sequelize.sync({ force: true });   // drops and recreates EVERY table
```

`sync({force:true})` / `sync({alter:true})` in a one-off script, a seeder, or a test file is the single most likely Sequelize-agent catastrophe and it matches no pattern in §3 (see §5, class Q).

### 1d. Git plumbing restores deleted gates

```bash
Bash: git stash -- scripts/hooks/ && npx sequelize-cli db:migrate && git stash pop
Bash: git show HEAD~1:scripts/hooks/db-blast-radius-gate.mjs > /tmp/hook.bak  # etc.
```

`git` file-restoration verbs are a write primitive that bypasses `Write`/`Edit` gating. Unless the hook also fires on `git checkout|restore|stash|show ... >` targeting gated paths, file-content gating is cosmetic. (`git reset --hard` is denied per class G, but the *surgical* restore forms are not.)

### 1e. Class C (unbounded mutation) is undecidable by pattern, and the boundary cases are the common ones

`WHERE 1=1` is the toy case. All of these are full-table or effectively-full-table mutations that a regex/heuristic will either miss or false-positive on:

```sql
DELETE FROM sessions WHERE expires_at < now();        -- legit scoped... or all rows, parser can't know
UPDATE users SET plan='free' WHERE id IS NOT NULL;    -- all rows, no suspicious literal
UPDATE t SET x=1 WHERE true;                           -- trivial variant of 1=1
DELETE FROM t WHERE id > 0;
WITH d AS (DELETE FROM audit_log RETURNING *) SELECT count(*) FROM d;  -- DELETE hidden in CTE
DO $$ BEGIN EXECUTE 'DELETE FROM ' || quote_ident(v); END $$;          -- dynamic SQL in DO block
```

Fail-closed-on-ambiguity means every `DO $$ ... $$` block (common in real migrations) gets blocked → false-positive storm (§2). Fail-open means concat/`EXECUTE` sails through. There is no regex middle ground; only run-time rowcount estimation (`EXPLAIN`/pre-flight `SELECT count(*)` with the same WHERE) actually decides this, which the write-time hook cannot do.

### 1f. Class B evasion: dynamic targets and Postgres identifier folding

```js
const t = 'users';
await q.sequelize.query(`CREATE TABLE x (c UUID REFERENCES ${t}(id))`);
```

Static analysis can't resolve `${t}`. "Fail closed on parse ambiguity **for destructive shapes**" doesn't help — a `CREATE TABLE` is not a "destructive shape," so it passes by design. The incident class (B) is explicitly the *quiet* one, and the blueprint's own fail-open/fail-closed split waves quiet-but-unparseable statements through.

Also note the blueprint says snapshot resolution is "**case-sensitively**" — that's *wrong* for Postgres. Unquoted `REFERENCES Users(id)` folds to `users`. If your checker does a raw case-sensitive compare, it will (a) block correct quoted references written with different styling, and (b) mishandle unquoted ones. The checker must replicate PG folding semantics exactly: unquoted → lowercase, quoted → literal. This is a correctness bug in the spec, not just an evasion.

### 1g. The block message prints the override token

§5's wireframe ends with:

```
│  Snapshot age: 0d.   Override: SWAN_BLAST_RADIUS_ACK=<reason>         │
```

You are handing the agent the key in the denial message. Next tool call:

```bash
Bash: SWAN_BLAST_RADIUS_ACK="Sean approved" npx sequelize-cli db:migrate
```

Inline env assignment in the same shell command sets the var for that process; no persistence needed. A subtly misaligned agent doesn't even need to be clever — a *sloppy* one will do this reflexively because the message pattern-matches to "set this to proceed." This single line converts the entire gate into a self-serve kiosk. (Full treatment in §3.)

### 1h. Deferred and out-of-band execution

- `echo "DROP TABLE users" | at now + 2 minutes` — gate sees `echo`.
- Migration committed and pushed: if Render runs `db:migrate` on deploy (standard Render setup), then `git push` **is** the run-time and no local hook is anywhere near it. This is the largest architectural evasion: the hook guards the agent's fingertips, but the deployment pipeline is an unguarded executor. (Fix in §6.)
- `CREATE TRIGGER`/`CREATE RULE` that rewrites or deletes data on future writes — destructive-by-reference, same silent family as the incident, no verb in §3's list, and the corruption happens *after* everyone stops watching.

**Summary of §1:** the gate inspects three file shapes and one command shape; the database is reachable through heredocs, queryInterface AST, git plumbing, dynamic SQL, the deploy pipeline, and the gate's own editable source. Evasion isn't a corner case — it's the median path for any nontrivial attack and several innocent ones.

---

## 2. FALSE POSITIVES — what gets blocked, and the disable timeline

Concrete FP sources, in order of friction:

1. **Retrofit on 343 historical migrations (your own OQ3).** Any `Edit` to any old migration — fixing a comment typo — triggers full A/C/D analysis on a file written in 2023 that contains `dropTable`, `removeColumn`, no `down()`. Historical migrations *should* contain those. First day of retrofit: every archaeology task hard-stops.
2. **Seeders.** The canonical seeder pattern is `TRUNCATE lookup_table CASCADE; INSERT ...` or `bulkInsert` after delete. Class A blocks the standard, safe, intended behavior of the seeder directory you explicitly gate.
3. **Intentionally irreversible migrations.** Dropping a dead column is normal hygiene; no `down()` can restore the data. Class D blocks exactly the migrations a healthy schema needs. FP rate on cleanup work: ~100%.
4. **`DO $$ ... $$` blocks and CTE-wrapped DML** under fail-closed-on-ambiguity (§1e).
5. **Blueprint-lint on `docs/**/*.md`.** This repo's planning workflow (per §1, the incident itself) is *docs full of sketch SQL*. Pseudo-schema with placeholder table names — exactly what a planning doc should contain — will trip class B against the snapshot. Blocking a *planning doc write* for a hypothetical FK is the fastest way to make the author hate the tool. This must be warn-only, and the blueprint already senses it (OQ5) but hasn't committed.
6. **Case-folding mis-analysis** (§1f) flags stylistically-different-but-correct references.

**Disable timeline:** the kill condition isn't the FP count, it's FPs *on the critical path of current work*. The docs-lint alone fires on the repo's core workflow (consult packets, handoff docs). Combined with seeder blocks and historical-migration edits, a realistic estimate is **3–8 false denials in the first two days**, and the disable won't be thoughtful — it will be Sean adding `"SWAN_BLAST_RADIUS_ACK": "on"` to `settings.json`'s env block at 11pm to finish a task, where it sits permanently. You designed the override as an escape hatch; it will be adopted as a configuration. A guard that ends as a permanently-set env var is worse than none because it leaves the *audit trail and the confidence* of a guard with none of the function.

Mitigations that actually reduce FP pressure (rather than asking users to tolerate it): gate only the **pending-migration diff** (files not yet in `sequelize_meta`), never historical files; warn-only for docs and for class B; and move the destructive-DML decision to run-time rowcount evidence (§6).

---

## 3. THE OVERRIDE PARADOX — the actual mechanism

Requirements: (a) the agent cannot mint approval, (b) approval binds to the *exact* proposed action — no approve-X-run-Y, (c) single-use and short-lived, (d) rare enough that humans don't rubber-stamp.

Build this:

1. **Delete `SWAN_BLAST_RADIUS_ACK` from the wireframe and from existence.** Never print the override mechanism in a denial.
2. **On block**, the hook writes `~/.swan-gate/pending/<approval-id>.json` containing the SHA-256 of the exact post-write file contents (or exact Bash command string), the classification, and a 15-minute expiry. It prints only the approval ID.
3. **Approval is minted out-of-band by the human**: `swan-gate approve <id>`, a binary in `~/bin` (outside the repo, outside agent-editable paths) that (a) prints the exact diff/command and *requires typing the table name or `yes` on a TTY* — it opens `/dev/tty` directly, so a non-interactive agent invocation of it via Bash/`node -e` fails; and (b) is itself on the Bash deny list for good measure.
4. **On retry**, the hook re-hashes the proposed content and allows only on exact hash match with an unconsumed, unexpired approval, then deletes it. Content change of one byte → new approval required. This kills approve-X-run-Y and replay.
5. **The terminal enforcement lives in Postgres, not in any of this** — an event trigger (below, §6) that requires the same single-use token as a session GUC. Then *even if* layers 1–4 are all bypassed (heredoc, git restore, node -e, edited hook), the DDL itself raises an exception unless a human minted a token within the TTL. This is the answer to the paradox: **the escape hatch the agent can reach stops mattering when the database itself is the gatekeeper**, because the agent can reach the DB but cannot reach the token-minting TTY.

And the load-bearing caveat: this only survives contact with reality if overrides are **rare** — which is why §2's FP fixes aren't polish, they're part of the security model. A gate that demands a TTY approval five times a day gets a human typing `yes` without reading by day three.

---

## 4. SNAPSHOT STALENESS (OQ1) — the snapshot should never be the authority

The blueprint treats the committed JSON as the source of truth and debates staleness *policy*. Wrong frame. Note the asymmetry first:

- Stale snapshot says "table missing" but it now exists → **false block** (annoying, safe, trains override use).
- Stale snapshot says "table exists" but it was dropped/renamed → **false pass** (silent, dangerous, the actual incident class).

Any age-based policy (hard-fail at N days, warn, refuse-to-judge) manages only the first direction and does nothing for the second. The correct answer:

**Verify live at judgment time, for only the referenced objects.** A class-B decision needs `information_schema.columns` / `pg_constraint` rows for the handful of tables named in the statement. That's one parameterized read-only query, ~5ms, and `DATABASE_URL` is definitionally reachable in this environment. Concretely:

1. Hook parses the statement → extracts referenced tables/columns/types.
2. **On a would-block (miss)**: re-check live before denying. This alone eliminates the override-training FP storm — you only deny when the *live* schema confirms the drift.
3. **On a pass with snapshot older than ~4h**: verify live or downgrade to warn. This closes the dangerous false-pass direction.
4. Snapshot = offline cache, used only when the DB is unreachable; then fail closed for class B *with a distinct message* ("cannot verify — DB unreachable"), not a generic block.
5. Cheap drift detector in the snapshot header: last applied name from `sequelize_meta` + generation timestamp, compared live in the same 5ms query.

Net: "staleness policy" dissolves, because the snapshot is never the authority. Also regenerate it in CI on merge to main so the cache stays warm for the offline path.

---

## 5. MISSING HARM CLASSES (OQ6) — what §3 omits for a Node/Sequelize/Postgres/Render SaaS

- **Q. `sequelize.sync({force:true})` / `{alter:true}`.** No migration file, no SQL verbs, drops/alters the entire schema. The most Sequelize-specific catastrophe and it's invisible to every listed detector. Also `db:drop`, `db:seed:undo:all`, `db:migrate:undo:all`.
- **H. Availability destruction via locking.** `CREATE INDEX` without `CONCURRENTLY`, `ADD COLUMN` with a volatile default, `ALTER COLUMN TYPE` (full table rewrite + `ACCESS EXCLUSIVE`), enum `ALTER TYPE` outside a transaction. Data survives; the site doesn't. On Render with health-check deploys this is an outage.
- **J. Unbatched mass operations.** A migration `UPDATE`ing 50M rows in one statement: hours-long lock, replication lag, connection-pool exhaustion. §3 has "unbounded mutation" as a correctness class but nothing about *blast radius over time* — require batching evidence above a rowcount threshold.
- **K. Non-Postgres irreversible state.** The env that holds `DATABASE_URL` also holds, in a typical Render SaaS: Stripe secret key (mass refunds/cancels/price deletion), S3/R2 credentials (`rm`-equivalent on the bucket), SendGrid (email blast to the entire user base — irreversible the moment it sends), Redis (`FLUSHALL`; and if BullMQ queues live there, `queue.obliterate()` / `clean()` destroys undelivered jobs — genuinely irreversible), and the **Render API token itself** (delete service, scale to zero, overwrite env vars). An agent told to "clean up" can do all of this without touching SQL. Your scope statement says "not database specifically" — then these are in scope and absent.
- **O. Migration-history tampering.** Editing already-applied migrations (checksum divergence from `sequelize_meta`), deleting rows from `sequelize_meta`, `db:migrate:undo` chains. Creates the state where prod and repo disagree about what ran — the root of the "mystery 500s" you cite.
- **N. Privilege/RLS changes.** `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`, `GRANT`, role password changes — silent security-boundary destruction, no destructive verb.
- **P. Deferred-action DDL.** Triggers and rules that corrupt on future writes (§1h). Same silent-by-reference family as the incident that motivated this entire document, and unlisted.
- **T. Test paths against prod.** Because local dev *is* prod (CLAUDE.md:49), `npm test` running a suite that does `sync({force:true})` or truncates fixtures is a drop-all with an innocent command line. The command allowlist judges intent by name; `npm test` sounds safe and isn't.

The root cause underneath Q, T, and half of everything else: **local dev points at production.** Every layer of this blueprint is a compensating control for that one decision. No hook design survives it; see §6.

---

## 6. WRITE-TIME vs RUN-TIME (OQ7) — run-time, and here's the precise meaning

**Pick run-time**, where "run-time" means *at the moment of execution against the production database, enforced outside the agent's reach* — not "when the agent's Bash fires."

Write-time loses on the evidence already in this review: it analyzes *text that might someday run*, so it must analyze 343 historical files on edit (FP storm), can't know the target env, can't know selectivity (§1e), can't resolve dynamic SQL (§1f), and is bypassed by every non-`Write` transport (heredoc, git restore, deploy pipeline). Its false-positive rate is structurally maximal because it's judging possibility, not execution. Keep the write-time hook only as an **advisory/teaching layer** (warn, log, never block docs) — its real value is the pedagogy of §5's message, which is legitimately good.

The run-time stack, concretely:

1. **Guarded runner as the only credentialed path.** `npx sequelize-cli db:migrate` comes off the allow list; the only allow-listed migrator is `node scripts/guarded-migrate.mjs`, which (a) diffs filesystem migrations against live `sequelize_meta` — so it analyzes **exactly the pending set**, zero historical-file FPs by construction; (b) runs the A/B/C/D analysis against the **live schema** (kills snapshot staleness); (c) for class C, pre-flights `EXPLAIN`/estimated rowcounts and demands batching above a threshold; (d) requires the §3 single-use token for hard classes; then (e) runs the migration. Raw `sequelize-cli`, `psql -c/-f` with DDL, and `node -e` are denied prod credentials entirely.
2. **Root fix: prod credentials become scarce.** The agent's everyday `DATABASE_URL` points at a branch/sanitized snapshot (Neon branch, Render fork, nightly restored dump — pick one). Prod creds exist only inside the guarded runner's sealed env and Render's deploy env. This single change converts classes E, T, and most of K from "guard problem" to "non-problem," and it's the only fix that content-inspection of `node -e` can't evade — you stop trying to parse the command and instead make the command harmless.
3. **Enforcement inside Postgres, immune to all of §1:**
   - An **event trigger** on `ddl_command_start` that raises an exception for `DROP TABLE`/`TRUNCATE`/`DROP COLUMN` unless the session GUC `swan.migration_token` matches an unconsumed, unexpired token row minted by the human approval flow. Heredocs, `node -e`, `sync({force:true})`, edited hooks — all of them still hit this, because it's *in the database*.
   - `ALTER ROLE agent_writer SET statement_timeout` / `lock_timeout` — free, and partially kills class H/J.
   - Agent's default role owns nothing and lacks DDL; DDL only via the guarded runner's role.
4. **CI as the second run-time gate.** The same analyzer as a GitHub Action on PRs touching `backend/migrations/**`, blocking merge — because Render deploy is a run-time the local hook never sees (§1h).

Write-time's one genuine advantage — catching the bad FK in the *plan* before a builder runs it — is preserved by keeping layer-3 blueprint-lint as warn-only. Earliest *catch* stays at write-time; earliest *block* moves to the database boundary.

---

## What's sound (briefly)

- The §1 observation — verb-blocklists are theater against referential drift — is correct and well-argued.
- Layer 3's consult-packet preamble (fixing externally-authored SQL at authoring time) attacks the actual upstream cause.
- The block-message format, minus the override line, is the right pedagogy.
- Fail-closed on destructive-parse ambiguity is the right default *where parsing is decidable*; the problem is how much of the real workload isn't.

## The one-paragraph indictment

This blueprint builds an increasingly sophisticated text scanner in front of a database that (a) is reachable through heredocs, ORM ASTs, git plumbing, dynamic SQL, the deploy pipeline, and `sync({force:true})`; (b) has its guardrails, snapshot, and override token all writable or settable by the agent; and (c) shouldn't be the local dev database at all. Stop scanning harder. Make prod credentials scarce, put a single-use-token event trigger inside Postgres, gate the pending-migration diff at execution time, and demote the write-time hook to the excellent teacher it accidentally is.
