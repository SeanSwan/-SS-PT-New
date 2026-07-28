# Backend Route Shadow Audit — 2026-07-28

- **Linear:** SWA-71 · **Scope:** `backend/routes/` mount topology only
- **Verdict:** no dead routes; ONE retired-but-still-mounted router; no live security hole
- **Nothing was deleted.** Everything below is Rule 77 Tier 2 — evidence and a proposal.

---

## Headline: there are ZERO dead routes

186 route files, all reachable. An initial sweep flagged 22 as "unmounted", and **every one was a
false positive** — they are mounted through a *second* aggregator (`routes/api.mjs`) or imported as
helpers/handlers by a sibling route file. Two of the false positives were `healthStatus.mjs` (a pure
module deliberately placed beside its route) and the `workoutPlanPdf*Handler.mjs` family.

> **Method note for the next auditor:** "not referenced in `core/routes.mjs`" is NOT the dead-route
> signal in this repo, because there are **two** aggregators. The correct test is *zero importers
> anywhere*. Using the naive test produces 22 confident, wrong findings.

## The mount topology (know this before touching route order)

```
core/routes.mjs   188 mounts   app.use('/api/<specific>', …)   lines ~290-790
routes/api.mjs     18 mounts   router.use('/<name>', …)
                               mounted LAST:  app.use('/api', apiRoutes)   core/routes.mjs:793
```

`apiRoutes` is a **fallback aggregator**. Express matches in registration order and a
non-matching `app.use` calls `next()`, so `api.mjs` only receives requests that none of the 188
earlier mounts handled. Ten base paths appear in both: `/api/admin`, `/api/client-progress`,
`/api/contact`, `/api/exercises`, `/api/notifications`, `/api/orientation`,
`/api/session-packages`, `/api/sessions`, `/api/v2`, `/api/workouts`.

That layering is legitimate. The problem is what is hiding inside it.

---

## FINDING — a router the code says was REMOVED is still mounted

`core/routes.mjs:310` states:

```js
// REMOVED: app.use('/api/sessions', sessionRoutes); - replaced by unified sessionsRoutes below
```

The direct mount was indeed removed. But `routes/sessionRoutes.mjs` — **55 endpoints** — is still
imported and mounted at `routes/api.mjs:26`, and therefore still served through the line-793
fallback. The "unified" replacement is a **different file**, `routes/sessions.mjs`, mounted at
`core/routes.mjs:384`.

So the comment describes an outcome the code did not achieve. That is a Rule 75 prose-vs-code
mismatch on top of a Rule 27 competing surface.

### Five endpoints exist ONLY in the retired router

| Endpoint | Guard |
|---|---|
| `POST /api/sessions/allocate-from-order` | `protect, adminOnly` |
| `POST /api/sessions/add-to-user` | `protect, adminOnly` |
| `GET /api/sessions/user-summary/:userId` | `protect, adminOnly` |
| `GET /api/sessions/allocation-health` | `protect, adminOnly` |
| `GET /api/sessions/test` | **none** |

Two of these grant or allocate training sessions — money-adjacent writes.

### Severity: LATENT, not live — and the reason matters

Probed against production:

```
GET /api/sessions/test  ->  401  {"success":false,"message":"Not authorized, no token"}
```

It is **not** exposed. The unified `sessions.mjs` mounts first at line 384 with a blanket auth
guard, so it claims `/test` and rejects the request before the retired router is ever consulted.

**But the protection is mount ORDER, not the endpoint's own guard.** `GET /test` carries no
`protect`. It is safe today only because something registered earlier happens to guard the same
path. Reorder the mounts, remove the unified router's blanket guard, or move `apiRoutes` earlier,
and an unauthenticated endpoint becomes publicly reachable — and it returns internal service-health
data.

Depending on registration order for an authorization outcome is the fragile kind of safe.

---

## Proposal (NOT executed — needs Sean's approval, and not on launch night)

1. **Decide whether `sessionRoutes.mjs` is retired or not.** The comment and the mount disagree; one
   of them must change. If retired, unmount it from `routes/api.mjs:26` — but first migrate the four
   admin endpoints that exist nowhere else, or they disappear with it.
2. **Delete `GET /api/sessions/test`** regardless of the above. A guardless endpoint returning
   service-health data has no business in production, and its safety is currently accidental.
3. **Add a mount-order regression test** asserting that `/api/sessions/test` requires auth, so the
   protection stops being invisible and starts being enforced.

Sequenced deliberately: removing 55 endpoints is not a drive-by, and four of them are the only
implementation of admin session-allocation functionality.

---

## Also verified clean in this pass

- **Zero dead route files** — all 186 reachable.
- The four admin-only endpoints unique to the retired router are correctly `protect, adminOnly`.
- The fallback-aggregator pattern itself is sound; it is the retired router inside it that is the issue.
