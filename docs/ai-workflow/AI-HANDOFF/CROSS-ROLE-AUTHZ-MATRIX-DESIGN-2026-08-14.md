# Cross-Role Authorization Matrix — Design for Review

**Date:** 2026-08-14
**Status:** DESIGN — not built. Submitted for external hostile review before implementation.
**Author:** Claude Opus 5 (session c79ecc69)
**Reviewers requested:** Kimi K3, HY3
**Companion:** `LAUNCH-READINESS-PLAYWRIGHT-BRIEF-2026-08-14.md` (the same-role audit this closes the gap in)

---

## 1. The gap this exists to close

The launch-readiness harness walks **each role through its own pages**. It never attempts a
crossing. Structurally it cannot find broken access control: a client reaching an admin screen, a
trainer reading another trainer's clients, a free `user` reaching paid `client` surfaces.

This is OWASP A01 (Broken Access Control) — the highest-consequence untested surface before a
launch that handles payment data, minors' data, and (via the immigration tracker) life-critical
personal records.

**Nothing in the existing audit covers this. A 100%-green launch audit is compatible with a total
authorization failure.**

---

## 2. Threat model — the 12 crossings

Roles are `'admin' | 'trainer' | 'client' | 'user'`
(source: `frontend/src/routes/protected-route.tsx:125-126`, verified).

Four roles, each attempting the other three's surfaces = **12 crossings**. Not all are equal:

| # | Actor | Target | Consequence if open | Priority |
|---|-------|--------|---------------------|----------|
| 1 | client | admin | Total compromise — billing, all client PII, role grants | **P0** |
| 2 | user | admin | Same, from an unpaid account | **P0** |
| 3 | trainer | admin | Privilege escalation to operator | **P0** |
| 4 | trainer | trainer (other's clients) | PII breach across trainers; contract/trust breach | **P0** |
| 5 | client | client (other's data) | PII breach — measurements, photos, notes, health | **P0** |
| 6 | user | client | Paywall bypass — revenue loss, not a breach | **P1** |
| 7 | client | trainer | Sees coaching tools, other clients' plans | **P1** |
| 8 | user | trainer | As above from unpaid account | **P1** |
| 9 | admin | * | By design — admins bypass. Assert it is *intentional*, not accidental | P2 |
| 10-12 | user | user (another user's data) | **PII breach** — private posts, friendships, group membership | **P0** |

**Launch blocker = any P0 crossing that returns 200 with another party's data.**

> **Rows 10-12 were rated P2 in this document's first draft**, on the reasoning that "user surfaces
> are the least privileged." That reasoning was wrong and my own review pass caught it. Privilege
> level is not the same as data sensitivity: the `social/` routes are user-level and hold private
> posts, social graph, and group membership. A user reading another user's private content is a
> straightforward PII breach regardless of how few privileges either account holds. Low privilege
> is not low consequence — and the horizontal user-to-user crossing is the single most likely one
> to exist in the wild, because it is the one a role-centric threat model forgets to look for.

---

## 3. The core design decision: assert at BOTH layers

A frontend redirect is **not** authorization. If `ProtectedRoute` redirects a client away from
`/dashboard/admin` but `GET /api/admin/clients` still returns 200 to that client's token, the data
is breached — the attacker never opens a browser.

Every matrix cell therefore asserts **twice**:

- **Layer 1 — route guard (browser).** Navigate as role A to role B's route. Expect redirect or a
  denial surface. Never expect the page to render.
- **Layer 2 — API (token).** Call role B's endpoint with role A's session token directly.
  Expect `401`/`403`/`404`. **A 200 here is a LAUNCH BLOCKER regardless of what Layer 1 did.**

Layer 2 is the one that matters. Layer 1 alone produces exactly the false green this design exists
to prevent.

---

## 4. Prioritized target list — evidence, not assumption

Measured 2026-08-14. **Verified identical on `HEAD` and `origin/main`** —
`git diff HEAD origin/main -- backend/routes/` is empty, so these counts describe what deploys:

- **230** backend route files total
- **55** take a `:userId` or `:clientId` parameter
- **25** use `verifyClientAccess`
- **37** take a client/user identifier **without** that guard

> **Instrument note — read this before trusting any count in this document.** The first pass of
> this section reported 196/51/25/33. Those numbers were wrong. The shell glob
> `backend/routes/*.mjs` does not recurse, so **34 route files in subdirectories were invisible to
> the measurement** — including the entire `social/` route family. The corrected counts come from
> `git grep`/`git ls-tree -r`, which do recurse. Every count above was re-derived with the
> recursive instrument and cross-checked against `origin/main`.
>
> This is the same failure class as the orphaned-SHA defect in the companion brief: a tool answered
> confidently about a scope narrower than the question. Any reviewer or builder extending this
> target list must re-derive with a recursive instrument, not a shell glob.

**These 33 are a test-target list, not a findings list.** Absence of `verifyClientAccess` is not
proof of a vulnerability — many are legitimately admin-only (guarded by `adminMiddleware`),
self-scoped to `req.user.id`, or use a different guard. Each must be *tested*, not assumed broken.
Reporting them as 33 vulnerabilities would repeat the previous audit's false-finding failure.

Ordered by consequence:

**Tier 1 — PII / life-critical (test first)**
`immigrationRoutes.mjs` (life-critical, admin-only by intent — verify), `clientNoteRoutes.mjs`,
`clientPhotoRoutes.mjs`, `clientNutritionRoutes.mjs`, `messagingRoutes.mjs`,
`clientAnalyticsRoutes.mjs`, `clientWorkoutRoutes.mjs`, `dailyWorkoutFormRoutes.mjs`,
**`social/posts.mjs`, `social/friendships.mjs`, `social/groupMembership.mjs`,
`masterPrompt/privacy.mjs`**

The four bolded entries are the files the non-recursive glob hid. They are not a footnote: the
`social/` family is the classic home of horizontal IDOR — reading another user's private posts,
altering someone else's friendships, adding yourself to a group you were never invited to. These
are **user-to-user** crossings (rows 5 and 10-12 of §2), the one direction a trainer/admin-centric
threat model most easily under-weights. Had this design shipped on the first measurement, the
matrix would have been built with the social surface entirely absent and still reported full
coverage of its target list.

**Tier 2 — money / privilege**
`adminChargeCardRoutes.mjs`, `subscriptionRoutes.mjs`, `customPackageRoutes.mjs`,
`roleRoutes.mjs` (role grants — escalation vector), `featureFlagRoutes.mjs`,
`clientTrainerAssignmentRoutes.mjs` (assignment forgery = manufactured access to any client)

**Tier 3 — operational**
`adminClientRoutes.mjs`, `adminWorkoutLoggerRoutes.mjs`, `sessionRoutes.mjs`, `sessions.mjs`,
`profileRoutes.mjs`, `statsRoutes.mjs`, `analyticsRoutes.mjs`, `clientOnboardRoutes.mjs`,
`clientOnboardingRoutes.mjs`, `renewalAlertRoutes.mjs`, `gamificationV1Routes.mjs`,
`exerciseRoutes.mjs`, `workoutRoutes.mjs`, `encryptionRoutes.mjs`, `automationRoutes.mjs`,
`aiBffRoutes.mjs`, `aiChatRoutes.mjs`, `aiDebateRoutes.mjs`, `aiRoutes.mjs`

`clientTrainerAssignmentRoutes.mjs` deserves special attention: if a trainer can create their own
assignment row, they mint access to any client and every `verifyClientAccess` check downstream
correctly returns "allowed". **That single endpoint can defeat the entire guard layer.**

---

## 5. Known hazards the matrix must cover explicitly

**5.1 — `user` is aliased to `client` in the frontend guard.**
`protected-route.tsx:258`:
```js
const roleAliases = auth.user.role === 'user' ? ['user', 'client'] : [auth.user.role];
```
A `user` satisfies any gate written as `allowedRoles={['client']}`. If any paid-client surface is
gated that way, a free account reaches it. **Verified present in current code.** Crossings 6 and 8
must enumerate every `'client'`-gated route and check it against a `user` session. Whether this is
intended aliasing or a paywall hole is an open question for the owner (§8).

**5.2 — admin bypasses all role checks by design.**
`protected-route.tsx:253`. Correct behavior, but it means *any* path that lets a lower role acquire
`role === 'admin'` is total compromise. Pair with `roleRoutes.mjs` testing.

**5.3 — the dev-mode emergency bypass: LIKELY safe, but UNVERIFIED. Treat as a required test,
not a settled fact.**
`protected-route.tsx:238-247` skips role checks entirely when two `localStorage` keys
(`bypass_admin_verification` + `admin_emergency_mode`) are both set. It is gated behind
`process.env.NODE_ENV === 'development'`.

Vite replaces `process.env.NODE_ENV` at build time by default, which would eliminate this branch
from a production bundle. **I could not verify that in this repo:** `frontend/vite.config.*`
contains no explicit `define` for `NODE_ENV`, and no `frontend/dist/` build exists in this
worktree to grep. The safety of this branch therefore rests on Vite's default behavior, not on
evidence from this codebase.

**Required empirical check before launch — this is the highest-value single assertion in the
matrix:**
```bash
cd frontend && npm run build
grep -rl "bypass_admin_verification" dist/    # expect: no matches
```
If that string survives into `dist/`, the branch is live in production and **any user who can set
two localStorage keys becomes an unrestricted admin in the browser UI.** That is an immediate
**LAUNCH BLOCKER**, and Layer 2 (§3) becomes the only thing standing between a curious user and
every admin surface.

Note this is a browser-side bypass only — it does not forge a token, so a correctly-guarded API
still denies. That is precisely why §3's two-layer design matters: if 5.3 is live *and* any P0
Layer-2 cell is open, they compose into full compromise.

**A related, already-hardened surface:** `emergencyAdminGate.contract.test.ts` asserts the
emergency admin *route* in `main-routes.tsx` is wrapped in `<ProtectedRoute allowedRoles={['admin']}>`.
Someone has defended this area before. Do not regress it.

**5.4 — `viewAsGuard.mjs` / admin "view as" impersonation.**
Admin impersonation is a legitimate feature and a prime escalation vector. Assert: only admins can
initiate it, the impersonated session cannot itself impersonate, and it cannot be self-granted.

**5.5 — `404`-not-`403` is intentional.**
`verifyClientAccess.mjs` returns 404 on cross-user access to avoid leaking resource existence.
Assertions must accept **either** 403 or 404 as a pass. A test demanding 403 will produce false
HARNESS failures against correct code.

---

## 6. Implementation shape

Reuses the four captured auth states from the existing brief (`.auth/`) — no new credential
handling, no credential passes through any agent.

```
tests/authz-matrix/
  matrix.config.ts        # 12 crossings; per-role route + endpoint inventories
  layer1-routes.spec.ts   # browser: role A -> role B's routes, expect denial
  layer2-api.spec.ts      # token: role A's token -> role B's endpoints, expect 401/403/404
  fixtures/roles.ts       # loads the 4 storage states
```

**Read-only and non-destructive.** Layer 2 exercises `GET` only in v1. Write-path crossings
(can a trainer *edit* another trainer's client?) are strictly more dangerous and are deferred to
v2 against **staging only** — never production, never `--allow-prod-write`.

**Pass criterion:** every P0 cell denies at Layer 2. Any P0 cell returning 200 with another
party's data is a **LAUNCH BLOCKER**.

Same classification discipline as the parent brief: every failure is `SITE` / `HARNESS` /
`ENVIRONMENT` before anyone fixes anything, and every finding is verified against source before
it is reported.

---

## 7. What this will NOT cover (must appear in the report's NOT-VERIFIED section)

- **Write-path crossings** — deferred to v2/staging. This is the largest residual risk.
- **Horizontal escalation via forged IDs in request bodies** (not URL params) — partially covered.
- **Token manipulation** — expired/forged/replayed JWTs. Different discipline; not attempted.
- **Rate-limit / brute-force** on ID enumeration.
- **Socket.io channel authorization** — real-time surfaces bypass Express middleware entirely and
  are a genuine blind spot in this design.
- **Direct DB / R2 object access** outside the API.

---

## 8. Open questions for reviewers and the owner

1. **Is the `user` → `client` alias (§5.1) intended?** If paid surfaces are gated on `'client'`,
   this is a revenue hole. Owner decision — do not change behavior without it.
2. Should `admin` bypass be **asserted as correct**, or is least-privilege admin scoping in scope
   for launch? Current design assumes bypass is intended.
3. Is `clientTrainerAssignmentRoutes.mjs` self-service for trainers? If yes, §4's guard-defeat
   concern is real and becomes P0.
4. Is deferring write-path crossings to v2 acceptable for a launch decision, given §7 names it as
   the largest residual risk?
5. Socket.io authorization (§7) — separate slice, or a launch blocker?

---

## 9. Reviewer remit

Attack this **design**, not the codebase. Specifically:

- What crossing is missing from the 12?
- Where will this produce a **false green** — a cell that passes while the real surface is open?
- Is the two-layer assertion (§3) sufficient, or is there a third layer (sockets, SSR, direct
  object access) that makes "both layers pass" still unsafe?
- Is the Tier-1/2/3 prioritization wrong for a launch decision?
- Is any §5 hazard analysis factually wrong?
- **§5.3 specifically:** I originally claimed the dev-mode role-check bypass was dead code in
  production and should not be reported. My own review pass found I had asserted that from Vite's
  documented default behavior, not from evidence in this repo — there is no `define` for
  `NODE_ENV` in the Vite config and no build to grep. I downgraded it to a required empirical
  check. **Is downgrading sufficient, or should an unverified role-check bypass block the launch
  decision until the build is grepped?** I lean toward: it must be grepped before launch, and the
  grep is cheap enough that there is no excuse not to.
- **Answered, not open:** the branch is 42 commits behind `origin/main`, so I checked whether §4's
  counts were stale. They are not — `git diff HEAD origin/main -- backend/routes/` is empty and
  both trees measure 230/55/25. The discrepancy I initially mistook for branch drift was entirely
  my own non-recursive glob (§4 instrument note). Recorded here because the *wrong* diagnosis was
  reachable and plausible: "stale branch" would have sent someone rebasing instead of fixing their
  measurement.

- **The strongest reason to distrust this document:** three of its claims were wrong on first
  writing and were caught only by re-deriving them — the §4 counts (non-recursive glob), the §2
  row 10-12 severity (privilege confused with sensitivity), and the §5.3 safety claim (asserted
  from Vite's default behavior, not evidence). All three are corrected in place with the error
  shown rather than silently overwritten. Assume there is a fourth I did not catch, and look for
  it in the places where I state something confidently without an adjacent command.
