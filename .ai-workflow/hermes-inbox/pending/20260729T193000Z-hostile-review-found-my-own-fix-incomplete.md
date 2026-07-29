---
surface: backend / coach-context / audit-method
originating_model: claude-opus-5
tier: sub-fable (working memo only — NOT for the durable learning corpus)
date_utc: 2026-07-29T19:30:00Z
linear: SWA-71
commit: 57ee7006e (main)
---

# Sean asked for a hostile review of my fix. It found the fix was incomplete.

I shipped 093072b11 with proof: live DB execution, 26/26 assertions, two clean rounds. The
proof was real and the fix was still **incomplete**. A hostile pass found a THIRD broken
query in the same file — and a worse one.

## What was missed

`profile` -> `column "age" does not exist`. `"Users"` has no `age`, no `nasmPhase`, and the
goals column is singular `fitnessGoal`. Three more sites, same bug class, same files.

**Worse than the first batch:** pain/goals degraded silently under `Promise.allSettled`. The
profile queries are **bare awaits with no .catch()**, so they throw rather than degrade —
`POST /api/ai/debate/start` was returning **500 on every request**. The debate feature was
dead, not degraded. In coachContextEngine the profile domain also gates gamification, so
session credits, points, level, tier and streak were missing from Coach context too.

## Why I missed it — the method lesson, not a motivation lesson

I verified the two queries I had a hypothesis about and stopped. The file has seven domains;
I checked two. **Rule 20 sibling sweep, failed in the same commit where I wrote about
sibling sweeps.**

The fix is NOT "look harder next time" — that is a resolution, not a method. The fix is
**enumerate the whole surface and execute every item, rather than checking the ones that
already look suspicious.** My final verifier now parses every SQL literal out of the shipped
source and runs each against the real DB. A query can no longer pass by not being looked at.

Concretely: "I fixed the bug I found" and "the file is correct" are different claims, and
proof of the first reads exactly like proof of the second. **Scope your proof to what you
actually enumerated.**

## The near-miss worth recording

Before finding the real defect I went after my own `::float` cast: Sequelize uses `:name`
for named replacements, PostgreSQL uses `::` for casts, and `::float` **contains** `:float`.
If Sequelize's parser matched it as a placeholder, every fixed query would throw. It does
not — verified through the real `sequelize.query({replacements})` path, with `CAST(... AS
float)` confirmed equivalent as a fallback.

That check mattered because **my original proof used raw `pg` with positional `$1` params —
a different code path than production.** Proving a query works via a path the app never
takes is a weak proof wearing a strong proof's clothes. Verify through the path production
actually uses.

## Also caught: my own verifier lying

The whole-surface verifier reported 1 of 19 literals failing with `syntax error at or near
"$"`. That was my extractor passing a JS `${isAdmin ? ... }` interpolation to Postgres
literally — a harness artifact, not a defect. I tested both branches of that conditional
separately: both OK. **When a sweep reports a failure, confirm the sweep before confirming
the failure** — same lesson as the 596-false-positive extractor earlier today, in the
opposite direction.

## Net

19/19 shipped SQL literals now execute against production. The regression test pins the
profile columns, so the domain nobody checked is the one that now fails loudest.

**Sean's instinct to ask for a hostile review after I had already declared two clean rounds
was correct, and my two clean rounds were not wrong — they were clean within a scope I had
drawn too narrowly.** That is the failure mode to watch: not sloppy verification, but
rigorous verification of the wrong-sized box.
