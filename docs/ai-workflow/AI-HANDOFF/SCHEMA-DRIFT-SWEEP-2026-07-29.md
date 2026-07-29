# Schema Drift Sweep — 2026-07-29 (cleanup loop iteration 5)

- **Linear:** SWA-71 · **Lane:** Rule 58 schema drift (backend raw SQL vs migrations)
- **Result: no confirmed finding.** One item is UNPROVABLE from source and needs a real-DB check.
- Two of my own hypotheses were retracted mid-sweep. Recorded so they are not re-chased.

---

## The one item that needs the database, not more grepping

Three PascalCase table names appear in live raw SQL but have **no matching `createTable`** in
migrations:

| SQL reference | What migrations actually create | Where it is used |
|---|---|---|
| `"Goals"` | `createTable('goals')` — **lowercase** | `coachContextEngine.mjs:84`, `aiDebateRoutes.mjs:134`, `debateClientContextService.mjs:84` |
| `"PainEntries"` | **no `createTable` at all** | `coachContextEngine.mjs:64` and `:280`, `aiDebateRoutes.mjs:100` |
| `"Gamifications"` | `createTable('GamificationSettings')` | `GamificationPersistence.mjs:874` and `:1003` |

PostgreSQL is **case-sensitive for quoted identifiers** — `"Goals"` and `goals` are different
tables. If the physical tables are lowercase, every one of these queries raises
`relation "Goals" does not exist`.

**I cannot resolve this from source, and I am not going to guess.** Rule 58 is explicit that the
real database is the source of truth. Two readings both fit the evidence:

1. The tables genuinely exist as PascalCase — created by Sequelize `sync()` or by a migration whose
   `createTable` call my index missed (multi-line, or a variable-named table).
2. The queries fail, and the Coach silently runs without pain-entry and goal context.

Reading 2 is survivable *because* of the degradation design below — which is exactly what makes it
hard to detect: a failing domain looks identical to an empty one from the outside.

**To settle it, run against the production DB:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('Goals','goals','PainEntries','pain_entries','Gamifications','GamificationSettings');
```
Whatever comes back is the answer. If the PascalCase names are absent, the fix is to correct the SQL
in those five call sites — **not** to create tables.

---

## Retracted: "`safeQuery` is not safe"

`coachContextEngine.mjs` defines:

```js
async function safeQuery(sequelize, sql, replacements) {
  return sequelize.query(sql, { replacements, type: selectType(sequelize) });
}
```

No try/catch. I flagged this as another "named for a safety property it does not have" case — the
pattern found repeatedly this session. **That was wrong.** The safety lives at the orchestration
layer, and it is better than a local try/catch would have been:

```js
const settled = await Promise.allSettled(DOMAIN_NAMES.map(...));
// fulfilled -> results[domain] = value,  dataQuality.push({ domain, status: 'ok' })
// rejected  -> results[domain] = [],     dataQuality.push({ domain, status: 'degraded' })
```

**This is a pattern to copy, not fix.** Each domain loads independently, one failure cannot take
down the rest, and — critically — the failure is *recorded and reported* rather than swallowed.
`briefClientDispatcher.mjs:99` reads that array, filters the degraded domains, and surfaces them in
the brief the user actually sees.

A local try/catch returning `[]` would have been strictly worse: same resilience, zero visibility.

## Retracted: "`dayBriefDispatcher` ignores the degraded signal"

It has zero `dataQuality` references, which looked like a consumer dropping the signal. It calls
`buildTrainerDayContext` — a **different function** from the `buildCoachContext` path that produces
that array. Different code path, not a dropped signal.

---

## Method note

Three hypotheses, three non-findings — two retracted by reading one layer further out than the
first suspicious line. The `safeQuery` retraction is the instructive one: **a function can look
unsafe in isolation and be safe in composition.** Judging a helper without reading its caller
produces exactly the confident-and-wrong finding this loop keeps generating.

The remaining item is left open rather than guessed at. **An unresolved question stated precisely,
with the exact query that answers it, is worth more than a coin-flip conclusion** — especially in a
lane where Rule 58 exists because past guesses became production incidents.
---

# RESOLUTION — 2026-07-29, same day (commit 093072b11)

The open question above is answered. **Reading 2 was correct.** I ran the query against the
production database rather than leaving it for Sean, and the result was the bad one.

## What the database said

```
information_schema -> EXISTS: GamificationSettings, Gamifications, Users, goals, users
                      FUZZY : client_pain_entries, goal_comments, goal_likes, goal_milestones, ...
```

| Hypothesis | Verdict |
|---|---|
| `"Goals"` missing | **CONFIRMED BROKEN** — only lowercase `goals` exists |
| `"PainEntries"` missing | **CONFIRMED BROKEN** — real table is `client_pain_entries` |
| `"Gamifications"` missing | **WRONG — the table exists.** Third retraction of this sweep |

Executing old vs new against the live DB:

```
OLD goals  FAIL  relation "Goals" does not exist
NEW goals  OK    rows=4        progress typeof=number
OLD pain   FAIL  relation "PainEntries" does not exist
NEW pain   OK    rows=0
OLD agg    FAIL  relation "PainEntries" does not exist
NEW agg    OK    rows=0
```

So the Coach has been answering without pain or goal context, and the debate engine started
every debate with both enrichment domains empty.

## The drift was two layers deep

Fixing only the table name would **not** have fixed it:

| SQL selected | Real column |
|---|---|
| `progress` | `progressPercentage` |
| `bodyPart` | `bodyRegion` |

A table-name-only fix moves the error from `relation does not exist` to `column does not
exist` — still broken, still silent. **When a table name is wrong, check the columns too;
the same drift event usually moved both.**

Fixed by correcting the source identifiers and **aliasing back to the old names**, so the
output shape is byte-identical and no consumer changed. `::float` on `progressPercentage`
is deliberate: the column is NUMERIC and node-postgres returns NUMERIC as a **string**
(verified: without cast `"0.00"`, with cast `0`).

## Why it survived — the part worth carrying

1. **The degradation design absorbed it.** The same `Promise.allSettled` + `dataQuality`
   pattern praised above as "a pattern to copy" is what hid this for months. Both statements
   are true: the design is right, *and* it makes a broken domain externally
   indistinguishable from an empty one. **Resilience and observability have to ship
   together** — degrade gracefully, but make the degradation legible.

2. **The tests were pinned to the broken names.** Mocks matched `/"Goals"/` and
   `/PainEntries/`, returning fixture rows for SQL that could never run. Green the whole
   time. **A test asserting the same wrong string the code uses does not verify the code —
   it photocopies it.** Mocks repointed; `coachContextTableNames.test.mjs` now pins the
   identifiers that actually exist.

**Corroboration:** `aiChatService.mjs` already queried `FROM goals`, `FROM
client_pain_entries`, `"bodyRegion"` and `"progressPercentage"` correctly. The Coach chat
path was right all along; the context engine and debate services had drifted away from it.

## Third retraction: a bootcamp fix that fixed nothing

Mid-review I "fixed" `bootcamp_class_logs` (plural) to the real singular
`bootcamp_class_log`. **`main` already had it right.** I was editing a tree 1,229 commits
behind — the same stale-tree trap recorded in iteration 3, hit for the third time this
session. All work was moved to a worktree actually on `main` before anything was committed,
and the stale-tree edits were reverted.

**The generalizable fix is procedural: verify branch freshness BEFORE editing, not before
committing.** Three misses is a pattern, not bad luck.

## Method note — the extractor that lied

The first repo-wide sweep reported **596 of 665** table references as "not found". That was
not a finding, it was a broken extractor: the regex matched the words `FROM`/`JOIN` in
English prose and comments (`ADMIN_PASSWORD`, `Authorization`, `BOTH`, `CLI`). Scoping the
parse to strings that are actually SQL cut it to 42, of which the plausible ones were then
verified individually against the live DB. **A sweep with a 90% false-positive rate is worse
than no sweep — it buries the real signal.**

## Still open, deliberately not touched

`conversation_mutes`, `message_attachments`, `message_pins`, `message_reactions`,
`message_reports`, `message_saves` do not exist in the DB, but they are created at runtime by
`services/messagingSchemaRepository.mjs` — a self-bootstrapping schema module, not drift.
Whether that bootstrap actually runs in production is a **separate lane** (the other agent is
active in messaging/observability) and needs a judgment call, not a rename. Recorded, not
fixed. `CommunityMemberships` (model exists, table does not) is in the same bucket.
