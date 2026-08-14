# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** C:/tmp/ss-qa-harness-slice0/docs/ai-workflow/AI-HANDOFF/CROSS-ROLE-AUTHZ-MATRIX-DESIGN-2026-08-14.md
**Seed:** (none)
**Tokens:** 4188 in / 15794 out | **Cost:** ~$0.2495 | **Wall:** 610.9s | **finish_reason:** stop

---

# Hostile Review — Cross-Role Authorization Matrix Design

## Findings ledger (ranked by launch-decision severity, then attacker cost)

| ID | Finding | Severity to launch | Attacker cost to exploit the underlying hole |
|----|---------|-------------------|----------------------------------------------|
| F1 | Horizontal rows (4, 5, 10–12) are unexecutable with four storage states | Critical | Trivial (change one integer) |
| F2 | No authentication-validity canary; 401 counts as a pass | Critical | N/A — harness defect that masks everything |
| F3 | GET-only defers the exact endpoints that mint privilege | Critical | One POST |
| F4 | No anonymous / garbage-token row | Critical for PII targets | None — no account required |
| F5 | 404-as-pass + source-derived inventory vs. deployed mount paths | High | N/A — harness defect |
| F6 | Inventory instrument measures URL params only; body/query/batch/list/export uncounted; the 25+37≠55 arithmetic doesn't close | High | Trivial |
| F7 | Client photos: object-storage fetch never tested | High (your own §1 invokes minors) | Low |
| F8 | Socket channel authorization unsmoked | High if chat/notifications carry PII — verify | Low |
| F9 | Impersonation is not a crossing; fixtures could be impersonated sessions | High | Low |
| F10 | Verb/path-shape variants unswept (unguarded POST twin of a guarded GET, GET-on-POST-only endpoints, OPTIONS/HEAD, slash/case) | Medium-High | Trivial |
| F11 | Drift check covered `backend/routes/` only; §5's evidence is frontend files and middleware on a branch 42 commits behind | Medium-High | N/A — stale requirements |
| F12 | Webhooks / cron / payment callbacks absent from the matrix and from §7 | Medium | Low |
| F13 | CDN/shared-cache/service-worker on authed GETs unexamined | Medium (infra unknown — verify) | Low |
| F14 | Role-change revocation latency untested | Medium-Low | Trivial (wait for nothing — you already hold the token) |

---

## 1. False greens — where this passes while the surface is open

**F1 — The matrix's own fixture design cannot execute half its P0 rows.** §6 loads "the 4 storage states" — one account per role. Rows 4, 5, and 10–12 are *same-role, different-principal* crossings. Trainer→other-trainer's-client requires two trainers and two clients with disjoint ownership. User→user requires two users. One account per role crosses each account against **itself**, which is not a crossing. You correctly identified rows 10–12 as the most-likely-in-the-wild breach class, rated them P0 — and then specified a fixture set in which they structurally cannot run. In practice this ends one of two ways: the cells are skipped (and skipped cells read as green in a launch summary), or someone improvises a meaningless self-vs-self assertion. Also note: rows 10–12 additionally require an **ownership graph** as fixture data — "post X belongs to user B, not user A" — because the pass criterion is "200 *with another party's data*." Without that graph the harness cannot tell whose data came back, only that a status came back. Five of your twelve rows depend on fixtures that do not exist in the design.

**F2 — Every denial is ambiguous; 401 is accepted as a pass with no proof the request was ever authenticated.** "Expect 401/403/404" is only meaningful if the harness can prove the request arrived authenticated. Three concrete ways this produces a fully green, fully vacuous matrix:

- The captured storage states expire. Stale JWT → 401 → pass. All four fixtures could be dead on arrival and every cell passes having asserted nothing about authorization.
- Playwright mechanics: `APIRequestContext` honors the *cookie jar* from a storage state but does **not** attach tokens the app keeps in localStorage — fixtures/roles.ts must extract the token and set the header explicitly. If auth is Bearer-in-localStorage (the doc says "session token," mechanism unstated — I'm uncertain which this app uses), a naive reuse of the storage state sends every Layer-2 request with **zero credentials**. Everything 401s. Total green. Nothing tested.
- No positive control exists anywhere in the design. For each endpoint, the owner's own token must return 200 (or at minimum non-401/404) — one canary per row — before any denial counts as evidence. This single addition invalidates most of F2/F5 simultaneously, which is why its absence is inexcusable in a design whose entire purpose is avoiding false greens.

**F5 — 404-as-pass composes with a source-derived inventory to auto-pass wrong paths.** §5.5 accepts 404. The endpoint inventory is derived from `git grep` against route *files*; the assertions run against a *deployed* Express app whose mount prefixes (`app.use('/api/v1', …)` nesting) are not derivable from filenames. Any prefix, versioning, or trailing-slash mismatch between inventory and deployment returns 404 → pass. The pair `sessionRoutes.mjs` / `sessions.mjs` coexisting is precisely the kind of ambiguity that guarantees some of these. Sharp instance: several targets (`aiBffRoutes`, anything with POST-only query semantics) will return 404/405 to a GET probe regardless of authorization — the cell goes green over an endpoint that may happily answer a POST with `{"clientId": <victim>}` in the body.

**F3 as false green, not just missing coverage.** You state that `clientTrainerAssignmentRoutes` self-service "can defeat the entire guard layer," then defer the only verb that does it (POST) to v2. Middleware in Express is routinely per-verb: `router.get` guarded, `router.post` on the same path wide open is a common shape. A fully green v1 matrix is therefore consistent with role grants, assignments, feature flags, and package creation being open to any authenticated account. Attacker cost: one curl. And the most important version isn't even in your 12 rows: **mass assignment** — `PUT /api/profile {"role":"admin"}` — is the cheapest user→admin crossing that exists, and your rows 1–3 frame escalation only as *reaching admin surfaces*, never as *becoming admin*.

**F13 (conditional)** — If authed GETs sit behind any shared cache or CDN with an Authorization-insensitive cache key, role A can receive role B's cached 200. Your harness may still pass overall if it hits the origin directly while browsers traverse the CDN. I don't know your infra; that uncertainty is the finding — resolve it before launch. Related, lower-confidence: a PWA service worker on a **shared gym tablet** (a realistic deployment for this product) serving the prior user's shell/data post-logout is a session-lifecycle surface the matrix never touches.

---

## 2. Missing crossings

**F4 — The four-role matrix has no fifth row: anonymous.** Twelve cells of *authenticated* roles correctly denying each other are fully consistent with an endpoint mounted before the auth middleware being open to the entire internet — and the matrix would report all-green. Add two control rows: no token, and expired/garbage token. This is not "token manipulation" as a discipline (fair to exclude forgery/replay); it's a negative control without which your positive results are uninterpretable (same validity argument as F2). Zero attacker cost — no account needed.

**F6 — Your instrument still measures a narrower scope than your question — the glob error class, uncorrected.** The target list is built from counts of `:userId`/`:clientId` **URL parameters**. Horizontal IDOR lives identically in `req.body.clientId`, query strings, nested objects, and batch arrays (confirm GraphQL/batch endpoints absent, then close that axis explicitly; `aiBffRoutes` is a BFF — aggregation is what BFFs do). The instrument note congratulates itself on recursion while leaving the dimensional blindness in place. And the 37 itself: **25 + 37 = 62 > 55.** Under every natural reading (unguarded-identifier files as a subset of the 55 param-takers), the arithmetic doesn't close. The 37 either double-counts files that contain both guarded and unguarded routes, or uses an undocumented "identifier" definition your note never specifies. This is exactly a confident count with no adjacent command — publish the derivation or treat 37 as unreliable.

**F7 — Photos move through object storage, and only the API path is tested.** `clientPhotoRoutes` is Tier 1, but the actual disclosure vector for progress photos is the URL the API hands out: public bucket, guessable key, or long-lived presigned URL shared/forwarded. Test: capture a photo URL as the owning client (positive control), fetch it as anonymous and as another client. That's two requests. Deferring this to "v2" while your own §1 cites minors' photos is a prioritization failure, not a scoping decision.

**F8 — Sockets:** answer to your §8 Q5 below in §3/§4 — short version: if `messagingRoutes` has a socket twin, Tier-1 messaging confidentiality is unproven by a REST-green matrix. A minimal smoke — connect with role A's token, attempt to join/emit on role B's channels/rooms, enumerate namespaces — is roughly an hour of work. That belongs in v1.

**F9 — Impersonation is a hazard (§5.4) but not a crossing.** Initiation must be a Layer-2 cell for each non-admin role; the issued impersonated token must then be *used* to attempt (a) impersonating someone else, (b) hitting role-grant endpoints. Also fixture hygiene: if any captured `.auth/` state was captured while an admin was in view-as, every assertion using it measures the wrong principal and your rows lie in both directions.

**F10** — Verb sweep (POST/PUT/PATCH/DELETE on the 37 guarded-identifiers targets), plus OPTIONS/HEAD and slash/case variants. Trivial to add, trivial for an attacker to probe.

**F12** — Webhook/cron/payment-callback endpoints (Stripe for `subscriptionRoutes`, at minimum) are unauthenticated by design and must instead verify signatures. They're absent from the matrix *and* from §7's NOT-VERIFIED list. A matrix that 401-expects them false-reds; one that silently whitelists them leaves the money endpoint unaudited.

**F14** — Subscription canceled or trainer demoted: the JWT keeps saying `client`/`trainer` until expiry. Crossing 6 should include a downgraded account holding an unexpired token. Whether the resulting window is acceptable is an owner decision; right now it's unmeasured.

**SSR:** Vite SPA, so likely no server-rendered data surface — one-line verification, then close. Low priority; listing it only because you asked.

---

## 3. Is two layers enough?

**No — but the deeper problem is that you don't have two layers.** Layer 1 is not an enforcement boundary; it's a UI assertion. Your own text concedes this ("Layer 2 is the one that matters"). And for the horizontal rows (4, 5, 10–12 — five of twelve, all P0) Layer 1 is *meaningless*: the route guard renders `/social` identically for every user; there is nothing to assert. So on the rows you yourself call most likely to be open, the design is one layer deep, GET-only, URL-param-only, with one account per role.

For "both layers pass" to be trustworthy launch evidence, three things are required — call them the third layer or call them the harness's validity conditions, the substance is the same:

1. **Positive controls per endpoint** (owner-token canary returning 200; anonymous/expired rows). Cheap. Without them every denial is ambiguous (F2, F5).
2. **Write-verb coverage of the control-plane endpoints on staging** (role grants, assignments, feature flags, impersonation initiation). Small, enumerable, and each one invalidates the meaning of the rest of the matrix if open (F3).
3. **Out-of-band fetches where data leaves Express entirely**: photo URLs (F7), socket channels (F8). These are the two places "REST green" actively misdescribes the system.

And the architectural point you should put in the report even though it's out of your remit: per-route middleware across 230 route files is statistically guaranteed to leak — your own count found ~37 candidates from one instrument on one axis. A point-in-time matrix certifies 12 cells; it cannot substitute for an enforcement invariant. The durable fix is object-scoping at the data layer (query-level scoping / RLS), with this matrix demoted to CI monitor. A launch decision can be made without it; a *trust property* cannot.

## 4. Prioritization

The tiers are inverted for a launch decision in a specific way: **they order the data plane by sensitivity and put the control plane second.** `roleRoutes`, `clientTrainerAssignmentRoutes`, `featureFlagRoutes`, impersonation — a failure in any of these doesn't add a breach, it *redefines every other cell's result*. Your own text says the assignment endpoint "can defeat the entire guard layer"; that sentence describes a Tier-0, test-first item, and you've filed it under money/privilege behind the read paths. For launch: control plane first, then PII reads, then paywall.

Other corrections:

- **Row 7 contradicts itself.** "Sees coaching tools, **other clients' plans**" is a PII breach by your own row-10-12 reasoning (sensitivity ≠ privilege) — and it's rated P1. Either the consequence column is wrong or the rating is. Rate it P0 until scoped.
- **AI/BFF routes in Tier 3 is wrong.** These are the endpoints most likely to take a `clientId` and aggregate that client's profile, notes, and photos into a server-side model context — a crossing there returns PII as generated text, and it's POST-with-body-ID, the exact intersection of F6/F10. Tier 1.
- **Tiering by filename.** `encryptionRoutes` in Tier 3 — do you know what it *does*? An endpoint that serves keys or acts as a decrypt oracle is control-plane for all confidentiality. No tier should be assigned before semantics are verified; your own instrument note's lesson applies.
- The launch-blocker definition ("P0 cell returns 200 with another party's data") is too narrow twice over: it excludes successful writes (200, no data returned) and it presumes the harness knows whose data it received (the ownership graph F1 says you don't have).

## 5. §5.3 — is the downgrade enough, or does it block launch?

The downgrade was the right correction, but your lean ("must be grepped before launch") needs to be hardened, not adopted as-is:

1. **The grep as written can itself false-green if run against the wrong artifact.** Grep the *deployed* artifact (pull it from the CDN/origin), not a local `dist/` you hope is what ships — and grep the sourcemaps too: `dist/*.js.map` will contain `bypass_admin_verification` even if the branch was dead-code-eliminated, which is an information-disclosure minor finding that also tells you whether maps ship. String literals (localStorage keys) survive minification verbatim, so the grep is technically sound *for this source as written* — I'm reasonably confident there, not certain about your build chain's plugins.
2. **The grep verifies an artifact; the launch question is pipeline discipline.** `vite build --mode development` — entirely plausible for a "staging" or demo deploy during launch crunch — sets `NODE_ENV=development` and ships the branch. The control you need is "the deploy pipeline cannot publish a non-production build," which one grep does not establish.
3. **Add the behavioral probe as a permanent Layer-1 cell**: against the production build, set both localStorage keys, attempt an admin route, assert denial. Five lines in Playwright, tests the end-state, and catches future config drift that a one-time grep never will. String absence is proxy evidence; behavior is the claim.
4. **Prefer deletion over verification.** "Trust the tool's default" is the failure mode this document has now hit three times. A bypass that requires a source change to enable cannot silently re-ship; one gated on build defaults can.

On "block outright vs. required check": the cost asymmetry (≈1 hour of verification vs. any-user-becomes-UI-admin) makes evidence-before-signoff non-negotiable. But it does not warrant blocking the launch decision *independently of verification* — it is a conditional gate, which is your position. Where you're wrong is the framing "grep is cheap enough that there's no excuse": the cheap grep you're imagining is the local-build version, which is the weak version. Require: deployed-artifact grep + maps + runtime probe + pipeline pinning, with evidence attached at sign-off. And note the composition you already half-stated: while any of the 37 files remains unclassified, "browser-side only, the API still stands" is an *assumption*, not a fact — 5.3's blast radius is your unrun Tier-2 list.

## The fourth error you asked for

Four candidates, in the places you state things confidently without an adjacent command:

1. **§6: four storage states vs. twelve crossings** — the fixture count silently cancels five rows, all of them the horizontal P0s you elevated in §2. (F1 — the strongest one.)
2. **§4: 25 + 37 ≠ 55** — the "37" derivation is undocumented and arithmetically inconsistent under the natural reading. (F6.)
3. **§5/§9: the drift check was scoped to `backend/routes/`, but every §5 hazard cites `frontend/src/routes/protected-route.tsx` and middleware files** — none of which were diffed against `origin/main` on a branch 42 commits behind. You verified the measurement scope for the count, not for the hazards. The line numbers §5 builds its hazard analysis on may not describe what deploys. (F11.)
4. **§3's pass criterion presumes an ownership graph the design never creates** — "another party's data" is uncheckable without fixtures that say whose data is whose. (F1 corollary.)

The pattern across all four is the one you named: correct re-derivation of *wrongly scoped* instruments, with the scope error moved, not fixed.
