# Hostile review of shipped work found 2 defects in my own fix

**Surface:** vs-claude (Opus 5) · **Date:** 2026-07-25 UTC
**Linear:** SWA-63, SWA-65 · **On main:** `15121aec2`

---

## What happened

Sean asked for a review of work already shipped to production. Reviewing my own C1 equipment fix found **two real defects in it**. Both fixed and pushed.

## Lesson 1 — a sibling sweep scoped to one structural block is not a sweep

`aiChatService.mjs` has **two** equipment queries. C1 fixed one. The second, ~200 lines away in a conditional block, had the **identical** wrong-subject defect — client id bound to a `trainerId` column — and returned zero rows for the same reason.

I swept the 21 numbered sources inside the `Promise.all` and treated that as exhaustive. **The block boundary felt like a natural scope and wasn't.** The second query was in the class-planning path whose own prompt says *"plan classes using ONLY this equipment"* — the path where the missing data mattered most.

**Rule: sweep by SYMBOL across the file, not by the structure you happened to be reading.** `grep "FROM equipment_profiles"` would have found both in one second. I grepped the block instead of the table.

This is the fourth instance in this program of a search being scoped to the shape I expected rather than the shape that exists. The pattern is now unmistakable and worth naming permanently: **my sweeps fail by under-scope, never by miscitation.**

## Lesson 2 — fixing a query that returned nothing activates every latent flaw it was hiding

Both equipment queries were **unbounded** — no LIMIT on profiles, none on items. That was harmless *only* because the broken subject made them return zero rows forever. Fixing the subject turned an always-empty query into one that pushes every profile and every item name into the prompt, on the hot path of every Coach enrichment.

So my own fix introduced a cost/latency regression that had been dormant behind the bug.

**Rule: when you make something return data for the first time, audit everything downstream of it as if it were new code — because functionally it is.** Bounds, rendering, prompt size, pagination. The code path is old; the data flowing through it is not.

Detection that worked (again): **every sibling source was bounded** (LIMIT 1×8, 10×5, 8, 5, 20) and equipment was the lone exception — the same 1-of-N uniformity signal that identified the original subject bug. Sweep for uniformity, investigate the outlier. That heuristic has now paid out three times in this program.

## Lesson 3 — make the refactor fit the guard, not the guard fit the refactor

A pre-existing contract test asserts the literal string `'resistanceType', ei."resistanceType"` to guard that the query uses the real model fields. My refactor aliased the derived table `lim` and broke it.

The tempting fix is to relax the assertion. **I aliased the derived table back to `ei` instead.** The guard's intent was legitimate and my refactor could satisfy it at zero cost. A guard test loosened to accommodate a refactor stops guarding.

That test also caught the alias slip immediately — a good argument for source-literal contract tests in a repo where the real runner cannot be installed.

**Provenance:** Opus 5 — Fable-tier per Sean's 2026-07-25 designation.
