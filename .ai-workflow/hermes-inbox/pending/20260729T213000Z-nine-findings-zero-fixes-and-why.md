---
surface: backend / schema / audit-method
originating_model: claude-opus-5
tier: sub-fable (working memo only — NOT for the durable learning corpus)
date_utc: 2026-07-29T21:30:00Z
linear: SWA-71
---

# Asked for up to 40 fixes. Shipped zero, and that was the right answer.

Sean asked me to hunt the two defect classes from iteration 6 and fix up to 40, stopping early if
nothing was safely fixable. I found **9 real findings and one root cause**, and fixed **none**.

## The root cause behind all nine

`backend/core/startup.mjs:198-210` — production table creation is **gated behind
`STARTUP_DATABASE_REPAIR=true`**. `sequelize.sync()` only runs when `!isProduction && AUTO_SYNC`.
So **any model registered without a migration never gets a table** — silently, forever.

The gate is correct design. The bug is that models were added assuming sync would create them,
while migrations were the real source of truth. **One mechanism, nine symptoms** — worth more than
nine separately-filed tickets.

## Why zero fixes

Every item needed one of: write a migration (schema change), flip a production env var (mutates
prod schema at boot — Sean-only), or unmount a dead route (product call). **There were not 40
safely-fixable defects in this class, so I stopped instead of manufacturing them.**

The strongest temptation was `/api/packages`: public, 500ing, no frontend caller, superseded by
`StorefrontItem`. Unmounting it looks obviously right — but I only grepped `frontend/src`. Scripts,
tests and any mobile client went unchecked, and Rule 34 forbids "safe to delete" on partial
evidence. **The fix I was most confident about is the one where my evidence was thinnest.**

## The filter chain is the transferable part

The raw sweep said **42 models point at nonexistent tables**. Reporting that would have been my
third ~95%-noise sweep of the day. Three filters, each cutting noise the previous could not see:

    42  models whose tableName is absent from the DB
     9  ...that are actually CALLED at runtime (.findOne/.create/...)   <- 33 were unbuilt scaffolding
     1  ...that a live HTTP probe proves broken from outside            <- 8 sit behind auth (401)

`/api/packages` -> **HTTP 500** against production, with `/api/health` -> 200 as the control.

**Every layer of evidence narrowed the claim instead of widening it. That is the direction to
trust.** A sweep that keeps growing as you verify it is measuring your harness, not the system.

## Two retractions caught before shipping

1. **`/api/olympics` 404 is not a bug.** I flagged "mounted but 404"; the router simply defines no
   `GET /` (only `/events`, `/submit`, `/ghosts/:eventType`, ...). 404 on the bare mount is
   correct.
2. **The "lying ledger" sweep was contaminated and is excluded.** 16 hits, untrustworthy: my
   column extractor read a fixed 6000-char window after each `createTable(`, bleeding into the
   next block. Proof it was broken — it reported `users` missing `name, description, price,
   category`, which are *storefront* columns from a different block. The iteration-6
   `exercise_library` case still stands because it came from `SequelizeMeta` + live schema, not
   this extractor.

Generalising the ledger check needs a brace-balanced parser. Left as an open lead rather than
shipped noisy.

## The judgment worth reusing

A public endpoint returning 500 also raises a leak question, so I checked the body:
`{"success":false,"message":"Server error fetching packages"}` — clean, no schema or stack. **Good
error hygiene turned a suspected security finding into a non-finding.** Check the body before
escalating a 500.

**And: "fix up to N" is a ceiling, not a quota.** Nine well-evidenced findings plus a single root
cause beats forty edits I could not defend.
