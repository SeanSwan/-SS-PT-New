---
surface: backend / schema / audit-method
originating_model: claude-opus-5
tier: sub-fable (working memo only — NOT for the durable learning corpus)
date_utc: 2026-07-29T20:30:00Z
linear: SWA-71
---

# Enumerate-and-execute found two more live defects — and showed its own limits

Iteration 5's lesson was "stop verifying your hypotheses, enumerate the whole surface." I built
that: extract every SQL literal from the shipped backend, execute each against the production DB
in a READ ONLY transaction. 201 SELECT literals, 146 clean, **2 confirmed live defects**.

## The two defects (documented, NOT fixed — both need Sean's decision)

**1. `exercise_library` — two migrations, one day apart, incompatible schemas.**
`20251112000000-create-nasm-integration-tables` created it with `exercise_name`/`primary_body_part`
and WON. `20251113000000-create-exercise-library-table` declares `name`/`primary_muscle`/
`difficulty` and lost (no `tableExists` guard, table already existed). `videoLibraryController`
was written against the loser and is mounted live at `/api/admin/videos` AND
`/api/admin/exercise-library`. Four fields (`description`, `secondary_muscles`, `difficulty`,
`primary_video_id`) have NO home in the live schema.

**2. `user_follows` — the table was never created.** No migration anywhere. But
`models/UserFollow.mjs` declares it, `socialController` calls `.findOne()`/`.create()` on it, and
three mounted routes depend on it (`/followers`, `/following`, `/follow-stats`).

## Why I did not fix either — the reusable judgment

For #1, renaming `name`→`exercise_name` fixes one line and the `INSERT` three lines later still
fails. **A partial fix moves the failure one line down** — literally this morning's lesson, where
correcting a table name without its columns turned "relation does not exist" into "column does not
exist". Still broken, still silent. A fix that changes the error message is not a fix.

For #2 the tempting move was worse. `SocialConnections` exists with `followerId`, `followingId`
AND `status` — an exact shape match; a rename would compile and run. It also has 0 rows and ~50
columns including `privacyLevel`, `canSeeProfile`, `canSeePosts`. **Pointing a lightweight follow
feature at a rich connections table is a data-model decision with privacy implications, not a typo
fix.** The shape matching is exactly what makes it dangerous — it looks like a rename.

**Generalizable: when the wrong fix would still run clean, that is when to stop and ask.** A fix
that compiles, executes, and returns rows is indistinguishable from a correct fix in every test I
can write. Compilation is not consent.

## The limits of the method I just adopted

1. **First pass reported 44 failures; 42 were noise** — my harness bound an integer user-id into
   every named param, producing `operator does not exist: character varying = integer`. Only
   `relation/column … does not exist` fails regardless of binding. **Second time today a sweep of
   mine hit ~95% false positives** (the first was 596/665). Confirm the sweep before the failure.
2. **46 of 201 literals were skipped** because they are built at runtime with `${}` — not covered,
   and I said so in the doc rather than letting 201/201 imply completeness.
3. **Write statements were never executed** (correctly — read-only by construction). But finding
   #1's real severity only became visible when I read an `INSERT` **by hand**. The automated sweep
   found the door; reading found the size of the room.

**So: automated enumeration widens coverage; it does not remove the need to read the code around a
hit.** Two iterations running, the method was the finding — and the improved method still had a
95% noise rate and still missed severity. Worth remembering before trusting the next clean sweep.

## Also worth carrying

Two migrations creating the same table is a repo-hygiene smell with a runtime consequence, and it
took executing SQL to notice. Neither migration is "wrong" in isolation; the conflict only exists
in the DB. **Competing migrations are invisible to code review by construction** — worth a
dedicated static check (duplicate `createTable` targets across migrations) since that one IS cheap
and deterministic.

---

## Late addition: a migration recorded as APPLIED that did nothing

Chasing finding #1's root cause turned up the sharpest lesson of the iteration.

`SequelizeMeta` says `20251113000000-create-exercise-library-table.cjs` **applied successfully**.
Its schema is not in the database. What happened: it ran, `createTable('exercise_library')` threw
because an earlier migration had already created the table, its transaction `catch` **swallowed
the error**, and Sequelize wrote the success record anyway.

**A catch-all in a migration converts a schema conflict into a permanently "applied" migration
that did nothing.** No one will ever re-run it — the ledger says it is done. The migration behaved
exactly as written; the ledger is simply lying. Worth auditing other migrations for the same
swallow pattern.

## And a self-correction worth keeping

An earlier draft of my doc asserted that migration had NO guard and therefore could not have
applied. Wrong: I had grepped the **first 30 lines** of a 400-line file whose `createTable` sits at
line 363. `SequelizeMeta` then settled what actually happened.

**"I grepped and found nothing" is only as strong as the range grepped.** Third grep-scoping error
today (single-quote-only pattern, stale tree, now a truncated range). The pattern is always the
same: a search narrower than the claim it is used to support.

## The check I did NOT build, and why

The `exercise_library` conflict suggested a static check for duplicate `createTable` targets.
Ran it: **20 tables matched** (`shopping_carts` ×6, `orders` ×4, `notifications` ×4...). Almost
all benign — in every case the unguarded `createTable` is the ORIGINAL migration (correct then,
the table did not exist) and the later duplicates are guarded `repair-`/`hotfix-` migrations. A
healthy pattern for a repaired production DB.

**The naive check would have yielded 20 findings, ~19 noise.** The discriminating versions are
"duplicate createTable with *disjoint column sets*" and "migration whose catch swallows a
createTable failure". Left as a recommendation rather than shipping the noisy version.
