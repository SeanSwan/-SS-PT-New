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

### CA-0 — `aiBffRoutes.mjs:192` authorization fall-through for the default role (MAJOR, cross-client exposure risk)

`backend/routes/aiBffRoutes.mjs:184-201`, `GET /api/ai-command/client-summary/:clientId`:

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

**Exposure is not yet proven, and this audit does not claim it is.** The handler
fetches through `fetchInternal(path, req, 5000)`, which forwards the *original*
`req`, so each downstream endpoint applies its own authorization to the real
caller. `Promise.allSettled` (`:211`) turns any downstream rejection into
`{ error: 'unavailable' }` rather than an error response, so a partial disclosure
renders as a normal 200. Whether another client's data is actually returned
therefore depends on the downstream guards — and at least one of them,
`painEntryController.mjs:90,132,172,259,352,453`, is the **same
`requester.role === 'client'` hand-roll**, which for a `'user'` caller is also
skipped.

Per rule 55 this needs an executed probe before any fix is prescribed: drive the
route as a `'user'`-role caller against an isolated server and record which of
the four sub-results come back populated versus `'unavailable'`. Until that probe
runs, the class is established and the blast radius is **UNVERIFIED**.

Recommended shape of the fix (to be confirmed by the probe): replace the
role-branch ladder with a single fail-closed gate, e.g. call the shared
`ensureClientAccess(req, clientId)` for **every** non-admin role, or add an
explicit `requireRole('client','user','trainer','admin')` plus the shared helper.


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

1. **CA-0 first.** Run the rule-55 probe against an isolated server as a
   `'user'`-role caller to establish the real blast radius of the
   `/api/ai-command/client-summary/:clientId` fall-through, then apply a single
   fail-closed gate. This is the highest-severity item this audit produced and it
   is a cross-client risk, not a policy nuance.
2. **CA-1** is a privacy fail-open on the default account role with a canonical
   precedent and a one-line fix — fix with a behavioural test before the next
   release candidate.
3. **CA-2** is the same one-line class in a file this audit surfaced; fix in the
   same pass.
4. **CA-3** is documentation debt; collapse the three local copies onto the
   shared export when those files are next touched.

CA-0 and CA-1 share a root cause — requester-side role checks hand-rolled instead
of using the exported helper that exists precisely to prevent them. A single
regression guard that fails when a requester-side `role === 'client'` comparison
appears in a route or controller would close this class for good; note that two
existing tests (`clientNoteRoutesPrivacy.test.mjs:28`,
`painEntryRoutesAccessGuard.test.mjs:38`) already do this per-route, which is why
notes and pain entries were fixed and photos and the AI BFF were not — the guard
was never generalised.

