# Coach/Debate context schema-drift — ready-to-apply patch (for Codex)

**Owner:** Codex (this lives in your actively-edited AI-coach lane — Sean assigned the fix to you to avoid a
merge war on injury-safety code; I (Claude) verified + wrote the exact SQL, you apply it).
**Severity:** HIGH (data-truth + injury safety). **Source:** hostile survey 2026-07-22, Kimi-guided, verified
against the correct sibling `services/aiChatService.mjs`.

## The bug
Three raw queries in the coach/debate context layer reference columns/tables that **do not exist**. Each is
wrapped in `safeQuery`/`.catch` → the query throws → the domain **degrades silently to `[]`**. Net effect:
the AI coach + debate + trainer day-sheet run **BLIND on client profile, pain/injury, and goals** — it
recommends exercises with zero injury awareness. Unit tests mock the queries, so only a real-DB probe catches it.

## Drift table (verified)
| caller | real object | fix |
|---|---|---|
| `age` (SELECT) | `dateOfBirth` | select `dateOfBirth`, derive age |
| `"nasmPhase"` | *(no such column on Users)* | drop it (derive downstream if needed; don't invent columns) |
| `"fitnessGoals"` | `fitnessGoal` (singular) | rename |
| `FROM "PainEntries"` | `client_pain_entries` | rename table |
| `"bodyPart"` (pain) | `bodyRegion` | select `bodyRegion` **AS "bodyPart"** (keep alias → downstream untouched) |
| `FROM "Goals"` | `goals` (lowercase) | unquote |

## The 3 files (all mounted/called — verified)
- `backend/services/ai/contextEngine/coachContextEngine.mjs` (DOMAIN_LOADERS: profile / pain / goals; also the trainer day-sheet pain flags)
- `backend/services/ai/debate/debateClientContextService.mjs`
- `backend/routes/aiDebateRoutes.mjs` (mounted `/api/ai/debate`)

## Corrected SQL (apply the same three replacements in ALL THREE files)

**profile:**
```sql
SELECT id, "firstName", "lastName",
       "dateOfBirth",
       EXTRACT(YEAR FROM age("dateOfBirth"))::int AS age,
       gender, "trainingExperience", "fitnessGoal",
       "clientSource", "isActive",
       "availableSessions", points, level, tier, "streakDays", "totalWorkouts"
FROM "Users"
WHERE id = :clientId
LIMIT 1
```
(In `aiDebateRoutes` keep its existing extra `AND "isActive" = true` guard if present.)

**pain** (keep `AS "bodyPart"` so downstream de-identification/consumers are untouched):
```sql
SELECT "bodyRegion" AS "bodyPart", "painLevel" as level, "isActive"
FROM client_pain_entries
WHERE "userId" = :clientId AND "isActive" = true
ORDER BY "createdAt" DESC
LIMIT 10
```

**goals:**
```sql
SELECT title, description, progress, status
FROM goals
WHERE "userId" = :clientId AND status = 'active'
LIMIT 10
```

These mirror `services/aiChatService.mjs` exactly (the correct sibling: `"fitnessGoal"`/`"dateOfBirth"`,
`FROM client_pain_entries` with `"bodyRegion"`) — that file was updated when the schema normalized; these
three were not (Rule 20 sibling-sweep miss).

## Make the pain failure LOUD (injury-safety — silent was the whole problem)
In `coachContextEngine` pain loader (and its trainer day-sheet pain flags), on error log a **structured,
PII-free** warning (clientId is a numeric FK — acceptable; no row data), then still degrade to `[]`:
```js
} catch (err) {
  logger.warn(`[coachContext] PAIN domain load failed code=${err?.original?.code || err.name}`);
  return [];
}
```

## Before you merge (hard gates)
1. **Schema-verify against staging/prod-shaped DB** (don't assume):
   `SELECT column_name FROM information_schema.columns WHERE table_name='Users';`
   `SELECT to_regclass('"PainEntries"'), to_regclass('"Goals"'), to_regclass('client_pain_entries'), to_regclass('goals');`
   (expect `"PainEntries"`/`"Goals"` → NULL; `age`/`nasmPhase`/`fitnessGoals` absent from Users.)
2. **Rule 20 sweep for a 4th/5th sibling** across all of backend:
   `rg -n '"PainEntries"|"nasmPhase"|"fitnessGoals"|FROM "Goals"|SELECT[^;]* age,' backend --glob '!**/*.test.*' --glob '!**/knowledge-graph.json'`

## Regression test to add
`backend/tests/ai/contextEngine.schema.test.mjs` — integration against a test DB: seed a user with
`dateOfBirth` + one active `client_pain_entries` row + one active `goals` row; call the coach context builder
and the debate context service; assert `profile.age` is a number, `pain.length === 1` with `bodyPart` present,
`goals.length === 1`. This fails on any future drift — that's the point. (Plus a cheap source-truth test
grepping the 3 files for the banned identifiers `"PainEntries"`, `"nasmPhase"`, `"fitnessGoals"`, `FROM "Goals"`.)

## Apply as ONE focused PR (the 3 files + the test). Ping in the coordination lane when landed so I can drop this handoff.
