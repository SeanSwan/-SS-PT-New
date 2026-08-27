---
decision: "Extract the WIP branch's stranded features onto main one at a time, verified against what main actually has now. Location is the recommended first slice."
status: open
supersedes: none
---

# WIP branch extraction — inventory and separability (2026-08-27)

**Branch:** `wip/comms-notifications-2026-07-05` · **Base:** `origin/main` @ `fd6f5ebb8` · **Linear:** SWA-219
**Author:** Opus 5 · **Nothing was moved, merged, or ported producing this document.**

## 1. Corrections to my own earlier numbers

Stated in this workstream and wrong:

| I said | Actually | Why I was wrong |
|---|---|---|
| "488 commits ahead" | **505** | my own commits kept landing; I quoted a stale count instead of re-deriving |
| "main already has essentially all of it" | **false** — see §3 | I grepped commit messages for features I happened to notice in a tooling-heavy list, never for the branch's namesake content |
| "333 branch-only code files" | **342** | my extension filter omitted `.cjs`, which in this repo is *exactly* the migration extension — it hid all 9 migrations |
| "13 of 16 consult scripts ungated" | **10 of 13** | carried a count forward from a different tree state |

The pattern in three of those four is the same: **a filter or sample narrower than the thing being measured, reported as if complete.** It is the identical failure class as the original incident this whole workstream exists to fix.

## 2. Divergence (re-derived 2026-08-27)

```
behind origin/main : 2298      ahead : 505      span : 2026-07-05 → 2026-08-27
commits            : 259 docs · 153 fix · 66 feat · 13 chore · 6 test · 4 audit
code files touched : 1062
  branch-only new  :  342   ← the stranded work
  also on main     :  720
    of which main ALSO changed since the fork : 649   ← the merge cost
```

**649 contested code files (346 of them `frontend/src`) is why a whole-branch merge is the wrong instrument.** Extraction avoids paying that cost for work that is mostly redundant anyway.

## 3. What is genuinely stranded

Main has `messaging` (28 files). Main has **zero** files for any of these:

| Feature | Backend | Migration | On main |
|---|---|---|---|
| **Location / gym-ops spine (SWA-74)** | `models/Location.mjs`, `routes/locationRoutes.mjs`, `controllers/locationController.mjs`, `controllers/locationPayload.mjs` | `20260728100000-create-locations.cjs` | none |
| Notification delivery + preferences | `NotificationDelivery.mjs`, `notificationDeliveryService`, `notificationDeliveryRetryWorker`, `notificationPayloadService`, `notificationPreferenceService`, `notificationPreferencesController` | `20260630050000`, `20260630060000` | none |
| Communication audit | `CommunicationAuditLog.mjs`, 11 `communications/*` files | `20260630070000` | none |
| Trainer onboarding | `TrainerApplication.mjs`, `trainerOnboardingController`, `trainerOnboardingRoutes`, `trainerContract` | `20260723090000` | none |
| Price-change logging | `PriceChangeLog.mjs` | `20260723100000` | none |
| Messaging extensions | `messaging/{action,attachment,safety}Controller`, `messagingSafetyService` | `20260630040000`, `20260630080000`, `20260701083000` | main has base messaging only |

Plus 8 `bootcamp/*` services, 49 backend tests, 120 new `frontend/src` files.

## 4. Migrations — read before porting anything

**All 9 forward migrations are additive.** Every `dropTable` / `removeColumn` occurrence is inside a `down:` rollback (verified per file, e.g. `create-locations.cjs` — `down:` begins line 75; the forward path is `createTable('locations')` + `addColumn('sessions','locationId')` + `addIndex`).

**But additive is not consequence-free.** Porting any of these features to main means the migration runs against **production** on the next deploy. `create-locations` also alters the existing `sessions` table (adds a nullable `locationId` FK with `onDelete: SET NULL`). That is a schema change on a live table and wants Sean's explicit go, not an inference from "extraction approved".

## 5. Separability — Location, checked properly

Recommended first extraction because its dependency surface is the smallest, and every dependency was verified present on `origin/main`:

| Needs | On main |
|---|---|
| `backend/database.mjs` | present |
| `backend/models/Session.mjs` | present |
| `backend/utils/logger.mjs` | present |
| `backend/middleware/authMiddleware.mjs` → `protect`, `adminOnly` | present (`:274`, `:436`) |

**Wiring required in contested files** (small, surgical, not a reconciliation):
- `backend/core/routes.mjs` — 2 lines (import + `app.use('/api/locations', locationRoutes)`)
- `backend/models/index.mjs` — 1 line (`getLocation`)
- `backend/models/associations.mjs` — 4 touch points, incl. `Session.belongsTo(Location, { foreignKey: 'locationId', as: 'facility' })`

Ships with `backend/tests/unit/locationController.test.mjs`.

**Not verified yet:** whether the 120 branch-only `frontend/src` files include a Location UI, and whether the backend is useful without it. The API can land independently; that is a product call.

## 6. Recommended sequence

1. **Location (SWA-74)** — smallest verified-separable cluster, own PR.
2. **Trainer onboarding** — self-contained model + controller + routes, one migration.
3. **Price-change logging** — single model, single migration.
4. **Notification delivery/preferences** — larger (6 backend files, 2 migrations, a retry worker).
5. **Communication audit + messaging extensions** — largest; overlaps main's existing messaging, so needs the same "what does main already have" check that caught the redactor duplication.

Each: branch off current `origin/main` → port → verify deps → run tests → own PR. Never a bulk merge.

## 7. Standing check for every slice

Before porting any cluster, confirm main has not independently built it. That check is what stopped this workstream shipping a *downgrade* of main's egress redactor. It costs one `git ls-tree`/`git show` and it has already paid for itself once.
