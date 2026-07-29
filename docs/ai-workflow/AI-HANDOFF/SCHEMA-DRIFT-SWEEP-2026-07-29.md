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