---
surface: backend / coach-context / schema
originating_model: claude-opus-5
tier: sub-fable (working memo only — NOT for the durable learning corpus)
date_utc: 2026-07-29T18:30:00Z
linear: SWA-71
commit: 093072b11 (main)
---

# The open question got answered, and the answer was the bad one

Iteration 5 left one item open because source could not settle it. Instead of handing Sean
the query, I ran it against the production DB. **Reading 2 was correct:** `"Goals"` and
`"PainEntries"` do not exist. Seven live queries threw every time they ran — the Coach has
been answering without pain or goal context, and the debate engine started every debate with
both enrichment domains empty. Fixed and pushed.

(`"Gamifications"` DID exist — third retraction of the sweep. Two of three hypotheses wrong
again.)

## Lesson 1 — the same design can be excellent AND be the thing hiding a bug

Yesterday's memo praised this pattern and said to copy it:

    Promise.allSettled per domain -> failure degrades to [] AND records {status:'degraded'}

I still stand behind that. It is better than a local try/catch. **And it is exactly what hid
this defect for months** — a failing domain is externally indistinguishable from an empty
one. A new client with no goals and a broken goals query look identical from outside.

Both are true at once. The correction is not "stop degrading gracefully", it is
**resilience and observability have to ship together**: degrade, but make the degradation
legible where someone will actually see it. The `dataQuality` array does this correctly for
the brief path; nothing was watching it for the Coach path.

## Lesson 2 — a test pinned to the broken string is not a test

The mocks matched `/"Goals"/` and `/PainEntries/`, so they returned fixture rows for SQL that
could never run in production. The suite was green the entire time.

**A test asserting the same wrong string the code uses does not verify the code — it
photocopies it.** This is the sibling of the "green test on unreachable code" trap from the
orphan inventory. Same failure: the test defends the code's *text* rather than its *behavior*.

## Lesson 3 — when a table name is wrong, check the columns too

The drift was two layers deep: `"Goals"`->`goals` AND `progress`->`progressPercentage`;
`"PainEntries"`->`client_pain_entries` AND `bodyPart`->`bodyRegion`. A table-name-only fix
moves the error from "relation does not exist" to "column does not exist" — still broken,
still silent. **The same drift event usually moves both.**

Also: `progressPercentage` is NUMERIC, and node-postgres returns NUMERIC as a **string**.
`::float` was required or `progress` would arrive as `"0.00"` for a field consumers treat as
a number.

## Lesson 4 (procedural, and the one I keep re-learning)

I "fixed" a bootcamp table typo that **`main` already had right** — I was editing a tree
1,229 commits behind. Third stale-tree miss this session.

**Verify branch freshness BEFORE editing, not before committing.** Three misses is a pattern,
not bad luck. All work moved to a worktree actually on main; stale edits reverted.

## Lesson 5 — a sweep with a 90% false-positive rate is worse than no sweep

My first repo-wide extractor reported 596/665 tables "missing". It was matching the words
FROM/JOIN in English prose (`ADMIN_PASSWORD`, `Authorization`, `BOTH`). Scoping the parse to
strings that are actually SQL cut it to 42; the plausible ones were then verified
individually against the live DB. **Noise that large buries the real signal** — two genuine
findings were sitting inside that list.

## What corroborated the fix

`aiChatService.mjs` already queried `FROM goals`, `FROM client_pain_entries`, `"bodyRegion"`
and `"progressPercentage"` correctly. The Coach chat path was right all along; the context
engine and debate services had drifted from it. **When one sibling in the codebase already
does it right, that is the strongest available spec.**
