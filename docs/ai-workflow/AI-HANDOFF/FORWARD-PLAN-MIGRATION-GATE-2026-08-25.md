---
decision: Buy nothing. Move the migration gate onto the deploy path (free, unbypassable), mothball the GitHub Actions gate, and reconcile schema provenance. The payment-idempotency scare is closed — the indexes exist.
status: open
supersedes: none
originating_model: claude-opus-5
created: 2026-08-25
linear: SWA-200
follows: docs/ai-workflow/AI-HANDOFF/HOSTILE-REVIEW-SHADOW-CI-HANDOFF-2026-08-25.md
---

# Forward plan — where the migration gate actually goes, and what to buy

**Short answer: buy nothing.** Both review seats independently reached that
conclusion, and so did I. The control you need is a **config change on a path you
already own and already pay for.**

Seats: GLM 5.3 and Ox Alpha (`stealth/ox-alpha`, $0.00), asked to rank four options
and name a purchase. They converged on every material point.

---

## 1. First — two alarms from the last review are now CLOSED

Both seats ranked the payment-idempotency question as the single most urgent item.
**GLM predicted the index "almost certainly doesn't exist."** I had reasoned the same
way from the model definitions. I probed production read-only instead of shipping the
inference. All three of us were wrong:

```
orders       CREATE UNIQUE INDEX idx_orders_idempotency_key
             ON public.orders USING btree ("idempotencyKey")
             WHERE ("idempotencyKey" IS NOT NULL)                    ✓ PRESENT, UNIQUE
print_orders CREATE UNIQUE INDEX idx_print_orders_idempotency_key
             ON public.print_orders USING btree (idempotency_key)
             WHERE (idempotency_key IS NOT NULL)                     ✓ PRESENT, UNIQUE
```

**Duplicate charges are prevented at the database level on both payment tables.**
`orders` currently holds 1 row with a key, 0 duplicate groups. No action needed.

**And the "32 orphan migrations" alarm de-escalates too.** My first probe reported 9
of 14 expected tables missing. That probe was wrong — it searched snake_case only,
and this database uses PascalCase for exactly these tables (the documented
`users` / `"Users"` gotcha). A second probe with a positive control found them:

| Concept | Reality |
|---|---|
| badges / collections / user badges | `Badges`, `BadgeCollections`, `UserBadges` — present |
| achievements | `Achievements`, `UserAchievements` — present |
| rewards / milestones | `Rewards`, `UserRewards`, `Milestones`, `UserMilestones` — present |
| point transactions | `PointTransactions` — present |
| gamification settings | `GamificationSettings`, `Gamifications` — present |
| **user consents** | **absent under any casing** |

`user_consents` is the only genuine absence — and it has **no model and no consumers**
anywhere in `backend/`. Per Rule 27 that is **dormant**, not broken.

**What remains is real but not urgent:** 254 tables exist; `SequelizeMeta` holds 372
rows and **not one of them is a `.mjs` migration**. The schema is real, but its
provenance is the boot-time repair sync rather than the migration ledger. That is
**debt, not an outage.**

> Two false alarms in one session, both from a probe that could only find what it was
> already shaped to find. The fix that worked both times was a **positive control** —
> make the instrument find something you know exists before believing it when it finds
> nothing.

---

## 2. The recommendation — Option C, and it costs $0

**Put the gate on the deploy path, because that is the only path to production.**

`render.yaml` already runs migrations inside the build command, chained with `&&`:

```yaml
buildCommand: |
    cd backend && npm install && npm run migrate:production
```

It does not gate today for exactly one reason: `safe-migrate.mjs` **deliberately
exits 0 on failure** — it logs the error, marks the failed migration as applied
anyway, and lets the build continue. The comment in the code says the boot-time
`sync({ alter: true })` will "handle the schema."

The switch that changes this **already exists** — `SWAN_MIGRATE_STRICT=1`, built last
week for the CI gate. Setting it in the Render environment makes the deploy itself
fail closed:

| | Today | With STRICT on the deploy |
|---|---|---|
| Migration fails | logged, **marked applied**, exit 0 | exit 1 |
| Build | continues | **fails** |
| Production | new code deploys onto a half-migrated schema | **previous release keeps serving** |
| Duplicate-key / FK errors | swallowed by the "already applied" heuristic | surfaced |

Why both seats picked it over everything else:

- **Unbypassable** — it is on the deploy path, not beside it. No `--no-verify`, no
  "was the hook installed", no plan tier, no CI minutes, no branch protection.
- **Free**, and **reversible in one env var**.
- **A wedged deploy blocks changes, not service.** For a solo operator that is
  strictly better than a silent bad migration.
- It also kills the "already applied" heuristic, which swallows `duplicate key value`
  and `violates foreign key constraint` — a silent-corruption vector in its own right.

### One prerequisite, and it is NOT currently met

Both seats independently said: only trust fail-closed if each migration is
transactional. I checked.

```
transaction handling in safe-migrate.mjs ............ NONE
.cjs migrations managing their own transaction ...... 93 of 307
```

So **214 migrations can partially apply before the non-zero exit.** STRICT will
correctly refuse to mark them applied — which means the next deploy retries them
from the top against a half-changed schema.

**This does not block the plan; it orders it.** Turn on
`backup-before-migrate` + the advisory lock (both already built, in
`pre-migrate-guard.mjs`) **before** flipping STRICT, and prove the backup actually
fires with one test restore. Then a wedge is "restore, fix, redeploy" instead of
improvising at 11pm. Also check whether any migration uses
`CREATE INDEX CONCURRENTLY`, which cannot run inside a transaction at all.

---

## 3. What to buy

**Today: nothing.** Every risk-removing action this week is free.

| Option | Verdict | Why |
|---|---|---|
| **Nothing** | ✅ **this week** | Option C is a config change. The work is hours, not dollars. |
| Throwaway Postgres on Render, ~$7/mo | ⏸ **maybe, week 3+** | The one purchase that buys real protection — rehearsal against populated data *before* production. But it will false-red constantly until schema provenance is reconciled. Revisit after two weeks of STRICT running clean. |
| GitHub Pro ~$4/mo | ❌ **do not buy** | May not even clear the block (cause unknown, and a paid plan needs a working card anyway). Even unlocked, a required PR check collides with push-to-main deploys, and exempting yourself makes it theatre for the one person who ships every migration. |
| Make the repo public | ❌ **never** | Irreversible in practice. Requires rotating the exposed key and auditing 515 MB of rewritten credential-bearing history first — the largest time sink available — to save $4/month, while handing out pricing and strategy docs. Ox: *"the worst risk-adjusted trade on the board."* |

---

## 4. Sequenced plan

**Today — under 90 minutes, all free**
1. **Rotate the exposed Render API key.** Live since 2026-08-12. Minutes of work,
   unbounded downside. *(One addition of mine: if the GitHub block turns out to be a
   failed payment, check the card on Render too — a declined card is rarely scoped to
   one vendor, and Render is what actually serves clients.)*
2. **Prove the backup guard fires**, and do one test restore. The
   "gate passed vs. gate never installed" problem applies to backups too.
3. ~~Verify the payment-idempotency indexes~~ — **done, this session. They exist.**

**Tomorrow — ~30 minutes**
4. Set `SWAN_MIGRATE_STRICT=1` in the Render environment. Push something trivial.
   Write the five-line wedge runbook: previous release keeps serving; escape hatch is
   unsetting the flag; preferred path is fixing forward.
5. Expect a few surfaced errors that were previously swallowed. Budget one calm
   session to triage them — not a panic session mid-incident.

**This week, in dead time**
6. **DMARC record** — ten minutes, owed since July.
7. **Schema reconciliation** (GLM's Option E, free): `pg_dump --schema-only`, diff
   against migrations and models, give the orphans executable twins guarded with
   `IF NOT EXISTS` or cut a consolidated baseline — then demote the boot repair sync
   to log-only drift detection, behind a flag. This is the leg Option C does *not*
   cover, and GLM argues findings 4+5 together are the real corruption engine.

**Drop entirely**
- The four gen-3 workflow fixes, the canary run, PR #71 as a gate, branch protection
  setup, and any Option-B history audit.
- The billing investigation as a *project*. Glance at the page while rotating keys
  (step 1) — but with Option C chosen, GitHub CI is off the critical path and the
  block costs nothing.

---

## 5. The CI gate — mothball, don't delete

Both seats: **kill it as a priority.** 4,051 runs, zero successes, four months dead;
even unblocked it is advisory on this plan; required-check mode contradicts
push-to-main deploys; and its own acceptance PR would have gone green having tested
nothing. Sunk cost is not an argument — the *enforcement premise* is dead, not just
the bugs.

**What survives and should be kept:** the synthetic-seeding harness
(`seed-shadow-db.mjs`, its selftest, `shadow-meta-count.mjs`) is the genuinely
valuable asset. It is what a future on-Render shadow check reuses. Leave PR #71 open
and unmerged, or close it with a pointer to this doc — do not delete the branch.

**If ever revived:** not GitHub CI. An on-Render pre-deploy step, gated on a fixed
delta counter, against a cached seeded snapshot, advisory ahead of the STRICT leg —
and only after schema reconciliation, or it false-reds on provenance drift forever.

---

## 6. Seat calibration

| Seat | Cost | Pick | Notable |
|---|---|---|---|
| **GLM 5.3** | subscription | C, then E | Added Option E (demote the boot sync) unprompted — the one leg C doesn't cover, and arguably the real corruption engine. Predicted the idempotency index was missing. **Wrong.** |
| **Ox Alpha** | **$0.00** | C, then D | Sharpest on sequencing and on reversibility as the deciding axis. Called B *"the worst risk-adjusted trade on the board."* Also predicted the index question was open. **Closed by probe.** |
| **Claude Opus 5** | subscription | C | Verified the two alarms closed; found the transactionality prerequisite is unmet; made two instrument errors and caught both with positive controls. |

**The calibration lesson worth keeping:** all three seats ranked the idempotency
index as the most urgent item on the board, and all three were reasoning from the
same correct premise (the boot sync builds indexes from model definitions; the model
declares none). The premise was right and the conclusion was wrong, because something
else had created the index. **A unanimous panel reasoning from a shared premise is
not evidence — it is one argument stated three times.** The five-minute read-only
query beat all of it.
