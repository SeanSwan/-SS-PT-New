---
decision: Proposal for provisioning the verification fixtures — scope reduced after finding the existing mock-based e2e pattern
status: awaiting Sean's approval — NOTHING has been executed
originating_model: claude-opus-5
linear: SWA-187
supersedes: the fixture table in USER-DASHBOARD-LIVE-AUTH-PASS-HANDOFF §0.5
---

# Fixture provisioning — proposal, not action

**Nothing in this document has been done.** It exists for Sean to approve, amend, or
reject before anything touches production. Per the handoff's RED PATH, a verification
agent changes nothing on its own.

## The headline: this got much smaller

The handoff's §0.5 said six fixtures were needed, one of them blocked on hand-placing R2
objects. That was written before I checked what `frontend/e2e/` already does.

The established pattern for protected surfaces (`admin-workout-surfaces-protected-smoke.spec.ts`)
injects a synthetic JWT into `localStorage` and intercepts `**/api/**` with
`route.fulfill`. **No real account, no real database, no real photo, no PII.** Every
journey that tests *frontend behaviour* — the slider, empty states, routing, activity
ordering, layout, contrast, and crucially the forced-failure test — can be driven that way.

So the fixture question reduces to one honest residue:

> **Does a successful save actually persist to the database?**

A mocked `200` proves the UI believes the save worked. It cannot prove a row changed.
That is the only claim requiring real data, and it is the direct descendant of Wave 1's
P0 (a handler that reported success while writing nothing).

## What I propose, in order of increasing intrusiveness

### Option A — API-only round-trip, no browser, no UI (RECOMMENDED)

Prove persistence at the layer where persistence happens:

1. Sean creates **one** account via the normal signup flow — a synthetic identity
   (placeholder name, a mailbox he controls, no real health data). Records the **user ID
   only** into SWA-187; never the email or name (Rule 8).
2. With that account's token: `GET /api/profile` → capture current values.
3. `PUT /api/profile` with changed values for the thirteen fields the Settings hub
   submits.
4. `GET /api/profile` again → assert every field changed.
5. `PUT` the captured originals back → `GET` → assert restored.

**Why this is the right shape:** it touches one synthetic row, is fully reversible, needs
no photos, no R2, no browser, no screenshots, and produces booleans rather than values.
It answers the only question a mock cannot. It can be a script, run once, and re-run any
time.

**Risk:** creates one account row in the production database. That is the minimum
possible footprint for proving a database write, and it is the same footprint as any real
signup.

### Option B — A, plus a browser pass on the same account

Everything in A, then log that account into production in a real browser to confirm the
*UI* round-trip (form → save → fresh session → values still there). Adds the
click-through the handoff describes, on synthetic data only.

**Additional risk:** none beyond A, provided the account holds no real data and no
screenshots leave the machine. The AI-observed-browser restriction in §2 is satisfied
because there is no PII to observe.

### Option C — full fixture set including transformation photos

Only needed if you want the *photo* surfaces exercised against real stored media rather
than mocked responses. Requires, per `clientPhotoRoutes.mjs` + `photoRecordValidation.mjs`:

1. Two image objects placed in R2 under `photos/{category}/{clientId}/…` for the synthetic
   client id.
2. Two `POST /api/photos/:userId` calls recording `url` + `storageKey` + a matching
   `photoType`, via the admin path (the only working uploader — `PhotoManager.tsx` takes
   the url and key typed by hand).
3. A feed post embedding the pair.

**My recommendation: skip C for now.** The slider is interaction logic; a mocked pair
exercises it identically in a real browser, and Playwright spec 2 would cover it
permanently. C buys confidence that R2-backed images render — worth doing eventually,
not worth blocking this slice on.

## What I need from you

1. **Approve A, A+B, or all three** — or tell me to stand down entirely.
2. **Who creates the account.** I'd rather you did it through the normal signup UI than
   have me insert a row; a real signup exercises the real path and leaves normal data.
3. **Confirm the identity is genuinely synthetic** — placeholder name, no real health
   notes or emergency contact, and I record only the numeric user ID anywhere.

## What I will NOT do without a further explicit yes

- Write to any account that is not the synthetic one.
- Insert rows directly into the database rather than through the app's own endpoints.
- Place objects in R2.
- Put any field value, name, email, or photo URL into Linear, a Hermes memo, a `PROOF:`
  line, or a screenshot.
- Run any of this against a real member because a synthetic one is inconvenient.

## Standing caveat

**There is no staging environment.** `render.yaml` defines `swanstudios-main` and
`swanstudios-frontend`, both on `branch: main`, against one database `swanstudios-db`.
Production is the only environment there is, which is exactly why this proposal keeps the
footprint to a single synthetic row and prefers mocks for everything else. A staging
environment with a disposable database was recommended by a panel seat and remains the
right long-term answer; it is its own piece of work.
