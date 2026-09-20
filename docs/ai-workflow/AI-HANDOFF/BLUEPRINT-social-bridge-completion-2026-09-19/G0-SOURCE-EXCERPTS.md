# G0 — SOURCE EXCERPTS (harvested, verbatim)

**Date:** 2026-09-19
**Closes:** Gate G0 from `VERIFICATION-NOTES.md` Part 3, and Astra's hostile-review finding #1.

Astra Pro correctly refused to write `file:line`-cited findings because the consult packet supplied
file *names* and *reported results* but no **source**. This document is the missing half: the six
excerpts a builder needs, read out of the repo. Everything below is quoted from source, not recalled.

**One G0 question is now definitively answered, and it invalidates part of Astra's own proposed fix —
see G0-5.**

---

## G0-1 — The exact `spotlight.v1` request body and response

`backend/routes/bridge/bridgeIngestRoutes.mjs`

**Own body parser — the bridge path must stay out of the global JSON parser:**

```js
export const SPOTLIGHT_MAX_HEADLINE = 80;
export const SPOTLIGHT_MAX_DEK = 200;
export const SPOTLIGHT_MAX_CURATOR_NOTE = 140;

export const spotlightJsonParser = express.json({
  limit: '256kb',
  verify: (req, _res, buf) => { req.rawBody = Buffer.from(buf); },
});
```

**Required fields** (`:50-62`):

```js
export const validateSpotlightPayload = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, reason: 'Body must be a JSON object.' };
  }
  const itemId = str(body.itemId, 36);
  if (!itemId) return { ok: false, reason: 'itemId is required.' };
  if (!Number.isInteger(body.revision) || body.revision < 1) {
    return { ok: false, reason: 'revision must be a positive integer.' };
  }
  const headline = str(body.headline, SPOTLIGHT_MAX_HEADLINE);
  if (!headline) return { ok: false, reason: 'headline is required.' };
  return { ok: true };
};
```

**The full accepted body** (`:90-93` and `:118-137`) — this is the authoritative DTO:

| Field | Type | Constraint | Required |
|---|---|---|---|
| `itemId` | string | trimmed, ≤36 | **yes** |
| `revision` | integer | ≥1 | **yes** |
| `headline` | string | trimmed, ≤80 | **yes** |
| `dek` | string | trimmed, ≤200 | no |
| `curatorNote` | string | trimmed, ≤140 | no |
| `retracted` | boolean | default `false` | no |
| `imageUrl` | string | ≤2048 | no |
| `sourceAttribution.name` | string | ≤80 (nested object) | no |
| `sourceAttribution.url` | string | ≤2048 (nested object) | no |
| `gate.checklistHash` | string | ≤64 (nested object) | no |
| `sortWeight` | integer | default `1` | no |
| `publishedAt` | date | `Date`-parseable | no |
| `expiresAt` | date | `Date`-parseable | no |

> **`str()` is `(value, max) => typeof value === 'string' ? value.trim().slice(0, max) || null : null`.**
> It **truncates** rather than rejecting. A 300-character `headline` is silently cut to 80.

**⚠️ The field is `dek`, not `summary`.** Astra's package warns against inventing `summary`; this
table is the ground truth for what the receiver actually reads.

**Headers** (`backend/services/swanBridgeSignature.mjs:8-12`):

```
X-Swan-Signature: sha256=<hex>
X-Swan-Timestamp: <ISO 8601>
X-Swan-Idempotency-Key: <itemId>@<revision>
canonical string = `${timestamp}.${rawBody}`
```

**Responses** (`:74-146`):

| Status | Body |
|---|---|
| 503 | `{ success: false, message: 'Spotlight ingest is disabled.' }` — flag off |
| 401 | `{ success: false, code }` — `SIGNATURE_MALFORMED` \| `SIGNATURE_EXPIRED` \| `SIGNATURE_INVALID` |
| 422 | `{ success: false, message: <reason> }` or `{ success: false, code: 'BANNED_TERM' }` |
| 200 | `{ success: true, itemId, revision, retracted }` |
| 200 (replay) | `{ success: true, noop: true, itemId, revision: existing.revision }` |
| 500 | `{ success: false, message: 'Server error during ingest.' }` |

**Ingest order is contractual** (`:11-13`): flag (503) → signature + skew (401) → schema (422) →
bannedTerms second gate (422) → idempotent upsert → R2 re-host → audit log.

**Idempotency** (`:107-109`): `if (existing && existing.revision >= revision)` → no-op. Note this is
`>=`, so an **equal** revision is a no-op and a **lower** revision is also a no-op. There is no
tombstone table — `retracted` is a boolean column on the same row.

---

## G0-2 — `SwanSpotlight` model and migration

`backend/models/social/SwanSpotlight.mjs` — **the primary key is the natural key `itemId`, not an
auto-increment `id`.** This is the one exception to the `social/` INTEGER-PK convention.

```js
itemId:      STRING(36),  primaryKey, allowNull: false
revision:    INTEGER,     allowNull: false, defaultValue: 1
retracted:   BOOLEAN,     allowNull: false, defaultValue: false
headline:    STRING(80),  allowNull: false
dek:         STRING(200), allowNull: true
imageUrl:    TEXT,        allowNull: true
sourceName:  STRING(80),  allowNull: true
sourceUrl:   TEXT,        allowNull: true
curatorNote: STRING(140), allowNull: true
sortWeight:  INTEGER,     allowNull: false, defaultValue: 1
publishedAt: DATE,        allowNull: true
expiresAt:   DATE,        allowNull: true
gateHash:    STRING(64),  allowNull: true
// tableName 'SwanSpotlights', timestamps: true
```

Index: `{ fields: ['retracted', 'expiresAt', 'sortWeight'] }` — the live-rail query.

Migration `backend/migrations/20260916-create-swan-spotlights.cjs` creates the same columns, with
`createdAt`/`updatedAt` as `allowNull: false, defaultValue: Sequelize.literal('NOW()')`, plus
`addIndex('SwanSpotlights', ['retracted','expiresAt','sortWeight'], { name: 'swan_spotlights_live_rail_idx' })`.

> **Note the model/migration pair is the pattern to copy for every new S5–S8 table**, including the
> `literal('NOW()')` default on the timestamp columns.

---

## G0-3 — `swanBridgeSignature.mjs` (the signer the publisher must reproduce)

`backend/services/swanBridgeSignature.mjs`

```js
const SIG_REGEX = /^sha256=[0-9a-f]{64}$/i;
export const DEFAULT_SKEW_SECONDS = 300;
const MIN_SECRET_LENGTH = 32;

export function buildCanonicalPayload(timestamp, rawBody) {
  if (!Buffer.isBuffer(rawBody)) throw new Error('buildCanonicalPayload: rawBody must be a Buffer');
  return `${timestamp}.${rawBody.toString('utf8')}`;
}

export function signPayload(timestamp, rawBody, secret) {
  return `sha256=${crypto.createHmac('sha256', secret)
    .update(buildCanonicalPayload(timestamp, rawBody)).digest('hex')}`;
}
```

Verification order (`verifyBridgeRequest`): shape-check the header → timestamp window → **require
`Buffer.isBuffer(req.rawBody)`** → resolve secret → constant-time HMAC compare.

- Skew: `Math.abs(nowMs - Date.parse(timestamp)) <= 300 * 1000`.
- Secret: `SWAN_BRIDGE_SECRET_V1`, **must be ≥32 chars** or the resolver throws (mapped to a 401
  that never echoes the env var name).
- `RAW_BODY_UNAVAILABLE` returns **500** (`:94-98`) with the comment *"If this fires, the mount order
  regressed."* — this is the canary for the parser-skip-list regression.

**The publisher must sign `timestamp + '.' + exactBytes` where the bytes are the exact serialised
body it sends.** Any re-serialisation between signing and sending breaks the HMAC.

---

## G0-4 — The daily-cap block (Astra's finding #3, now with exact lines)

`backend/routes/social/coachSignalRoutes.mjs:117-140`

```js
const duplicate = await CoachSignal.findOne({
  where: { coachId: req.user.id, postId: parsedPostId }, attributes: ['id'],
});
if (duplicate) return res.status(409).json({ success: false, message: 'You already signaled this post.' });

const sentToday = await CoachSignal.count({
  where: { coachId: req.user.id, createdAt: { [Op.gte]: startOfUtcDay() } },
});
if (sentToday >= DAILY_SIGNAL_CAP) {
  return res.status(429).json({ success: false,
    message: `Daily signal limit reached (${DAILY_SIGNAL_CAP}). Signals stay precious.` });
}

const signal = await CoachSignal.create({
  coachId: req.user.id, memberId: post.userId, postId: parsedPostId, note: trimmedNote || null,
});
```

`const DAILY_SIGNAL_CAP = 5;` (`:14`). `startOfUtcDay()` → **UTC** boundary.

**Refinement of Astra's finding — there are two read-then-write races here, and only one is
backstopped:**

| Race | Lines | Backstop |
|---|---|---|
| Duplicate signal | `:117-123` findOne → `:135` create | **Yes** — the unique index on `('coachId','postId')` makes the second insert fail |
| Daily cap | `:125-127` count → `:135` create | **None** — nothing at the DB level prevents a 6th row |

So the cap race is the one that needs the locked-counter fix; the duplicate race is already
DB-protected (though it would surface as a 500 rather than a 409, since `create` would throw on
constraint violation and the catch at `:173` returns 500).

---

## G0-5 — SwanGuard's migration runner — **`CREATE INDEX CONCURRENTLY` IS NOT AVAILABLE**

**This closes the open question Astra raised in its own finding #2, and the answer forbids the DDL
Astra proposed.**

`packages/database/src/migrationRunner.ts`:

- `:379` — `await client.query('BEGIN');`
- `:416` — `await client.query(sql);`  ← each migration's SQL, **inside the transaction**
- Tests assert `BEGIN` then `COMMIT`: `migrationRunner.test.ts:173,188,199`
- Ledger table: `schema_migrations` (`:76`, `select version, checksum from schema_migrations order by version`)

**Every migration runs inside a transaction.** In PostgreSQL, `CREATE INDEX CONCURRENTLY` (and
`ALTER TABLE … ADD CONSTRAINT … NOT VALID` followed by `VALIDATE`, when issued as separate
statements outside a transaction) **cannot run inside a transaction block** — it fails with
`CREATE INDEX CONCURRENTLY cannot run inside a transaction block`.

> **Therefore: use ordinary `CREATE INDEX` / `ALTER TABLE … ADD CONSTRAINT`, not the `CONCURRENTLY`
> variant.** Astra's package hedges this correctly ("*G0 must establish whether the migration runner
> permits that*"); the answer is **no**. This is the single most valuable G0 result — it prevents a
> migration that would fail on deploy.

Other facts: dialect is **PostgreSQL** (runner file `scripts/postgres-migration-runner.mjs`, ledger
`schema_migrations`, `transaction_timestamp()` in the schema helpers). Migrations live in
**`packages/database/migrations`**, not a per-app directory.

**On `backend/migrations/social/` (SS-PT side):** that directory holds 4 real migration files,
including a 15 KB `20240506000001-create-social-tables.js`. They are classified `inert` by
`isExecutableByCli()` and **never execute on deploy** — but this is **deliberate and loudly
disclosed**, not a hidden bug: `safe-migrate.mjs:248-259` prints
`"${inert.length} INERT MIGRATION FILE(S) — NEVER RUN, NEVER WILL"`, with the comment *"Print the
inert set loudly. Silence is what let 38 files accumulate."* Recorded here so a builder does not
"discover" it and panic.

---

## G0-6 — SwanGuard authorization primitives

`apps/api/src/roles.ts`:

```ts
const roleRank: Record<UserRole, number> = { supervised: 0, member: 1, admin: 2, owner: 3 };

export function requireRole(user: UserRecord, minimumRole: UserRole): void {
  if (roleRank[getUserRole(user)] < roleRank[minimumRole]) {
    throw new HttpError(403, 'role_required', 'Required role is not available');
  }
}
```

- `UserRole = 'owner' | 'admin' | 'member' | 'supervised'` (`apps/api/src/auth.ts:4`).
- `getUserRole(user)` returns `user.role ?? 'member'` — an unset role is a **member**, not an owner.
- `requireUser(auth, request)` / `requireUserOnce(auth, request, resolvedUser)` live in
  **`apps/api/src/requestAuth.ts`** (`:49` and `:77`).
- Cookies: `sg_session`, `sg_csrf` (`requestAuth.ts:6-7`); CSRF token via `createCsrfToken()`.
  **Cookie-authenticated mutations require the CSRF mechanism.**
- `effectiveOperatorPermissions(user)` (`roles.ts:34-40`): an **owner implicitly holds**
  `OPERATOR_GRANTS_MANAGE_PERMISSION` whether or not a grant row exists — deliberate, so grant
  expiry cannot permanently deadlock the permission system.

**For S5's operator surface:** use `requireRole(user, 'owner')` (or the existing authenticated-owner
check that the operator APIs already use) and let ordinary operators receive 403 — matching Astra's
contract table and the existing `operatorGrantRoutes.ts` precedent.

---

## What is still missing

This document closes the six excerpts. It does **not** supply:

- The **SwanGuard** `operatorGrantRoutes.ts` body — only its shape and line count (251 lines in the
  worktree). A builder copying the pattern should read it directly.
- The **`SwanSpotlights` rail query** as implemented in `spotlightReadRoutes.mjs` — worth pasting
  before building the S3 admin read view, so both sides agree on "live".
- Confirmation that **`SWAN_BRIDGE_SECRET_V1`** is set in the SwanGuard deployment environment (it is
  required on both sides; the resolver throws if absent or under 32 chars).
