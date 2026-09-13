# Shared `clientAccess` policy and caller audit

Version 1, 2026-09-13. Astra-owned audit demanded by packet [70](70-release-and-worktree-audit.md)
("Shared clientAccess helper | Astra policy/caller audit, then Luna if needed").
Read-only audit; the two fixes it produced are specified below and were **not**
applied by the audit itself except where stated. No provider, database, commit,
push or deployment authority is exercised here.

## What was audited

There are two distinct modules with this name and they must not be conflated:

| Module | Exports | Role |
|---|---|---|
| `backend/utils/clientAccess.mjs` | `ensureClientAccess`, `isClientEquivalentRole` | The **resource chokepoint**. ~21 call sites across routes, controllers and Coach approval services. |
| `backend/services/ai/contextEngine/clientAccess.mjs` | `checkClientAccess`, `parseContextClientId` | The **Coach/context gate** (conversation audience, inference boundary). Out of scope for this audit. |

## Verdict on the helper itself: SOUND

`backend/utils/clientAccess.mjs` (87 lines) was read in full.

| Property | Evidence | Assessment |
|---|---|---|
| Strict ID parsing | `parseId` (`:3-14`) accepts only safe integers > 0, or strings matching `/^[1-9]\d*$/` | Correct. Rejects `'0'`, `'01'`, `'+1'`, `' 1'`, `'1abc'`, floats, negatives, null. |
| Auth identity normalized | `parseId(req.user?.id)` (`:51`) | **Safe.** Normalization cannot smuggle a different identity: any non-canonical form yields `null` → 401. It only makes `requesterId === clientId` type-robust, which turns a silent self-access denial into a correct self-access grant. It does not widen access to another user. |
| Target must be a client | `:63-65` — `!client \|\| !isClientEquivalentRole(client.role)` → 404 | Correct. A trainer/admin ID cannot be reached through this helper. |
| Admin | `:67-69` allow | Correct. |
| Client-equivalent | `:71-76` — self only, else 403 | Correct. Uses the canonical helper. |
| Trainer | `:78-84` — requires an **active** `ClientTrainerAssignment` | Correct. |
| Anything else | `:86` → 403 | Correct, fail-closed. |
| Assignment lookup | `:31-38` — `status: 'active'`, optional row lock in the caller's transaction | Correct. |

**The "normalize authenticated IDs" concern in packet 70 is NOT a widening risk.**
The helper fails closed on every malformed input; normalization only affects the
self-comparison.

## Findings

### CA-1 — `clientPhotoRoutes.mjs:75` fails OPEN for the default role (MAJOR, privacy)

`backend/routes/clientPhotoRoutes.mjs:75`:

```js
if (req.user?.role === 'client') {
  where.visibility = ['public', 'private'];
}
```

The intent, per the comment above it, is that clients see their own photos minus
`trainer_only`. But `'user'` is the **default role minted by public
self-registration** (documented at `utils/clientAccess.mjs:16-22`), and it is
client-equivalent everywhere else. For a `'user'` account this branch is skipped,
so the `visibility` filter is never applied and the account receives its own
`trainer_only` progress photos.

`ClientPhoto.mjs:70` declares `DataTypes.ENUM('public', 'private', 'trainer_only')`,
so `trainer_only` is a real, trainer-set restriction.

Scope, stated precisely: the `where.userId = clientId` clause (`:64`) is always
applied and `ensureClientAccess` restricts client-equivalent callers to
themselves, so this is **not** a cross-user leak. It is a **policy fail-open on
the caller's own record**: a photograph a trainer deliberately withheld from
client view is served to the client anyway, for the most common account role.

**This is the un-repaired twin of a bug the repo already fixed twice.**
`backend/routes/clientNoteRoutes.mjs:72` carries the fix and the post-mortem, and
`backend/tests/api/clientNoteRoutesPrivacy.test.mjs:17-24` records it:

> "Launch audit 2026-08-04: ... `'user'` is the default role minted by public
> self-registration, so a normal member walked straight past that guard and
> received every trainer/admin note written about them ... while this green test
> advertised the opposite."

`ClientNote.mjs:75` uses the same `private | trainer_only | admin_only` shape.
`painEntryController.mjs:53` carries the same repair. So notes and pain entries
were fixed and guarded; **photos were missed.**

Sibling sweep (rule 20), command and scope recorded:
`rg -n "role === 'client'|role !== 'client'"` over `backend/` → **69 hits**,
enumerated and classified. It is not claimed that every hit is a defect: several
are inside comments, docstrings, migration notes, or are deliberate
target-is-a-client checks (`claimRoutes.mjs:82`, `sessionPackageController.mjs:44`,
`creditsController.mjs:79`, `adminController.mjs:81`) where the subject is the
*target's* stored role, not the requester's.

**The sweep found a second, more serious fail-open instance (CA-0 below).** An
earlier draft of this audit asserted `clientPhotoRoutes.mjs:75` was the only
fail-open hit. That assertion was wrong and is corrected here: the sweep list was
reviewed hit by hit, and `aiBffRoutes.mjs:192` has the IDOR shape.

Required fix (one import + one call):

```js
import { ensureClientAccess, isClientEquivalentRole } from '../utils/clientAccess.mjs';
...
if (isClientEquivalentRole(req.user?.role)) {
  where.visibility = ['public', 'private'];
}
```

Required test: a **behavioural** test driving the route as a `'user'`-role
requester and asserting the `ClientPhoto.findAll` where-clause carries
`visibility: ['public','private']`. A source-text guard alone is the weaker,
already-criticised pattern (see P64) and must not be the only proof.

### CA-0 — `aiBffRoutes.mjs:192` authorization fall-through (latent; NOT REACHABLE at the live URL)

> **CORRECTED 2026-09-13 by executed probe. Two claims in the first version of this
> section were wrong and are struck below rather than quietly edited**, because the
> correction is the useful part: a static route walk produced a wrong URL and a
> wrong severity, and only running the app settled it (rule 55).

**Wrong claim 1 — the URL.** The first version said
`GET /api/ai-command/client-summary/:clientId`. That path does not exist.
`core/routes.mjs:715` mounts `aiCommandRoutes` at `/api/ai-command`, while the
handler lives in `aiBffRoutes`, mounted at `core/routes.mjs:718` →
**`/api/admin/ai-bff/client-summary/:clientId`**. Probed: the documented path
returns **404**; the real path returns **403**.

**Wrong claim 2 — "the route has `protect` only".** True of the router *file*,
false of the *mounted URL*. `core/routes.mjs:498` mounts `adminRoutes` at
`/api/admin` **before** line 718, and `routes/adminRoutes.mjs:30-31` applies a
pathless `router.use(authenticateToken)` + `router.use(authorizeAdmin)`.
`authorizeAdmin` is `adminOnly` (`middleware/auth.mjs:176`), which 403s every
non-admin at `middleware/authMiddleware.mjs:436-451`. A `'user'` caller is
stopped upstream and **never reaches the aiBff handler**.

**Wrong claim 3 — the failure shape.** `Promise.allSettled` does not mask
failures as `{error:'unavailable'}`. `fetchInternal` returns
`{error:'HTTP 403', status:403}` for a non-ok response (`aiBffRoutes.mjs:77-79`);
`'unavailable'` appears only when `fetch` itself throws (line 88).

What remains true is the code-level shape. `backend/routes/aiBffRoutes.mjs:184-201`
has no role middleware of its own and only two role branches:

```js
router.get('/client-summary/:clientId', protect, async (req, res) => {   // :184  protect ONLY
  ...
  if (req.user.role === 'client' && req.user.id !== clientId) {          // :192
    return res.status(403).json({ error: 'Access denied' });
  }
  if (req.user.role === 'trainer') {                                     // :195
    const { ensureClientAccess } = await import('../utils/clientAccess.mjs');
    ...
  }
```

There is no `requireRole`/`authorize` middleware on the route, and only two role
branches. For a `'user'`-role account — again the default self-registration role
— **both** branches are skipped and the handler falls straight through to fetch
the requested client's data (`:211-216`: profile, active pain entries, latest
measurements, workout stats) and return it (`:227`). The `'client'` branch is
itself type-fragile: `req.user.id !== clientId` compares a session id against a
`parsePositiveId` number, so a string session id makes the comparison always
true and 403s every client instead (fail-closed, but still wrong).

**PROBED — blast radius NOT demonstrated.** The rule-55 probe was executed: the
real routers assembled in production mount order, real loopback HTTP through the
same transport `fetchInternal` uses, a `'user'` caller (`id: "901"`, a **string**,
mirroring `authMiddleware.mjs:357`) against client `902`, with `DATABASE_URL`
deleted, sequelize neutered and non-loopback sockets rejected.

| Scenario | Observed |
|---|---|
| Production mount chain, mounted URL | `403 {"success":false,"message":"Access denied: Admin only"}` — blocked upstream by `adminRoutes`; **no sub-result ever requested** |
| Handler reached under an ungated prefix, pre-fix | `status 200`, but **zero of four** sub-results populated: profile `HTTP 403`, activePain `HTTP 404`, latestMeasurements `HTTP 404`, recentWorkouts `HTTP 403` |

The downstream guards hold on their own: profile and recentWorkouts are refused by
`adminClientRoutes`' `authorize(['admin'])`, and activePain/latestMeasurements by
`verifyClientAccessByUserId` (`middleware/verifyClientAccess.mjs:91-93`, which
already handles `'user'`). **No cross-client data was returned in any
configuration the probe could construct.**

So the real harm is narrower than the first version claimed: a misleading **200
"all sources unavailable" envelope where a 403 belongs**, plus a latent fail-open
that would become exploitable if any downstream guard were later relaxed. It is
**not** an observed exposure, and the endpoint additionally has **zero consumers**
anywhere in the repo (backend services or frontend) — `client-summary` appears
nowhere else, while the sibling `command-center` is the only AI-BFF path the
frontend references (`services/ai/commandRegistry/dashboardCommands.mjs:22`).

**Fixed regardless, as defence-in-depth** — a latent fail-open one relaxed guard
away from being reachable is worth closing. The fix that shipped calls
`ensureClientAccess(req, clientId)` for **every non-admin role**, keeping an
explicit admin short-circuit.

**Fix-shape trap, recorded because it cost a regression.** The first
implementation used this document's other wording — the shared helper for
**every** role including admin — and **regressed**
`tests/api/aiBffClientSummaryPathTruth.test.mjs` ("does not embed internal
upstream errors…", expected 200, got 500), because `ensureClientAccess` reads the
target `User` row *before* reaching its own admin branch, so admin lost its
DB-free path. **The admin short-circuit is load-bearing; do not remove it.** Both
wordings appeared in this document, which is exactly why the probe had to settle
it rather than the prose.


### CA-2 — `profileController.mjs:598` fails CLOSED against its own middleware (MAJOR, functionality)

`backend/controllers/profileController.mjs:598`:

```js
if (req.user.role !== 'client') { /* 403 */ }
```

The route is mounted `protect → clientOnly → rateLimiter → updateClientProfile`
(`clientDashboardRoutes.mjs:206-212`). `clientOnly` (`authMiddleware.mjs:519-521`)
**admits** `'client'`, `'user'` and `'admin'`. The controller then rejects
everything that is not exactly `'client'`.

Net effect: a `'user'`-role account — the default self-registration role, and
client-equivalent per the canonical helper — passes the middleware and is then
403'd by the controller, so it **cannot update its own profile** at `PATCH
/api/client/profile`. The middleware and the controller disagree about what
"client-only" means.

`'admin'` is also rejected by the controller; since admin is not
client-equivalent, switching the check to `isClientEquivalentRole` preserves that
rejection while admitting `'user'`. That is the consistent minimal fix, and it
matches the middleware's stated intent.

Not fixed by this audit. Reachability is proven by the two file reads above; the
end-to-end 403 was **not** reproduced against a running server, so the
user-visible symptom is inferred from the code path rather than observed.

### CA-3 — `scheduleController.mjs:20` re-derives the helper locally (MINOR, drift risk)

`backend/controllers/scheduleController.mjs:20` declares its own
`const isClientEquivalentRole = (role) => role === 'client' || role === 'user';`
with a comment saying it "Mirrors `isClientEquivalentRole` in
utils/clientAccess.mjs". `onboardingController.mjs:26` and
`workoutBuilderRoutes.mjs:53` do the same under different names
(`isClientSelfOnboardingRole`, `isClientSelfServiceRole`).

These currently agree, so there is no live defect. But the whole reason the
canonical helper is exported is that hand-rolled copies drift — which is exactly
how CA-1 happened. Recommend collapsing them onto the shared export when those
files are next touched. **Not** a fix-now item; recorded so it is not
rediscovered later.

## Non-findings (checked, sound)

- `clientPhotoRoutes.mjs` DELETE scopes `where: { id: photoId, userId: clientId }`
  (`:184-186`), so a caller cannot delete another client's photo even with a
  guessed id. `photoId` is not integer-parsed, but it is bound as a Sequelize
  parameter and simply fails to match; no injection path.
- `clientPhotoRoutes.mjs` POST binds the client-supplied `url`/`storageKey` to
  the authorized client via `validatePhotoRecord` (`:126-136`), closing the
  cross-tenant R2-object / external-URL class recorded as SWA-129.
- `clientPhotoRoutes.mjs` GET pagination is bounded (`parseOptionalInteger`,
  min 1 / max 100) and rejects malformed input with 400 (`:25-32, 56-60`).
- Both photo routes surface a constant `internal_error` rather than raw error
  text (`:17-23`), matching the disclosure rule the notes test also pins.
- No raw SQL and no interpolated identifiers in either audited route.

## Limits of this audit

- Static analysis plus the recorded 69-hit sibling sweep. No live database probe
  and no running-server request were made for this audit.
- `backend/services/ai/contextEngine/clientAccess.mjs` (the Coach gate) was not
  audited here; it is covered by plans [52](52-coach-read-authorization.md) and
  [55](55-coach-selection-and-transport.md).
- The 69-hit sweep classification covers requester-side checks; a target-side
  hand-roll that is genuinely wrong would need a per-route data-flow read and is
  not claimed to be excluded.

## Next

**All three defects (CA-0, CA-1, CA-2) are now FIXED and covered by behavioural
tests**, each proven RED → GREEN → mutation-RED:

| Defect | Fix | Evidence |
|---|---|---|
| CA-1 | `clientPhotoRoutes.mjs` uses `isClientEquivalentRole(req.user?.role)` | 2 failed → 6 passed; mutation reverts it to 2 failed |
| CA-2 | `profileController.mjs` uses `!isClientEquivalentRole(req.user.role)` | 2 failed → 5 passed; mutation reverts it to 2 failed |
| CA-0 | fail-closed non-admin gate in `aiBffRoutes.mjs`, admin short-circuit preserved | 2 failed → 8 passed; mutation reverts it to 4 failed |

Combined: **3 files, 19 tests passed, exit 0**. Targeted regression across 13
related files: **129 passed, exit 0**. Full-suite A/B with the fixes swapped in and
out under the same concurrent load: pristine `20 failed / 10483 passed` → fixed
`13 failed / 10490 passed`, with **no test failing only because of these fixes**.

Remaining, in priority order:

1. **CA-1 is the one with real user impact.** It is a privacy fail-open on the
   default account role and it is reachable without any relaxed guard. Its
   real-world exposure assumes at least one `'user'`-role account owns
   `trainer_only` rows — **not verified against real data**.
2. **CA-0 needs its reachability claim kept narrow.** Do not re-inflate it: the
   live URL is admin-gated and the endpoint has no consumers. Closing it was
   defence-in-depth.
3. **CA-3** is documentation debt; collapse the three local copies onto the shared
   export when those files are next touched.

CA-0 and CA-1 share a root cause — requester-side role checks hand-rolled instead
of using the exported helper that exists precisely to prevent them. A single
regression guard that fails when a requester-side `role === 'client'` comparison
appears in a route or controller would close this class for good. Two existing
tests already do this per-route (`clientNoteRoutesPrivacy.test.mjs:28`,
`painEntryRoutesAccessGuard.test.mjs:38`) — which is why notes and pain entries
were fixed and photos and the AI BFF were not: the guard was never generalised.

## Test-baseline finding (not fixed here)

`backend/tests/known-failing-baseline.json` records 7 known-failing files. The
concurrent full-suite A/B observed **12** failing files, of which 5 are absent from
that baseline: `clientPhotoUploadAuthzExecution`, `historyBackfill`,
`phase1cXpIntegration`, `workoutPrDetection`, `unit/physicalConfirmChannelSplit`.
Separately, `tests/api/clientPhotoUploadAuthzExecution.test.mjs:158` is
**pre-existing RED at pristine HEAD** — `assertAssignmentOrAdmin`
(`middleware/verifyClientAccess.mjs:86`) now returns a Number where the test pins a
String. The baseline file understates reality and should be reconciled before it
is used to judge any future slice.


