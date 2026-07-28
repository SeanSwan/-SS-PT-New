---
decision: v2 gym-ops spine — money spine first, one global lock order, attendedAt not a status, cancel transaction spec'd in full, zero unresolved library/role/path guesses
status: open
supersedes: docs/ai-workflow/AI-HANDOFF/GYM-OPS-SPINE-BUILD-BLUEPRINT-2026-07-28.md
---

# Gym Operations Spine — Worker-Bot Build Blueprint **v2**

**Date:** 2026-07-28 · **Linear:** SWA-74
**Supersedes:** v1 (rejected — 5 BLOCKERs). **Review that killed v1:** `KIMI-REVIEW-gym-ops-spine-2026-07-28.md`
**Audit:** `MINDBODY-DISPLACEMENT-AUDIT-2026-07-27.md`

**Builder profile:** zero repo context. Ask nothing — every library, role name, file path, and
transaction is resolved below. If something is genuinely undecided it is in §9 and says **STOP**.

---

## 0. What changed from v1, and why

| v1 blocker | v2 fix |
|---|---|
| **A1** Slice 5 wrote `status:'suspended'`; the ENUM lacked it | `suspended` is in the ENUM (§3, S1). One state machine, defined once, in §2.4. |
| **A2** No slice ever created a Stripe subscription → dunning keyed off a NULL column | **Membership + purchase is now S1 — the FIRST functional slice, before anything reads it.** |
| **A3** Check-in flipped status to `attended`, capacity counted `booked` only → oversell | **Attendance is `attendedAt TIMESTAMP`, not a status.** `status` means exactly one thing: *holds a seat*. |
| **B1** Cancel-vs-cancel lock-order inversion deadlock | **§2.3 global lock order**, mandatory for every mutation, no exceptions. |
| **D1** Cancel transaction unspecified | Written in full, S3. |
| A4 / E5 no entitlement gate; classes free until membership landed | Membership ships **before** booking; `assertCanBook()` (§2.5) is called by book *and* promote. |
| A5 `ON DELETE CASCADE` erased history | `RESTRICT` on ledger-adjacent FKs (§2.6). |
| E1 / E2 / E3 dependency table wrong; orphan column; phantom backfill | §4 chain is honest and linear; `check_ins.membershipId` created in S4; backfill is S0.2. |
| E4 wireframes with no backend and no frontend slice | Frontend is **explicitly out of scope** (§8); every wireframe control now maps to a real endpoint or was cut. |
| D2 ~18 forced guesses | §2.1 resolves all of them against the actual repo. |

**Honest correction to v1's central claim:** v1 said all seven slices were "independently shippable."
They are not — they are a **chain**. What v2 guarantees instead is that each slice leaves the system
**coherent and revertable**: its migration has a working `down`, and nothing half-gated ships.

### 0.1 Round-2 review fixes (Kimi K3 re-review of v2 — all 5 v1 blockers confirmed dead)

Round 2 verified A1/A2/A3/B1/D1 are killed at the root, then found one new blocker and four HIGHs
**introduced by the v2 fixes themselves.** All are corrected in this revision:

| ID | Defect found in v2 draft 1 | Fix |
|---|---|---|
| **M2** BLOCKER | Cancelled memberships never stopped working: no `customer.subscription.deleted` handler, cancel never set `status`, `assertCanBook` ignored `endsAt`, `expired` had no writer | **§2.7** — three independent termination paths, all mandatory in S1 |
| **M1** HIGH | Two browser tabs → two Stripe subscriptions → double charge forever | Pre-checkout `409 ALREADY_A_MEMBER` guard + partial unique index on live memberships (S1) |
| **M3** HIGH | Every Stripe retry re-ran "failure 1", resetting `dunningStartedAt` → day-10 suspension never arrived | Clock starts once; webhook owns start/clear, cron owns advance (S5) |
| **N1** HIGH | `assertCanBook` pre-filtered `status` in the `where`, making the `suspended`/`frozen` branches **dead code** — my own S5 test asserted a code the gate could never return | Fetch first, branch after (§2.5) |
| **N3** HIGH | S2.2 said "delete slots with zero bookings" while `classSlotId` is `RESTRICT` and `class_slots` isn't paranoid — the DELETE cannot execute | Retirement is a **status flip, never a delete** (S2.2) |
| N2 | `catch {}` in promotion treated a DB timeout as ineligibility and destroyed a queue position | Catch `ForbiddenError` only; new `skipped_ineligible` status; notify the member |
| N5 | Cancel/promote could promote into a class that already ran | `startsAt > now` guard in `promoteFromWaitlist` |
| N6 | 5-min check-in idempotency was read-then-insert with no constraint | `pg_advisory_xact_lock` (S4) |
| N7 | bcrypt hashes aren't indexable — key lookup procedure was unspecified; auth sat outside the try/catch | `keyId.secret` format, indexed fetch + one compare; whole handler wrapped (S6) |
| N8 | Multiple memberships per (user, location) → nondeterministic `findOne` | Explicit precedence `order` + the M1 unique index |
| N4 | Capacity increase never triggered promotion — bigger class, empty seats, live waitlist | Increase now runs `promoteFromWaitlist` per affected slot (S2.2) |
| M4/M5 | No auto-unfreeze writer; webhook replay response unspecified | §2.7 path 3 auto-unfreeze; explicit replay→200 contract (S1) |
| N9/N10 | `periodStart` and `isStaff` called but never defined | Both defined in §2.5 |

**Method note:** N2's fix introduced a *new* status value (`skipped_ineligible`). That is exactly the
class of change that killed v1 (A1: writing a status absent from its ENUM), so it was propagated to
§2.4 **and** the S2 migration in the same edit, with an enum-parity check added to the schema block.

### 0.2 Round-3 review fixes (Kimi re-review of the round-2 fixes)

Round 3 confirmed M3, N1, N2, N4, N6-mechanism, N7, M4, M5, M7 as clean kills, and verified
`skipped_ineligible` was propagated **without** enum drift. It then found the round-2 fixes had
introduced a fresh set:

| ID | Defect introduced by the round-2 fixes | Fix |
|---|---|---|
| **R8** BLOCKER | §2.7 path 3 writes an `expired` **event** against a `membership_events.eventType` ENUM that lacked it → the only writer of `expired` crashes daily, forever. **A1 recreated one revision after the parity check** — because that check grepped only `status:` literals and lived in S2, structurally unable to see an S1 event enum. | `expired` + `cancellation_requested` + `orphan_subscription_refunded` added; **parity check now covers `eventType` too** |
| **R7** HIGH | Path 3 branched on "cancel requested" with no such column; paths 2 and 3 double-fired and overwrote each other's terminal status | `cancelRequestedAt` column; path 2 is a NO-OP when already terminal |
| **R1** HIGH | The M1 pre-checkout guard was read-then-act; the unique index **cannot fire before a row exists**, so two tabs still double-charged | `pg_advisory_xact_lock` on `(userId, locationId)` inside checkout creation |
| **R3/R14** HIGH | Precedence `ORDER` was entitlement-first and status-blind while the index excluded `suspended` → a suspended row outranked a valid active one; and a suspended member could re-buy to escape dunning | ORDER is **live-status first**; `suspended` added to the 409 guard |
| **R2** HIGH | `periodStart` used naive `setMonth` → Jan-31 anchor rolled to Mar 3, drifting the anniversary and under-counting usage → `limited` members over-book | day-of-month clamped, all UTC, four mandatory unit tests |
| **R6** HIGH | Status-flip retirement left cancelled rows in the `(classSeriesId,startsAt)` unique index → regeneration onto a retired instant **silently dropped** by `ignoreDuplicates` | index predicate now excludes `cancelled` |
| R5 | Check-in mutated a booking with only the advisory lock — the doc's code failing the doc's own §2.3 gate | lock order `advisory → slot → booking`, stated |
| R4 | `isStaff(actorUserId)` against a role predicate → staff could never cancel | signature takes `actorRole` from `req.user.role` |
| R9 | Orphan-subscription refund had nowhere to write its `stripeEventId` → replay re-refunded | `membership_events.membershipId` is nullable |
| R10 | Class cancellation still had no service — stranded `booked` rows permanently consumed `limited` allowance | `cancelClassSlot` spec'd, flips all rows, notifies |
| R11 | `notifyAfterCommit` called and never defined; successful promotions notified nobody | helper spec'd; every promotion notifies |
| R12 | Cron expired `frozen` memberships mid-pause, destroying paid term | cron skips `frozen`; unfreeze extends `endsAt` |

**The meta-lesson, recorded because it recurred three times:** enum drift is this project's most
repeated defect class, and it moved each round — `memberships.status` (v1), then a *new* booking
status (v2d1, caught), then `membership_events.eventType` (v2d2). A parity check scoped to one
column name will keep missing it. The check is now scoped to **every enumerated column in the
document.**

---

## 1. Sean's business decisions (defaults applied — override here, one edit)

These are money/policy calls, not engineering calls. v2 builds the defaults; changing one is a
single-line edit to `backend/config/gymPolicy.mjs` (created in S0).

| Policy | **Default applied** | Override by |
|---|---|---|
| Late-cancel window | **12 hours** before class start | `LATE_CANCEL_HOURS` |
| Late cancel forfeits a session credit? | **No** — records `late_cancelled`, frees the seat, no charge | `LATE_CANCEL_FORFEITS_CREDIT = false` |
| Class booking decrements `SessionPackage` credits for PT-package holders? | **No** — class attendance and PT session credits stay separate ledgers | `CLASS_CONSUMES_SESSION_CREDIT = false` |
| Membership freeze pauses Stripe billing? | **Yes** — freeze pauses the subscription (§3 S5) | `FREEZE_PAUSES_BILLING = true` |
| Cancellation notice | **30 days** | `CANCELLATION_NOTICE_DAYS` |
| Dunning suspension day | **Day 10** after first failure | `DUNNING_SUSPEND_DAY` |

> ⚠ **`CLASS_CONSUMES_SESSION_CREDIT = false` is the highest-risk default in this document.** If the
> gym intends a PT package to *pay for* class attendance, revenue is being given away silently.
> Sean must confirm. The flag exists so flipping it is one line, but the enforcement path if flipped
> is **not built** in v2 — see §9.3.

---

## 2. Laws — read before any slice

### 2.1 Resolved environment (verified against this repo — do not substitute)

| Thing | Resolved value | Evidence |
|---|---|---|
| Sessions table name | `'sessions'` (lowercase) | `Session.mjs:332` |
| Users table (all FKs) | `"Users"` — PascalCase, quoted | project gotcha; a stale lowercase `users` exists |
| Role enum | `ENUM('user','client','trainer','admin')` | `User.mjs:124` — **`user` ≠ `client`**; a signed-up account is `user` until made a client |
| Auth middleware | `backend/middleware/authMiddleware.mjs` | exports `protect` (:275), `adminOnly` (:437), `trainerOnly` (:534), `clientOnly` (:555), `trainerOrAdminOnly` (:576), `requireAnyRole(...roles)` (:595), `authorize(roles[])` (:495) |
| RRULE parsing | **`rrule@2.7.1` — already installed** | `backend/package.json` |
| Date utils | `date-fns@3.6.0`, `moment@2.30.1` | `backend/package.json` |
| Timezone library | **NONE INSTALLED. Do not add one.** Use native `Intl` per §2.2 | house pattern: `backend/services/nutrition/displayDate.mjs:15` |
| Cron/scheduler | `backend/services/<name>Cron.mjs` exporting `start<Name>Scheduler`, registered in `backend/core/startup.mjs` (~:586) | `weeklyChallengeCron.mjs`, `sessionReminderCron.mjs` |
| Migration format | `YYYYMMDDHHMMSS-kebab.cjs`; copy `20260723090000-create-trainer-applications.cjs` | — |
| Model template | copy `backend/models/SessionType.mjs` | — |
| `associations.mjs` | 3 edit points: import (~:16), `.default` extract (~:236), associations (~:572); registry ~:495 | — |
| Route mounting | `backend/core/routes.mjs` — import (~:87) + `app.use(...)` (~:285) | — |

**Migration timestamps:** every `YYYYMMDDHHMMSS` below is a **literal filename to create as written**.
They are pre-assigned and ordered. Do not substitute the current time.

### 2.2 Timezone conversion — the only sanctioned method

No tz library is installed and **you may not add one**. Convert wall-clock → UTC with a two-pass
`Intl` offset probe. Create `backend/utils/zonedTime.mjs`:

```js
/**
 * Wall-clock time in an IANA zone → the correct UTC instant, DST included.
 * Two passes: the offset near a DST boundary differs between the naive guess and the real instant,
 * so we probe, correct, then re-probe. One pass is wrong twice a year — which is exactly when a
 * 6:30 AM class would silently move to 5:30 or 7:30.
 */
function zoneOffsetMs(instant, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instant);
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+v.year, +v.month - 1, +v.day, +v.hour % 24, +v.minute, +v.second);
  return asUtc - instant.getTime();
}

export function zonedWallClockToUtc({ year, month, day, hour, minute }, timeZone) {
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  const pass1 = naive - zoneOffsetMs(new Date(naive), timeZone);
  const pass2 = naive - zoneOffsetMs(new Date(pass1), timeZone);
  return new Date(pass2);
}
```

**Slot generation:** use `rrule` to produce the *calendar dates only*, then apply
`startTimeLocal` + the location's `timezone` through `zonedWallClockToUtc` **per occurrence**.
Never let rrule emit UTC instants directly for a recurring local time — that is the DST bug.

### 2.3 🔒 GLOBAL LOCK ORDER — mandatory, no exceptions

> **Every transaction that mutates a booking MUST acquire `class_slots` row lock FIRST,
> then any `class_bookings` rows. Never the reverse. Never a booking row without the slot lock.**

This single rule is what prevents the v1 deadlock. It applies to: book, cancel, promote, staff
manual promote, no-show marking, class cancellation, check-in attachment. Every code sample below
obeys it. **A reviewer must reject any transaction that touches `class_bookings` without first
locking its `class_slots` row.**

### 2.4 State machines — defined once, referenced everywhere

**`class_bookings.status`** — means exactly *"does this row hold a seat?"*

| Value | Holds a seat? | Notes |
|---|---|---|
| `booked` | ✅ YES | counts against capacity |
| `waitlisted` | ❌ no | queued; ordered by `waitlistedAt` |
| `cancelled` | ❌ no | in-window cancel, seat freed |
| `late_cancelled` | ❌ no | inside the 12h window; seat freed; flagged for policy |
| `no_show` | ❌ no | terminal, set after class |
| `skipped_ineligible` | ❌ no | system passed them over at promotion time (suspended/frozen/at-limit). **Not a cancellation** — the member did nothing. Kept distinct so the audit is honest and staff can re-add them. |

**Capacity is always `count(status = 'booked')`.** Attendance is `attendedAt IS NOT NULL` — a
**separate column**, never a status. A checked-in member still holds their seat. *(This is v1's A3.)*

**`memberships.status`** — the single authoritative list:
`active` · `frozen` · `past_due` · `suspended` · `cancelled` · `expired`
**`suspended` is present.** *(v1's A1.)* Blocks booking and door entry; `past_due` does not.

### 2.5 `assertCanBook()` — the entitlement gate (v1's A4)

Create `backend/services/membershipEntitlementService.mjs`. **Called by book AND promote.** Fail-closed.

```js
/**
 * Throws unless the user may occupy a seat in this slot. Fail-closed: no membership = no booking.
 * Called from bookIntoSlot AND promoteFromWaitlist — a promotion into a seat IS a booking.
 *
 * DO NOT pre-filter by status in the `where`. An earlier draft did, which made the suspended/frozen
 * branches below unreachable and returned NO_ACTIVE_MEMBERSHIP for everything — breaking the S5/S6
 * acceptance tests that assert the specific codes, and erasing the front-desk distinction between
 * "pay your bill" and "your freeze is on". Fetch the row, THEN branch.
 */
export async function assertCanBook({ userId, slot }, t) {
  const membership = await Membership.findOne({
    where: { userId, locationId: slot.locationId },
    // Precedence when a member holds several rows at one location. LIVE STATUS FIRST, then
    // entitlement richness. Ordering by entitlement first is a trap: the unique index below does
    // NOT cover `suspended`, so a suspended `unlimited` row can legally coexist with an active
    // `limited` one — and entitlement-first ordering would pick the suspended row and deny a
    // member who is genuinely paid up.
    order: [
      [sequelize.literal(`CASE "status" WHEN 'active' THEN 0 WHEN 'past_due' THEN 1 WHEN 'frozen' THEN 2 WHEN 'suspended' THEN 3 ELSE 4 END`), 'ASC'],
      [sequelize.literal(`CASE "entitlement" WHEN 'unlimited' THEN 0 WHEN 'limited' THEN 1 ELSE 2 END`), 'ASC'],
      ['createdAt', 'DESC'],
    ],
    transaction: t,
  });

  if (!membership) throw new ForbiddenError('NO_ACTIVE_MEMBERSHIP');        // also catches wrong-location
  if (membership.status === 'suspended') throw new ForbiddenError('MEMBERSHIP_SUSPENDED');
  if (membership.status === 'frozen')    throw new ForbiddenError('MEMBERSHIP_FROZEN');
  if (['cancelled', 'expired'].includes(membership.status)) throw new ForbiddenError('MEMBERSHIP_ENDED');

  // Belt-and-suspenders against a missed terminal transition (§2.7). Even if a cron failed to flip
  // status, an elapsed endsAt must never grant access.
  if (membership.endsAt && new Date(membership.endsAt) < new Date()) {
    throw new ForbiddenError('MEMBERSHIP_ENDED');
  }
  if (!['active', 'past_due'].includes(membership.status)) throw new ForbiddenError('NO_ACTIVE_MEMBERSHIP');

  if (membership.entitlement === 'open_gym_only') throw new ForbiddenError('CLASSES_NOT_INCLUDED');

  if (membership.entitlement === 'limited') {
    const used = await ClassBooking.count({
      where: { userId, status: ['booked'], bookedAt: { [Op.gte]: periodStart(membership) } },
      transaction: t,
    });
    if (used >= membership.sessionsPerPeriod) throw new ForbiddenError('PERIOD_LIMIT_REACHED');
  }
  return membership;
}

/**
 * Start of the member's CURRENT entitlement period — billing anniversary, not calendar month.
 *
 * All UTC. Day-of-month is CLAMPED to the target month's length: a Jan-31 anchor must yield Feb 28,
 * not roll over into March. Naive setMonth() rolls Feb 31 → Mar 3, which walks the anniversary
 * forward every month and starts the window AFTER the true anniversary — under-counting usage and
 * letting `limited` members book past the quota they paid for. Fail-open on the money path.
 */
export function periodStart(membership, now = new Date()) {
  const anchor = new Date(membership.startsAt);
  const anchorDay = anchor.getUTCDate();
  const [h, mi] = [anchor.getUTCHours(), anchor.getUTCMinutes()];

  const at = (year, month) => {
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return new Date(Date.UTC(year, month, Math.min(anchorDay, daysInMonth), h, mi));
  };

  if (membership.billingInterval === 'annual') {
    let s = at(now.getUTCFullYear(), anchor.getUTCMonth());
    if (s > now) s = at(now.getUTCFullYear() - 1, anchor.getUTCMonth());
    return s;
  }
  let s = at(now.getUTCFullYear(), now.getUTCMonth());
  if (s > now) {                                   // anniversary not yet reached this month
    const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    s = at(prev.getUTCFullYear(), prev.getUTCMonth());
  }
  return s;
}
```

**`periodStart` unit tests are mandatory:** Jan-31 anchor → February returns **Feb 28** (not Mar 3);
Mar returns Mar 31; the returned instant is never later than `now`; a Feb-29 annual anchor works in
a non-leap year. These four cases are the whole bug.

`past_due` is deliberately allowed to book — the dunning ladder, not the booking path, decides when
access stops. Only `suspended`, `frozen`, `cancelled`, and `expired` block.

**`isStaff`** (used in S3) — **`roleService.mjs` does NOT export this; do not look for it there**
(verified: it exports `upgradeToClient`, `hasAccessToDashboard`, `getAccessibleDashboards`,
`isValidRoleTransition`). It is a plain inline predicate: `['trainer','admin'].includes(actorRole)`.
The route layer reads `req.user.role` (set by `protect`) and passes `actorRole` into the service —
**never do a DB lookup inside a locked transaction.**

**Notifications** — `backend/services/notificationService.mjs` exports
`sendNotification({ type, title, message, data, recipients, subject, text, html, phone, smsBody })`
(:12), plus `sendPriorityNotification` (:167) and `sendAdminNotification` (:245). `recipients` is an
array of user ids. Dead-letter alarms use `sendAdminNotification`.

### 2.7 🔴 Membership termination — three independent paths, all mandatory

> A membership that ends must stop working. v2's first draft cancelled the *Stripe subscription* and
> left *access* open forever — a member who cancelled in January still booked classes in December.
> Termination is not one mechanism; it is three, and **all three must ship in S1.**

`memberships` carries **`cancelRequestedAt` DATE nullable** — set by path 1, read by path 3 to decide
`cancelled` vs `expired`. Without it that branch is unimplementable (`endsAt` alone cannot say *why*
the term ended).

| # | Path | Mechanism |
|---|---|---|
| 1 | **Member/admin cancels** | `POST /:id/cancel` sets `cancelRequestedAt = now`, `endsAt = now + CANCELLATION_NOTICE_DAYS`, and Stripe `cancel_at`. Event `cancellation_requested`. **Status stays `active` through the notice window** — it is paid access. The terminal flip is path 3. |
| 2 | **Stripe says it ended** | Handler for **`customer.subscription.deleted`** → `status='cancelled'`, event `cancelled`. Catches *Stripe-initiated* cancellation when dunning retries are exhausted — without it such a member sits `past_due` forever. **Guard: if status is already terminal (`cancelled`/`expired`), this handler is a NO-OP** — it must not overwrite the status or rewrite `endsAt`, or a cron-then-webhook ordering silently falsifies history with two contradictory events. It also must not fire on a freeze: verify `pause_collection: 'void'` does not emit `subscription.deleted`. |
| 3 | **Time elapsed** | `membershipLifecycleCron.mjs` → `startMembershipLifecycleScheduler`, daily, registered in `core/startup.mjs`. For `endsAt < now` and status in (`active`,`past_due`): → `cancelled` if `cancelRequestedAt` is set, else `expired`. Writes the matching event. **This is the only writer of `expired`.** **It must SKIP `frozen` memberships** — freeze pauses billing, so an unextended `endsAt` would expire a member who still has paid term left. Same cron auto-unfreezes `frozenUntil < now` (resume Stripe collection, event `unfrozen`). |

**Freeze extends the term.** On unfreeze, push `endsAt` forward by the frozen duration — the member
paused a paid term, they did not forfeit it.

`assertCanBook` (§2.5) and S6's door resolver **both** independently check `endsAt` as well as
status, so a failed cron degrades to denied access, never to free access. **Fail-closed on every path.**

### 2.6 FK deletion policy (v1's A5)

Ledger-adjacent tables use `ON DELETE RESTRICT`: `class_bookings.userId`, `class_bookings.classSlotId`,
`check_ins.userId`, `memberships.userId`. Attendance and billing history is evidence in a dispute;
a user deletion must not silently rewrite it. Users are soft-deleted (paranoid), consistent with the
repo. **No `CASCADE` anywhere in this build.**

---

## 3. Slices

### S0 — `Location` + policy config

**`20260728100000-create-locations.cjs`** — `locations`: `id` · `name` STRING(150) NOT NULL ·
`slug` STRING(150) NOT NULL · address fields · `country` STRING(2) default `'US'` · `phone` ·
`timezone` STRING(64) NOT NULL default `'America/Los_Angeles'` ·
**`opensAt` / `closesAt` STRING(5) nullable** (wall-clock `'05:00'`/`'23:00'` — S6 needs these;
NULL means *no hours restriction*, an explicit allow, documented so it is not a fail-open surprise) ·
`isActive` BOOLEAN default true · `metadata` JSONB · timestamps + `deletedAt`.
Indexes: unique `slug`, `isActive`.

Same migration: `addColumn('sessions', 'locationId', { INTEGER, nullable, references locations.id, onDelete: 'SET NULL' })` + index. **Table name is `'sessions'` — confirmed, no hedge.**

**CREATE** `backend/models/Location.mjs` (paranoid) · **CREATE** `backend/config/gymPolicy.mjs`
(exports the §1 constants, each reading `process.env.<NAME>` with the §1 default) ·
**CREATE** `backend/utils/zonedTime.mjs` (§2.2) ·
**EDIT** `Session.mjs` add `locationId` (leave `location` STRING untouched) ·
**EDIT** `associations.mjs`: `Session.belongsTo(Location, { foreignKey:'locationId', as:'facility' })` +
`Location.hasMany(Session, { foreignKey:'locationId', as:'sessions' })` — alias `facility`, because
`location` collides with the existing STRING attribute ·
**CREATE** `backend/routes/locationRoutes.mjs` (`protect` + `adminOnly` on writes) ·
**EDIT** `core/routes.mjs` → `app.use('/api/locations', locationRoutes)`.

**S0.2 — backfill** *(v1's E3: promised, then absent)*. `20260728100500-backfill-session-locationid.cjs`:
for each DISTINCT non-null `sessions.location` string, `findOrCreate` a Location by slugified name,
then set `locationId`. Log unmatched values; **do not delete `sessions.location`.**

**Acceptance:** migrations up+down clean · `node --check` all touched files · backend boots ·
`GET /api/locations` → `200 []` · duplicate slug rejected · pre-existing sessions load with
`locationId` null and nothing throws · `git diff backend/models/Session.mjs` shows only an added field ·
`zonedWallClockToUtc` unit test: 06:30 America/Los_Angeles on 2026-03-07 and 2026-03-14 (DST boundary)
both yield 06:30 local.

---

### S1 — `Membership` + purchase ⭐ money spine, ships FIRST

*(v1's A2: nothing could ever be sold. This slice exists so every later slice reads a column something writes.)*

**`20260728110000-create-memberships.cjs`**

`memberships`: `id` · `userId` FK `"Users"` **RESTRICT** NOT NULL · `locationId` FK `locations` RESTRICT NOT NULL ·
`name` STRING(150) · `status` ENUM(§2.4, 6 values) default `active` · `priceCents` INTEGER NOT NULL ·
`currency` STRING(3) NOT NULL default `'USD'` · `billingInterval` ENUM(`monthly`,`annual`) ·
`termMonths` INTEGER nullable · `startsAt`/`endsAt` DATE · `entitlement` ENUM(`unlimited`,`limited`,`open_gym_only`) ·
`sessionsPerPeriod` INTEGER nullable · `cancellationNoticeDays` INTEGER default 30 ·
`frozenUntil` DATE nullable · `stripeCustomerId` STRING(255) · `stripeSubscriptionId` STRING(255) ·
**dunning state** → `dunningAttempt` INTEGER NOT NULL default 0 · `dunningStartedAt` DATE nullable ·
`lastPaymentFailedAt` DATE nullable · timestamps + `deletedAt`.

> Indexes: **`stripeSubscriptionId` UNIQUE (partial, `WHERE stripeSubscriptionId IS NOT NULL`)** —
> v1's A8; a non-unique lookup makes the S5 webhook branch non-deterministic. Plus `(userId,status)`,
> `(locationId,status)`, and `endsAt` (the §2.7 lifecycle cron scans it).
>
> **Also mandatory — one live membership per member per location:**
> ```js
> await queryInterface.addIndex('memberships', ['userId', 'locationId'], {
>   name: 'memberships_one_live_per_user_per_location',
>   unique: true,
>   where: { status: ['active', 'past_due', 'frozen'] },
> });
> ```
> This is the DB backstop for the double-checkout double-charge. It also makes §2.5's membership
> lookup deterministic rather than "whichever row Postgres returns first."

`membership_events` (append-only audit): `id` · **`membershipId` FK RESTRICT — NULLABLE** *(an orphaned
`checkout.session.completed` has no membership to attach; without nullable, its dedup row cannot be
written and a Stripe resend re-runs cancel+refund)* · `eventType`
**ENUM(`created`,`frozen`,`unfrozen`,`payment_failed`,`payment_recovered`,`suspended`,`unsuspended`,`cancellation_requested`,`cancelled`,`expired`,`renewed`,`orphan_subscription_refunded`)** ·
`actorUserId` FK nullable · `stripeEventId` STRING(255) nullable · `notes` TEXT · `metadata` JSONB ·
`occurredAt` DATE NOT NULL. Unique index on `stripeEventId` (partial, non-null) — **this is the
webhook replay-dedup store** (v1's C3).

> **Law: never mutate `memberships.status` without writing a `MembershipEvent` in the same transaction.**
>
> ⚠ **Enum-parity check — must cover `eventType`, not just `status`.** An earlier draft added a parity
> check that grepped only `status: '` literals, and immediately shipped an `expired` *event* write
> against an ENUM that lacked `expired` — recreating v1's A1 in the audit table instead of the status
> column. The check is: **grep every `eventType:` and every `status:` literal in this entire document
> and confirm each appears in its ENUM above.** Enum drift is this project's most repeated defect;
> it does not care which column it lands in.

**Purchase flow** — `backend/services/membershipPurchaseService.mjs`:
1. `createMembershipCheckout({ userId, locationId, planKey })` → Stripe Checkout Session in
   `subscription` mode, `metadata: { swanMembershipPlan, swanUserId, swanLocationId }`.
   **Pre-checkout guard (mandatory), and it MUST be serialized.** A plain read-then-open-session is
   a race: two tabs both pass the check, and the partial unique index **cannot save you here because
   no membership row exists yet at checkout-creation time** — by the time the index fires at
   `checkout.session.completed`, two Stripe subscriptions exist and the member has already been
   charged twice. So:
   ```js
   await sequelize.query('SELECT pg_advisory_xact_lock(hashtext($1))',
     { bind: [`membership-checkout:${userId}:${locationId}`], transaction: t });
   ```
   then check for an existing membership with status in
   (`active`,`past_due`,`frozen`,**`suspended`**) → return `409 ALREADY_A_MEMBER`.
   **`suspended` is included deliberately:** omitting it lets a member suspended for non-payment buy
   a fresh membership to escape the dunning ladder, and the debt disappears operationally. A
   suspended member must settle up, not re-buy.
2. **Webhook `checkout.session.completed`** → create the `Membership` row with `stripeSubscriptionId`
   and `stripeCustomerId` from the session, `status: 'active'`, event `created`. If the insert hits
   the active-membership unique index, **cancel the just-created Stripe subscription and refund**,
   then alert — never leave a paid-for orphan subscription.
3. **Webhook `invoice.paid`** → if it maps to a Membership: `status:'active'`, reset
   `dunningAttempt = 0`. Event is `created`-period-aware: write `payment_recovered` only when the
   membership was `past_due`; otherwise write `renewed` *(otherwise every routine monthly renewal
   logs as a recovery and the audit trail is noise)*.
4. **Webhook `customer.subscription.deleted`** → §2.7 path 2. **Mandatory.**

**Webhook replay contract (applies to every handler):** each handler writes a `membership_events`
row carrying `stripeEventId`. If that insert raises a unique violation, the event is a replay —
**catch it, roll back the handler's side effects, and return `200`.** A naive build 500s, Stripe
retries, exhausts, and dead-letters the event on Stripe's side — the silent drop this design exists
to prevent.

**EDIT `backend/webhooks/stripeWebhook.mjs`** — add a **resolver first**, before any handler:

```js
/**
 * Route a Stripe subscription event to the right subsystem. The AI feature tier (Subscription.mjs)
 * and gym memberships both live in Stripe; misrouting suspends the wrong thing or silently drops.
 * Returns 'membership' | 'ai_tier' | 'unknown'. UNKNOWN IS NOT A NO-OP — see below.
 */
async function resolveSubscriptionOwner(stripeSubscriptionId) { /* Membership → ai Subscription → null */ }
```

**No-match branch is mandatory** *(v1's C1 — v1 fell through to a silent 200)*: log ERROR, write an
`AdminNotification`, return 200 to Stripe (so it stops retrying) **but record it as a dead-letter**.
A subscription ID that matches nothing is an operational alarm, never silence.

**Routes** `/api/memberships`: `POST /checkout` (`protect`) · `GET /me` (`protect`) ·
`GET /` (`protect`+`adminOnly`, filter by location) · `POST /:id/freeze` · `POST /:id/unfreeze` ·
`POST /:id/cancel` (all `protect`+`adminOnly`).

**Freeze must touch billing** *(v1's C2 — v1 froze access and kept charging)*: when
`FREEZE_PAUSES_BILLING`, call Stripe `subscriptions.update(id, { pause_collection: { behavior: 'void' } })`;
unfreeze clears it with `subscriptions.update(id, { pause_collection: '' })`. If
`stripeSubscriptionId` is NULL (comped or manually-billed membership), skip the Stripe call and
freeze access only — **do not throw.** Auto-unfreeze at `frozenUntil` is §2.7 path 3.

**Cancel** sets `endsAt = now + cancellationNoticeDays` **and** Stripe `cancel_at` at that date, so no
renewal charge lands inside the notice window. **Status stays `active` through the window** — the
member paid for it. The terminal flip is §2.7, not this endpoint.

**Acceptance:** checkout session created with correct metadata · `checkout.session.completed` creates
a Membership with a non-null `stripeSubscriptionId` · replaying the same event creates **one** row
(dedup via `stripeEventId`) **and returns 200, not 500** · two memberships cannot share a
subscription ID (unique index) · freeze pauses Stripe collection **and** writes an event · freeze
with NULL `stripeSubscriptionId` succeeds without throwing · `invoice.paid` on a `past_due`
membership → `payment_recovered`; on an `active` one → `renewed` · **unknown subscription ID
produces an AdminNotification, not silence** · **`Subscription.mjs` has zero diff** (`git diff` empty).

**Termination tests (§2.7 — the v2-M2 regression; all three paths, each independently):**
- [ ] **Double-checkout:** two concurrent `createMembershipCheckout` for the same `(userId, locationId)` → second returns `409 ALREADY_A_MEMBER`. Then force two concurrent `checkout.session.completed` inserts → the unique index rejects one, and the orphaned Stripe subscription is cancelled + refunded.
- [ ] **Cancel keeps paid access:** cancel → `endsAt = +30d`, Stripe `cancel_at` set, **`status` still `active`**, and the member can still book on day 29.
- [ ] **Cancel terminates access:** advance clock past `endsAt`, run the lifecycle cron → `status='cancelled'`, and `bookIntoSlot` now throws `MEMBERSHIP_ENDED`.
- [ ] **Cron failure degrades closed:** with the lifecycle cron **disabled**, a membership past `endsAt` still cannot book — `assertCanBook`'s independent `endsAt` check must catch it. *(This is the test that proves the belt-and-suspenders is real.)*
- [ ] **`customer.subscription.deleted`** → `status='cancelled'` + event, including the Stripe-gave-up-after-retries path.
- [ ] **Auto-unfreeze:** `frozenUntil` in the past + cron run → `status='active'`, Stripe collection resumed, event `unfrozen`.
- [ ] **`expired` has a writer:** a `termMonths` membership past `endsAt` reaches `expired` (not stuck `active`).

---

### S2 — `ClassSeries` + `ClassSlot` + `ClassBooking`

**`20260728120000-create-class-tables.cjs`**

`class_series`: `id` · `locationId` FK RESTRICT NOT NULL · `instructorId` FK `"Users"` RESTRICT NOT NULL ·
`name` STRING(150) · `description` TEXT · `capacity` INTEGER NOT NULL **CHECK (capacity > 0)** ·
`durationMinutes` INTEGER NOT NULL default 60 · `recurrenceRule` STRING(255) (iCal RRULE) ·
`startTimeLocal` STRING(5) · `activeFrom` DATEONLY NOT NULL · `activeUntil` DATEONLY nullable
**CHECK (activeUntil IS NULL OR activeUntil >= activeFrom)** · `isActive` BOOLEAN default true ·
timestamps + `deletedAt`.

`class_slots`: `id` · `classSeriesId` FK nullable (one-offs allowed) · `locationId` FK RESTRICT NOT NULL ·
`instructorId` FK RESTRICT NOT NULL *(denormalized — per-occurrence substitute)* ·
`name` STRING(150) NOT NULL *(denormalized — renaming a series must not rewrite history)* ·
`capacity` INTEGER NOT NULL CHECK > 0 *(denormalized — capacity changes apply to future slots only)* ·
`startsAt` DATE NOT NULL (UTC) · `endsAt` DATE NOT NULL ·
`bookingCutoffMinutes` INTEGER NOT NULL default 0 ·
`status` ENUM(`scheduled`,`cancelled`,`completed`) default `scheduled` · `cancellationReason` TEXT · timestamps.
Indexes: `(locationId,startsAt)`, `(classSeriesId)`, `(instructorId,startsAt)`,
**unique `(classSeriesId,startsAt)` WHERE `classSeriesId IS NOT NULL` AND `status != 'cancelled'`**
(generator idempotency).

> ⚠ **The `status != 'cancelled'` predicate is load-bearing, not cosmetic.** S2.2 retires slots by
> flipping them to `cancelled` rather than deleting them (RESTRICT makes deletion impossible). If
> retired rows stayed in the unique index, rescheduling a series onto an instant where a retired row
> exists would make the generator's `ignoreDuplicates: true` **silently drop the new slot** — the
> class just never appears, with no error and no entry in `orphanedSlotIds`.

`class_bookings`: `id` · `classSlotId` FK **RESTRICT** NOT NULL · `userId` FK `"Users"` **RESTRICT** NOT NULL ·
`status` **ENUM(`booked`,`waitlisted`,`cancelled`,`late_cancelled`,`no_show`,`skipped_ineligible`) — all six of §2.4, verbatim** default `booked` ·
**`attendedAt` DATE nullable** ← *attendance lives here, not in status* ·
`waitlistedAt` DATE nullable · `bookedAt` DATE NOT NULL default CURRENT_TIMESTAMP ·
`cancelledAt` DATE · `promotedAt` DATE · **`skippedAt` DATE nullable** · **`skipReason` STRING(64) nullable** ·
`source` ENUM(`member`,`staff`,`admin`) default `member` · timestamps.

> ⚠ **Enum parity check before you run this migration:** every value written anywhere in this
> document must appear in the ENUM above. v1 shipped a `suspended` write against an ENUM that
> lacked it and fail-opened. Grep the doc for `status: '` and confirm each literal is listed.
> The partial unique index below intentionally covers only `booked` + `waitlisted`, so
> `skipped_ineligible` does not block a staff re-add.

**Critical partial unique index:**
```js
await queryInterface.addIndex('class_bookings', ['classSlotId', 'userId'], {
  name: 'class_bookings_one_active_per_user_per_slot',
  unique: true,
  where: { status: ['booked', 'waitlisted'] },
});
```

**Models:** `ClassSeries.mjs`, `ClassSlot.mjs`, `ClassBooking.mjs` per the S0 template.
**Associations** (all three edit points, written out): `ClassSeries.hasMany(ClassSlot,{as:'slots'})` /
`ClassSlot.belongsTo(ClassSeries,{as:'series'})` · `ClassSlot.hasMany(ClassBooking,{as:'bookings'})` /
`ClassBooking.belongsTo(ClassSlot,{as:'slot'})` · `ClassBooking.belongsTo(User,{foreignKey:'userId',as:'member'})` ·
`ClassSlot.belongsTo(User,{foreignKey:'instructorId',as:'instructor'})` ·
`ClassSlot.belongsTo(Location,{as:'facility'})` · `ClassSeries.belongsTo(Location,{as:'facility'})`.

**`backend/services/classBookingService.mjs`** — obeys §2.3:

```js
export async function bookIntoSlot({ userId, classSlotId, source = 'member' }) {
  return sequelize.transaction(async (t) => {
    // LOCK ORDER §2.3: slot FIRST, always.
    const slot = await ClassSlot.findByPk(classSlotId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!slot) throw new NotFoundError('CLASS_SLOT_NOT_FOUND');
    if (slot.status !== 'scheduled') throw new ConflictError('CLASS_NOT_BOOKABLE');

    const cutoff = new Date(slot.startsAt.getTime() - slot.bookingCutoffMinutes * 60_000);
    if (new Date() >= cutoff) throw new ConflictError('BOOKING_CLOSED');

    await assertCanBook({ userId, slot }, t);            // §2.5 — fail-closed entitlement

    const booked = await ClassBooking.count({
      where: { classSlotId, status: 'booked' },           // §2.4 — 'booked' is the ONLY seat-holding status
      transaction: t,
    });
    const isFull = booked >= slot.capacity;

    try {
      const booking = await ClassBooking.create({
        classSlotId, userId, source,
        status: isFull ? 'waitlisted' : 'booked',
        waitlistedAt: isFull ? new Date() : null,
      }, { transaction: t });
      return { booking, waitlisted: isFull };
    } catch (err) {
      // v1's B4: map the index violation to a domain error. Do NOT leak SequelizeUniqueConstraintError.
      if (err?.name === 'SequelizeUniqueConstraintError') throw new ConflictError('ALREADY_BOOKED');
      throw err;
    }
  });
}
```

**Errors:** create `backend/utils/domainErrors.mjs` exporting `NotFoundError`, `ConflictError`,
`ForbiddenError` (each with a `code` and an HTTP status). Route layer maps `code` → response.
*(v1 referenced these and never defined them — D2.5.)*

**Generator** `backend/services/classSlotGeneratorService.mjs` — `rrule` for dates,
`zonedWallClockToUtc` per occurrence (§2.2), horizon 90 days. **Race-safe insert** *(v1's B3 —
`findOrCreate` loses to its own two stated triggers)*:
```js
await ClassSlot.bulkCreate(rows, { transaction: t, ignoreDuplicates: true });
```
Registered as `backend/services/classSlotGeneratorCron.mjs` exporting `startClassSlotGeneratorScheduler`,
wired in `backend/core/startup.mjs` beside `startSessionReminderScheduler` (~:593). Daily. Also
invoked on series create/edit.

**Routes** `backend/routes/classRoutes.mjs` → `/api/classes` (`protect` on all):

| Method | Path | Guard | Notes |
|---|---|---|---|
| GET | `/slots?locationId&from&to` | `protect` | returns `spotsRemaining`, never member names |
| GET | `/slots/:id` | `protect` | counts only |
| POST | `/slots/:id/book` | `protect` | → `bookIntoSlot` |
| GET | `/slots/:id/roster` | `trainerOrAdminOnly` | names — staff only |
| POST | `/series` · PUT `/series/:id` | `adminOnly` | see S2.2 |
| POST | `/slots/:id/cancel` | `trainerOrAdminOnly` | cancels the class *(backs the wireframe button — v1's E4)* |

**S2.2 — series edit semantics** *(v1's A7 was undecided; deciding it now)*

> **`PUT /series/:id` NEVER issues a DELETE against `class_slots`.** `class_bookings.classSlotId` is
> `RESTRICT` and `class_slots` is not paranoid, so a slot carrying *any* booking row — including
> fully-cancelled ones — cannot be deleted at all; the statement raises an FK violation. "Delete the
> empty ones" is therefore not a buildable instruction. Retirement is a **status flip**, never a delete.

`PUT /series/:id` updates future slots (`startsAt > now`) in place:

| Field changed | Behaviour |
|---|---|
| `name`, `durationMinutes` | propagate to all future slots |
| `instructorId` | propagates **only** to future slots whose `instructorId` still equals the series' *previous* value — this preserves per-occurrence substitutes, which is the entire reason the column is denormalized |
| `capacity` **increase** | propagates, **then runs `promoteFromWaitlist` on each affected slot** under the §2.3 lock — otherwise a class gets bigger while its waitlist sits and the seats stay empty until a cancel that may never come |
| `capacity` **decrease** | propagates only to slots whose current `booked` count ≤ new capacity; slots that would strand booked members are skipped and returned as `skippedSlotIds` |
| `recurrenceRule`, `startTimeLocal` | future slots with **zero booking rows of any status** are set `status='cancelled'` (**not deleted**) with `cancellationReason='series_rescheduled'`; slots with any booking rows are left untouched and returned as `orphanedSlotIds` for staff. The generator then materializes the new pattern; the `(classSeriesId, startsAt)` unique index makes that safe to re-run. |

Response: `{ updatedSlotIds, skippedSlotIds, orphanedSlotIds, promotedBookingIds }`. Staff must be
able to see exactly what the edit did and did not touch.

**Acceptance:** migrations up+down · **capacity race: `capacity:1`, two concurrent `bookIntoSlot` via
`Promise.all` → exactly one `booked`, one `waitlisted`; 10 consecutive runs** · double-book → second
throws `ALREADY_BOOKED` (the mapped domain error, *not* a Sequelize error), one row ·
cancel-then-rebook succeeds · booking past cutoff → `BOOKING_CLOSED` · **no membership →
`NO_ACTIVE_MEMBERSHIP`** · wrong-location membership → `NO_ACTIVE_MEMBERSHIP` · `open_gym_only` →
`CLASSES_NOT_INCLUDED` · `limited` at quota → `PERIOD_LIMIT_REACHED` · generator run twice → count
unchanged · **generator run twice concurrently → count unchanged, no unhandled rejection** ·
DST: weekly 06:30 across a boundary stays 06:30 local · capacity-decrease with a full future slot →
slot skipped, id returned · `git diff backend/models/Session.mjs` empty.

---

### S3 — Cancel + waitlist promote *(the transaction v1 omitted)*

**`backend/services/classCancellationService.mjs`** — single transaction, §2.3 order:

```js
/**
 * Cancel a booking and promote the next waitlisted member atomically.
 *
 * LOCK ORDER (§2.3): class_slots FIRST, then class_bookings. v1 deadlocked because a waitlisted
 * member's self-cancel locked their booking row before the slot, inverting against a booked
 * member's cancel. Everything here takes the slot lock first — including the caller's own row.
 */
// actorRole comes from req.user.role at the route layer — NOT a user id, and NOT a DB lookup
// inside this locked transaction. Passing an id to a role predicate makes isStaff() always false,
// which silently forbids every legitimate staff cancel.
export async function cancelBooking({ bookingId, actorUserId, actorRole }) {
  return sequelize.transaction(async (t) => {
    // 1. Read (NO lock) purely to discover the slot id.
    const peek = await ClassBooking.findByPk(bookingId, { transaction: t });
    if (!peek) throw new NotFoundError('BOOKING_NOT_FOUND');

    // 2. Lock the SLOT first — this is the ordering rule that removes the deadlock.
    const slot = await ClassSlot.findByPk(peek.classSlotId, { transaction: t, lock: t.LOCK.UPDATE });

    // 3. NOW re-read the booking under lock (it may have changed between 1 and 2).
    const booking = await ClassBooking.findByPk(bookingId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!['booked', 'waitlisted'].includes(booking.status)) throw new ConflictError('BOOKING_NOT_ACTIVE');
    if (booking.userId !== actorUserId && !isStaff(actorRole)) throw new ForbiddenError('NOT_YOUR_BOOKING');

    const hoursOut = (slot.startsAt.getTime() - Date.now()) / 3_600_000;
    const isLate = hoursOut < LATE_CANCEL_HOURS && booking.status === 'booked';

    const freedASeat = booking.status === 'booked';
    await booking.update({
      status: isLate ? 'late_cancelled' : 'cancelled',
      cancelledAt: new Date(),
    }, { transaction: t });

    // 4. Promote only if a real seat was freed. Waitlist self-cancel frees nothing.
    const promoted = freedASeat ? await promoteFromWaitlist(slot, t) : null;
    return { booking, promoted, late: isLate };
  });
}
```

**`backend/services/classWaitlistService.mjs`** — note it receives the **already-locked slot**, so it
never re-acquires or inverts:

```js
/**
 * Promote the longest-waiting member. Receives an ALREADY-LOCKED slot (§2.3) — it must never
 * acquire the slot lock itself, or it reintroduces the inversion this design removed.
 */
export async function promoteFromWaitlist(lockedSlot, t) {
  if (lockedSlot.status !== 'scheduled') return null;
  if (new Date(lockedSlot.startsAt) <= new Date()) return null;   // never promote into a class that already ran

  const booked = await ClassBooking.count({
    where: { classSlotId: lockedSlot.id, status: 'booked' }, transaction: t,
  });
  if (booked >= lockedSlot.capacity) return null;

  const next = await ClassBooking.findOne({
    where: { classSlotId: lockedSlot.id, status: 'waitlisted' },
    order: [['waitlistedAt', 'ASC']],        // FIFO
    transaction: t, lock: t.LOCK.UPDATE,     // safe: slot lock already held
  });
  if (!next) return null;

  try {
    await assertCanBook({ userId: next.userId, slot: lockedSlot }, t);   // §2.5 — a promotion IS a booking
  } catch (err) {
    // ONLY a genuine entitlement refusal skips this member. A bare `catch {}` here would treat a
    // connection reset or statement timeout as ineligibility and permanently destroy the queue
    // position of a member who did nothing wrong.
    if (!(err instanceof ForbiddenError)) throw err;

    // 'skipped_ineligible' — NOT 'cancelled'. The member did not cancel; the system passed them
    // over. Distinct status keeps the audit honest and lets staff re-add them.
    await next.update({ status: 'skipped_ineligible', skippedAt: new Date(), skipReason: err.code },
      { transaction: t });
    notifyAfterCommit(next.userId, 'WAITLIST_SKIPPED', err.code);   // they must be told, not silently dropped
    return promoteFromWaitlist(lockedSlot, t);    // try the next member
  }

  await next.update({ status: 'booked', promotedAt: new Date() }, { transaction: t });
  return next;
}
```

**Notifications fire after commit, never inside the transaction** — a failed send must not roll back
a valid promotion.

`notifyAfterCommit(userId, kind, detail)` is **not an existing helper — create it** in
`backend/services/classNotificationQueue.mjs`. It pushes onto an in-memory array that the *caller*
drains after `sequelize.transaction()` resolves, then calls
`notificationService.sendNotification({ type, title, message, recipients: [userId] })`. Wrap the
drain in try/catch and log failures — a dropped notification must never surface as a failed booking.

**Every promotion notifies.** The success path (`status='booked'`, `promotedAt=now`) sends
`WAITLIST_PROMOTED` — in cancel-promote, capacity-increase promote, and staff promote alike.
A member who silently gains a seat and does not show up is worse than never promoting them.

**Staff manual promote** — `POST /api/classes/bookings/:id/promote` (`trainerOrAdminOnly`), same lock
order *(backs the wireframe `[PROMOTE]` button)*. **Mark no-show** —
`POST /api/classes/slots/:id/mark-no-shows` (`trainerOrAdminOnly`), sets `status:'no_show'` for
`booked` rows with `attendedAt IS NULL` after `startsAt` *(backs `[MARK REMAINING NO-SHOW]`)*.

**Class cancellation** — `cancelClassSlot({ classSlotId, reason, actorRole })`, single transaction,
§2.3 lock order. Slot → `status:'cancelled'` + `cancellationReason`; **then flip every `booked` and
`waitlisted` row to `cancelled` and notify each member.** This is mandatory, not cosmetic: a
`booked` row on a cancelled class is counted by `periodStart` usage forever, so leaving them
stranded permanently consumes a `limited` member's allowance for a class the gym cancelled. No
promotion runs (the slot is no longer `scheduled`).

**Acceptance:** full class + 3 waitlisted, 1 booked cancels → **earliest `waitlistedAt` promoted**,
other two untouched · **deadlock test: a booked member and a waitlisted member cancel concurrently,
10 runs, zero deadlock errors** *(this is the v1 B1 regression — it must be an explicit test)* ·
cancel inside 12h → `late_cancelled`, seat still freed, promotion still runs · waitlist self-cancel
promotes nobody · notification failure does not roll back the promotion (mocked throwing sender) ·
two concurrent cancels → exactly one promotion.

**Promotion-skip tests (the v2-N2 regression):**
- [ ] Promotion of a **suspended** member → that row becomes `skipped_ineligible` (**not** `cancelled`), the member is notified, and the next eligible member is promoted instead.
- [ ] **`assertCanBook` throwing a non-`ForbiddenError` (mock a DB timeout) propagates and rolls the transaction back — it must NOT mark the member skipped.** *(A bare `catch {}` would silently destroy a valid queue position; this test is the whole point.)*
- [ ] Entire waitlist ineligible → recursion terminates, returns null, no infinite loop.
- [ ] Cancelling a booking on a **past** slot promotes nobody.
- [ ] A `skipped_ineligible` member can be re-added by staff (the partial unique index must not block it).

---

### S4 — `CheckIn` *(depends on S1 + S2 — stated honestly)*

**`20260728130000-create-check-ins.cjs`** — `check_ins`: `id` · `userId` FK RESTRICT NOT NULL ·
`locationId` FK RESTRICT NOT NULL · `classBookingId` FK nullable (open-gym has none) ·
**`membershipId` FK nullable — created HERE** *(v1's E2: assigned to a slice that never made it)* ·
`method` ENUM(`kiosk`,`staff`,`qr`,`app`,`door`) · `checkedInAt` DATE NOT NULL · timestamps.
Indexes `(userId,checkedInAt)`, `(locationId,checkedInAt)`.
**Idempotency is a 5-minute lookback — but a lookback alone is read-then-write and races.** Two
concurrent calls (kiosk double-tap, door-controller retry, an S6 retry after timeout) both miss the
read and both insert. Serialize with a transaction-scoped Postgres advisory lock, which needs no
extra column and releases automatically at commit:

```js
// Serializes all check-in attempts for this (user, location) pair for the life of the transaction.
await sequelize.query(
  'SELECT pg_advisory_xact_lock(hashtext($1))',
  { bind: [`checkin:${userId}:${locationId}`], transaction: t },
);
```

`backend/services/checkInService.mjs` → `checkIn({ userId, locationId, method })`, all inside one transaction:
0. Take the advisory lock above **before** the lookback.
1. Lookback: existing check-in for this user+location within 5 min → return it, do not insert.
2. Resolve active membership → `membershipId`.
3. Find a `booked` booking for this user at this location with `startsAt` within ±30 min. **If two
   match, choose the nearest `startsAt`** *(v1's tie-break was unstated — D2.16)*.
4. If found: **lock that booking's `class_slots` row first (§2.3), then** set `attendedAt = now` on
   the booking. **Do NOT change `status`** — §2.4; the member still holds the seat. *(This is v1's
   A3 fixed at the root.)*

> **Lock order for check-in is `advisory → class_slots → class_bookings`.** §2.3 names check-in
> attachment explicitly, and an earlier draft of this slice mutated a booking with only the advisory
> lock held — the doc's own code failing the doc's own reviewer gate. The advisory lock is keyed on
> `(userId, locationId)` and no other path acquires it, so it adds no cycle; but the booking write
> still needs its slot lock like every other booking mutation.

**Routes** `/api/checkin`: `POST /` (`protect` + `trainerOrAdminOnly` for kiosk/staff) ·
`GET /today?locationId` (`trainerOrAdminOnly`).

**Acceptance:** no class → row created, `classBookingId` null · 10 min before a booked class →
`attendedAt` set, **`status` still `booked`** · **capacity invariant: after check-in, `count(booked)`
is unchanged and a waitlisted member is NOT promoted** *(the explicit v1-A3 regression test)* ·
3 hours early → not attached · two classes in the window → nearest chosen ·
**two CONCURRENT check-ins for the same user+location (`Promise.all`) → exactly one row, 10
consecutive runs** *(the v2-N6 regression — a sequential-only test passes while the race dupes)*.

---

### S5 — Dunning ladder

**EDIT `stripeWebhook.mjs`** — `invoice.payment_failed` → `resolveSubscriptionOwner` (S1) →
membership branch → `membershipDunningService`. AI-tier path untouched. Unknown → dead-letter alarm.

**`backend/services/membershipDunningService.mjs`** — state lives in
`memberships.dunningAttempt` / `dunningStartedAt` (S1), dedup in `membership_events.stripeEventId`.
*(v1's C3: "idempotent" with nowhere to store state.)*

> 🔴 **The clock starts ONCE.** Stripe emits a *new* `invoice.payment_failed` for every retry
> (≈ days 3, 5, 7 by default), each with a fresh `stripeEventId` that replay-dedup will not catch.
> If each one re-runs "failure 1", `dunningStartedAt` resets and **day 10 never arrives** — a
> non-paying member stays `past_due` forever, and `past_due` is deliberately allowed to book. The
> rule below is what prevents that, and it is not optional.

| Trigger | Action |
|---|---|
| `payment_failed` **and** `dunningStartedAt IS NULL` | `status:'past_due'`, `dunningAttempt=1`, **`dunningStartedAt=now`**, notify, event |
| `payment_failed` **and** `dunningStartedAt IS NOT NULL` | `lastPaymentFailedAt=now`, event only. **Never touch `dunningStartedAt`.** |
| cron: day 3 since `dunningStartedAt` | reminder, `dunningAttempt=2` |
| cron: day 7 | final notice, `dunningAttempt=3` |
| cron: day `DUNNING_SUSPEND_DAY` (10) | **`status:'suspended'`** → blocks booking (§2.5) + door (S6), event `suspended` |
| `invoice.paid` | `status:'active'`, `dunningAttempt=0`, **`dunningStartedAt=NULL`** (re-arms the clock), event `payment_recovered` |
| `customer.subscription.deleted` | §2.7 path 2 — Stripe gave up. `status:'cancelled'`. |

**Ownership rule (removes the webhook-vs-cron ambiguity):** the webhook owns *starting* and *clearing*
the clock; the cron owns *advancing* it. Neither writes the other's field.

Advancement is driven by `backend/services/membershipDunningCron.mjs` exporting
`startMembershipDunningScheduler`, registered in `core/startup.mjs`. It scans `status='past_due'`
and advances by days elapsed since `dunningStartedAt` — **it does not rely on Stripe's retry
schedule**, which varies per account *(v1's C3)*.

**Acceptance:** `payment_failed` on a membership → `past_due` + event · **the same event replayed
does not advance `dunningAttempt`** (dedup) · **AI-tier subscription `payment_failed` behaves exactly
as before — explicit regression test on both paths** · unknown subscription ID → AdminNotification,
no state change · **day-10 sets `status:'suspended'` and the UPDATE succeeds** *(the direct v1-A1
regression: assert the value is accepted by the ENUM)* · **suspended member's `bookIntoSlot` throws
`MEMBERSHIP_SUSPENDED` — the specific code, not `NO_ACTIVE_MEMBERSHIP`** *(the v2-N1 regression: this
test failed against the dead-code gate)* · frozen member gets `MEMBERSHIP_FROZEN`, likewise specific ·
`invoice.paid` → `active`, `dunningAttempt=0`, `dunningStartedAt=NULL`, booking works again.

**Dunning-clock tests (the v2-M3 regression):**
- [ ] **Three distinct `payment_failed` events on days 0/3/5 → `dunningStartedAt` equals the day-0 value, unchanged.** Then on day 10 the cron suspends. *(A literal "failure 1" re-run resets the clock and suspension never lands — that was the bug.)*
- [ ] Cron does not write `dunningStartedAt`; webhook does not write `dunningAttempt` beyond the initial 1. Ownership boundary holds.
- [ ] Pay → fail again later → clock re-arms from the new failure (not from the old one).

---

### S6 — Door access authorization

Vendor-neutral: we expose the decision endpoint the hardware calls.

**`20260728140000-create-location-access-keys.cjs`** *(v1's C4: "per-location API key" with no store)*:
`location_access_keys`: `id` · `locationId` FK RESTRICT NOT NULL · `label` STRING(100) ·
`keyHash` STRING(255) NOT NULL (**bcrypt hash — never the plaintext key**) · `lastFour` STRING(4) ·
`isActive` BOOLEAN default true · `lastUsedAt` DATE · `revokedAt` DATE · timestamps.

**`POST /api/access/verify`** — **POST, not GET** *(v1's C4d: a GET that writes check-in rows gets
retried/prefetched into phantom check-ins)*. Header `X-Access-Key`. Body `{ memberRef, locationId }`.

**Key format and lookup.** A bcrypt hash is not an indexable lookup key — you cannot
`WHERE keyHash = ?`. Issue keys as **`<keyId>.<secret>`** (e.g. `7f3a.9kQ…`), where `keyId` is the
row's public identifier. Lookup is then a single indexed fetch by `keyId`, followed by one
`bcrypt.compare(secret, row.keyHash)`. **Do not scan all keys for the location** — that is N bcrypt
verifies per door swipe and a trivial timing-DoS on the one endpoint that must always answer fast.
Add `keyId` STRING(32) UNIQUE NOT NULL to `location_access_keys`; keep `lastFour` for display only,
never for lookup.

Order of operations is fixed and must not be rearranged:
1. **Wrap the ENTIRE handler, auth included, in try/catch** — the key lookup touches the DB and
   bcrypt, so a DB outage during *authentication* must also fail closed rather than throw an
   unhandled 500. Any throw → `200 { allow:false, reason:'SYSTEM_ERROR' }`.
2. Validate `X-Access-Key` by `keyId` + `bcrypt.compare` as above, scoped to `locationId` and
   `isActive`. Invalid/missing → **`401`, empty body**. No membership data in the response.
   **Fail-closed. Never fail open on a door.**
3. Resolve membership → decide.
4. On allow, record via `checkInService.checkIn({ method:'door' })` so the 5-min idempotency applies.

Deny reasons: `NO_ACTIVE_MEMBERSHIP` · `MEMBERSHIP_FROZEN` · `MEMBERSHIP_SUSPENDED` ·
`WRONG_LOCATION` · `OUTSIDE_HOURS` (uses `locations.opensAt`/`closesAt` from S0; **NULL hours = allow**,
stated explicitly so it is a decision, not an accident) · `SYSTEM_ERROR`.

`memberRef` is the membership id or a member number — **never a raw `userId`**, and the response
returns `memberName` only on allow. Rate-limit the endpoint per key with the existing
`rateLimiter` from `authMiddleware.mjs` (:826) *(v1's C6: a stolen key enumerated the roster)*.

**Acceptance:** active + right location + inside hours → `allow:true`, check-in row with
`method:'door'` · suspended / frozen / wrong location → `allow:false` + correct reason ·
NULL hours → allowed · outside hours → `OUTSIDE_HOURS` · **DB throws → `allow:false`** ·
missing/invalid key → `401` with **no body content** · two verifies within 5 min → one check-in row ·
rate limit trips after N.

---

## 4. Dependency chain (honest — v1's E1/E5)

```
S0 Location ──┬── S1 Membership+Purchase ──┬── S2 Classes ── S3 Cancel/Promote
              │                            ├── S5 Dunning
              │                            └── S6 Door ◄── S4 CheckIn ◄── S2
              └── (S0.2 backfill)
```

**This is a chain, not seven independent slices.** Each slice leaves the system coherent and has a
working `down`. Hard dependencies: S2 needs S1 (entitlement gate) · S3 needs S2 · S4 needs S1 **and**
S2 · S5 needs S1 · S6 needs S1 and S4.

## 5. Rollback
Unwind S6 → S0. No slice drops or rewrites a pre-existing column. `Session.location` and
`Subscription.mjs` are never modified — that is what makes every rollback safe.

## 6. Test file locations
`backend/tests/unit/<service>.test.mjs` · `backend/tests/api/<route>.test.mjs`. Concurrency tests
need a real Postgres transaction — do not mock the DB for the race, deadlock, or generator tests.

## 7. Verification before declaring any slice done
`node --check` every touched `.mjs` · migration up **and** down on a scratch DB · backend boots ·
the slice's acceptance list, each with pasted output · **Rule 42 pre-push audit**
(`git ls-files --others --exclude-standard backend/` and `git diff --name-only HEAD backend/`) ·
secret scan.

## 8. Out of scope — do not build
**Frontend/UI entirely** *(v1 wireframed two screens and scheduled zero frontend files — the
wireframes now live in v1 §3 as design reference for a separate frontend work order)* · card-present
POS hardware · payroll export · consumer marketplace · Mindbody data import (audit Phase 3) ·
multi-tenant white-label.

## 9. STOP — comment on SWA-74, do not guess

1. **Membership plan catalog.** S1 takes a `planKey`; where plans are defined (a `membership_plans`
   table vs. Stripe Price IDs in config) is **undecided**. Building either is wrong without the answer.
2. **Member identifier for the door.** `memberRef` must not be a raw `userId`; whether it is the
   membership id, a printed member number, or a fob id depends on the hardware Sean's gym uses —
   audit Phase 0 Q5.
3. **`CLASS_CONSUMES_SESSION_CREDIT`.** Default `false` (§1). If Sean flips it, the enforcement path
   (which ledger decrements, what happens at zero, refund on cancel) is **not built** and needs its
   own slice. Do not improvise a money path.
4. **Whether gym members are role `client` or role `user`.** `User.mjs:124` has both. §2.5 keys off
   Membership, not role, so this does not block the build — but the signup path that creates gym
   members must pick one, and it is not in scope here.
