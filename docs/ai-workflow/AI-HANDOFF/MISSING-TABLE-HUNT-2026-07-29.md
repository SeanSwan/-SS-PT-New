# Missing-Table Hunt — 2026-07-29 (cleanup loop iteration 7)

- **Linear:** SWA-71 · **Lane:** the two defect classes Sean flagged (lying migration ledger; model → nonexistent table)
- **Asked for:** up to 40 fixes, stop early if nothing is safely fixable.
- **Result: 1 live production defect PROVEN by HTTP probe, 8 real-but-impact-unproven, and ONE ROOT CAUSE behind all of them.**
- **Fixes applied: ZERO.** Not because the well was dry — because every item needs a decision that is not mine. Detail below.

---

## The root cause, which explains all nine at once

`backend/core/startup.mjs:198-210`:

```js
// Development database sync (NEVER in production)
if (!isProduction && process.env.AUTO_SYNC === 'true') {
  await sequelize.sync({ alter: true });
} else if (!shouldRunProductionDatabaseSync()) {
  logger.info('Database repair sync skipped outside production; set STARTUP_DATABASE_REPAIR=true …');
} else {
  const syncResult = await syncDatabaseSafely();   // production path
}
```

Table creation in production is **gated behind `STARTUP_DATABASE_REPAIR=true`**. So any model
registered without a corresponding migration **never gets a table** — silently, forever. That is
the mechanism behind `user_follows` and eight siblings.

This is not a bug in the gate. A gated production schema mutation is *correct* design. The bug is
that models were added on the assumption sync would create them, while migrations were the actual
source of truth.

---

## PROVEN live defect (1) — live HTTP probe against production

```
/api/health        HTTP 200     <- control, proves the probe works
/api/packages      HTTP 500     <- BROKEN
/api/olympics      HTTP 404
/api/live-streams  HTTP 401
/api/creators      HTTP 401
```

**`GET /api/packages` returns 500 to unauthenticated callers.** Mounted at
`core/routes.mjs:327`; `routes/packageRoutes.mjs:58` defines `router.get('/')` with no `protect`.
The `Package` model declares `tableName: 'packages'`, and **`packages` does not exist**.

Two mitigating facts, both verified:
- The error body is clean — `{"success":false,"message":"Server error fetching packages"}`. **No
  schema, stack, or DB internals leak.** Good error hygiene; not a security finding.
- **No frontend caller exists.** `grep` across `frontend/src` for `/api/packages` returns nothing.
  The storefront uses `StorefrontItem`/`storefront_items` (CLAUDE.md). `Package` looks superseded.

So this is a **dead, publicly reachable route that 500s** — Rule 27 "legacy" classification.

## REAL but impact-unproven (8)

Models called at runtime (`.findOne`/`.create`/etc.) whose tables are absent, reached via
**mounted** routes. All sit behind auth (`401`) or have no matching bare handler, so the
user-facing consequence could **not** be proven from outside without credentials.

| Model | Missing table | Runtime call site | Route |
|---|---|---|---|
| `UserFollow` | `user_follows` | `controllers/socialController.mjs` | `/followers`, `/following`, `/follow-stats` |
| `ProgressData` | `progress_data` | `controllers/progressController.mjs`, `services/gamificationDashboardService.mjs` | `gamificationV1Routes` |
| `MarketingCalendarItem` | `marketing_calendar_items` | `services/marketingReadinessService.mjs` | `/api/admin/marketing-readiness` |
| `SessionPackage` | `session_packages` | `services/galleryVipFulfillmentService.mjs` | `galleryRoutes` |
| `LiveStream` | `LiveStreams` | `routes/liveStreamRoutes.mjs` | `/api/live-streams` (401) |
| `CreatorProfile` | `CreatorProfiles` | `routes/creatorEconomyRoutes.mjs` | `/api/creators` (401) |
| `VideoSession` | `video_sessions` | `routes/videoSessionRoutes.mjs` | `/api/video-sessions` |
| `OlympicEvent` | `olympic_events` | `routes/olympicRoutes.mjs` | `/api/olympics` |

**Inventory, not defect count.** A further ~33 models point at absent tables but have **zero
runtime call sites** — `models/social/enhanced/` (LiveStreaming, CreatorEconomy, SocialCommerce,
SocialAnalytics, AIRecommendations, EnhancedNotification). That is scaffolding for unbuilt
features and is **harmless**. Reporting 42 "defects" would have been the third ~95%-noise sweep of
the day; the runtime-call-site filter cut 42 → 9.

## RETRACTED before shipping

**`/api/olympics` 404 is not a bug.** I flagged it as "mounted but 404". `olympicRoutes.mjs`
defines `/events`, `/submit`, `/ghosts/:eventType`, `/leaderboard/:eventType`, `/recovery-status`
and `/recovery-day` — and **no `GET /`**. A 404 on the bare mount point is correct behaviour.

## NOT REPORTED — the "lying ledger" sweep was contaminated

The Class-B sweep (migrations recorded APPLIED whose `createTable` never took) returned 16 hits.
**They are not trustworthy and are deliberately excluded.** My column extractor read a fixed
6000-char window after each `createTable(`, which **bleeds into the next `createTable` block in
the same file**. Proof it is broken: it reported the `users` table as missing `name, description,
price, category, displayOrder, includedFeatures` — those are *storefront* columns, scraped from a
different block.

The `exercise_library` instance from iteration 6 stands, because it was established via
`SequelizeMeta` plus the live schema, not via this extractor. Generalising it needs a
**brace-balanced** parser. Recorded as an open lead, not a finding.

---

## Why ZERO fixes, against a request for up to 40

Every one of the nine needs a decision I should not make alone:

1. **Write migrations creating the tables** — a schema change per table. For several
   (`LiveStreams`, `CreatorProfiles`) the feature looks unbuilt, so creating tables would
   materialise a half-built subsystem rather than fix anything.
2. **Set `STARTUP_DATABASE_REPAIR=true` in production** — mutates the production schema at boot.
   Sean-only, and exactly the class of action that requires explicit approval.
3. **Unmount the dead routes** — a product call. `/api/packages` is the best-evidenced candidate
   (public, 500ing, no frontend caller, superseded by `StorefrontItem`), but I only grepped
   `frontend/src`; scripts, tests and any mobile client were not checked. Rule 34 forbids calling
   that "safe to delete" on partial evidence.

**There were not 40 safely-fixable defects in this class.** Per the instruction, stop rather than
manufacture fixes. Nine well-evidenced findings plus one root cause is the deliverable.

**Recommended order when Sean decides:** `/api/packages` first (the only proven live 500, and the
cheapest call — it is dead either way), then `user_follows` (real user-facing feature, model
already fully specified so the migration is mechanical), then triage
LiveStreams / CreatorProfiles / VideoSessions as "build or unmount".

## Method note

Three filters turned a 42-row scare into 9 findings: table-exists → runtime-call-site →
route-mount. Each filter cut noise the previous one could not see, and the live HTTP probe then cut
**9 proven → 1**. Every layer of evidence narrowed the claim rather than widening it, which is the
direction worth trusting.