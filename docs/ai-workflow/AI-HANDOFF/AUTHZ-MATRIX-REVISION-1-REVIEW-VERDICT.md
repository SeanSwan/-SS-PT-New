# REVISION 1 — external hostile review verdict (2026-08-14)

> Appendix to `CROSS-ROLE-AUTHZ-MATRIX-DESIGN-2026-08-14.md`. Read both.

**Reviewers:** Kimi K3 (`moonshotai/kimi-k3`, high effort) — 14 findings, $0.2495, clean finish.
HY3 (`tencent/hy3`, high effort) — **returned nothing**: consumed all 60k tokens on internal
reasoning and emitted no visible text. No findings. Cost ~$0.03. Routing note: for a ~17k-character
document with a five-part remit, high effort on that model risks the token ceiling rather than
improving quality (Rule 71 — it should have been routed low).

**Verdict: the design would have produced a green matrix that proves very little.** The central
finding is not a coverage gap but a contradiction inside the design, and it is correct.

---

## R1.1 — CRITICAL: the fixtures cannot execute five of the twelve rows (F1)

§6 reuses the brief's four captured auth states — **one account per role**. Rows 4, 5 and 10-12 are
*same-role, different-principal* crossings: trainer to another trainer's client, client to another
client, user to another user. One account per role crosses each account **against itself**, which is
not a crossing.

The design elevated rows 10-12 to P0 during its own review pass, correctly calling them the most
likely breach class — and then specified a fixture set in which they structurally cannot run.
Skipped cells read as green in a launch summary.

**Required:** two principals per role (2 trainers, 2 clients, 2 users) with **disjoint ownership**,
plus an **ownership-graph fixture** — "post X belongs to B, not A". Without that graph, §3's pass
criterion ("200 with another party's data") is uncheckable: the harness sees *that* a 200 came back,
never *whose data* it carried. **§3's pass criterion presumed fixture data the design never creates.**

## R1.2 — CRITICAL: no positive control; every denial is ambiguous (F2)

"Expect 401/403/404" is meaningless unless the request provably arrived authenticated. Three ways
this goes fully green having asserted nothing:

- Storage states expire. Stale JWT to 401 to pass. All four fixtures dead, every cell passes.
- Playwright's `APIRequestContext` honors the **cookie jar** but does not attach a token the app
  keeps in localStorage. If auth is Bearer-in-localStorage, naive reuse sends **zero credentials**,
  everything 401s, total green, nothing tested. *(Auth mechanism unverified — resolve before build.)*
- No canary: the owning principal's own token must return 200 on each endpoint **before** any
  denial elsewhere counts as evidence.

**Required:** a per-endpoint positive control — the owning principal's own token must return 200
before any denial elsewhere is evidence.

## R1.2b — CRITICAL: there is no anonymous row; the matrix has four roles and needs five (F4)

Kimi rates this `Critical for PII targets` with attacker cost **"None — no account required"** —
the cheapest attack in the entire review. It was originally folded into R1.2 above as a sub-point,
which under-billed it. It is independently critical and gets its own heading.

Twelve cells of *authenticated* roles correctly denying each other is fully consistent with an
endpoint mounted **before** the auth middleware being open to the entire internet — and the matrix
reports all-green. The threat model enumerated four roles and silently assumed an attacker has an
account. The cheapest attacker has none.

**Required:** two control rows the matrix never had — **anonymous** (no token) and
**expired/garbage token**. This is not "token forgery/replay" (fairly excluded as a separate
discipline); it is a **negative control**, without which the positive results are uninterpretable.
Same validity argument as R1.2: a denial only means something when you can prove a non-denial was
achievable.

## R1.3 — CRITICAL: GET-only defers the endpoints that mint privilege (F3)

v1 was restricted to GET. Express middleware is routinely per-verb: a guarded `router.get` beside a
wide-open `router.post` on the same path is a common shape. A fully green v1 is therefore consistent
with role grants, assignments, feature flags and package creation being open to any authenticated
account.

The cheapest escalation is not in the 12 rows at all: **mass assignment** —
`PUT /api/profile {"role":"admin"}`. Rows 1-3 frame escalation as *reaching* admin surfaces, never
as *becoming* admin. Write coverage of the **control plane** moves into v1, staging only.

## R1.4 — Prioritization inverted: control plane before data plane

The tiers order the data plane by sensitivity and put the control plane second. A failure in
`roleRoutes`, `clientTrainerAssignmentRoutes`, `featureFlagRoutes` or impersonation does not add one
breach — it **redefines every other cell's result**. §4 says the assignment endpoint "can defeat the
entire guard layer" and then files it in Tier 2. That sentence describes a Tier-0, test-first item.

**New order: control plane, then PII reads, then paywall.**

Accepted corrections:
- **Row 7 to P0** — its consequence column reads "other clients' plans", which is PII by the same
  sensitivity-is-not-privilege reasoning applied to rows 10-12. The rating contradicted the text.
- **AI/BFF routes to Tier 1** — a BFF aggregates a client's profile, notes and photos into model
  context; a crossing there returns PII as generated text, via POST-with-body-ID.
- **No tier may be assigned by filename** — `encryptionRoutes` may be a key server or decrypt
  oracle, i.e. control plane for all confidentiality. Verify semantics first.

## R1.5 — Accepted, added to scope

- **Photos into v1, not v2 (F7).** The disclosure vector for progress photos is the URL the API
  hands out — public bucket, guessable key, or long-lived presigned URL — not the API call. Two
  requests: fetch as owner, then as anonymous and as another client. Deferring this while §1 cites
  minors' data is a prioritization failure.
- **Sockets into v1 (F8).** If `messagingRoutes` has a socket twin, Tier-1 messaging confidentiality
  is unproven by a REST-green matrix. Roughly an hour: connect as A, attempt to join/emit on B's
  rooms, enumerate namespaces.
- **404-as-pass composes badly with a source-derived inventory (F5).** Endpoint paths were inferred
  from route *filenames*; actual mount prefixes are not derivable that way, so any prefix or
  trailing-slash mismatch returns 404 and passes. `sessionRoutes.mjs` / `sessions.mjs` coexisting is
  exactly that ambiguity. Inventory must come from the **running app's mount table**, not filenames.
- **Impersonation is a crossing, not just a hazard (F9)** — and fixture hygiene: if any `.auth/`
  state was captured while an admin was in view-as, every assertion using it measures the wrong
  principal, and the rows lie in both directions.
- **F10** verb and path-shape sweep (POST/PUT/PATCH/DELETE, OPTIONS/HEAD, slash and case variants).
- **F12** webhooks, cron and payment callbacks — unauthenticated by design, so they must verify
  signatures. Absent from both the matrix and the NOT-VERIFIED list; the money endpoint is unaudited.
- **F13** CDN / shared-cache with an Authorization-insensitive cache key, plus the shared-gym-tablet
  service-worker case (a realistic deployment for this product).
- **F14** revocation latency — a downgraded account holding an unexpired token.

## R1.6 — §5.3 hardened

"The grep is cheap enough that there's no excuse" was the weak version. Required instead: grep the
**deployed** artifact rather than a hopeful local `dist/`, **including sourcemaps**; pin the pipeline
so it cannot publish a non-production build (`vite build --mode development` during launch crunch
ships the branch); and add a **permanent behavioral Layer-1 cell** — set both localStorage keys
against production, attempt an admin route, assert denial. String absence is proxy evidence;
behavior is the claim.

Best of all: **delete the bypass.** A backdoor that requires a source change to enable cannot
silently re-ship; one gated on build defaults can.

Note the composition already half-stated in §5.3: while any of the 37 files remains unclassified,
"browser-side only, the API still stands" is an **assumption**, not a fact. 5.3's blast radius is
the unrun target list.

## R1.7 — Findings verified and DISPROVED

External review is a hypothesis (Rule 30). Two findings did not survive verification:

- **F6 — "25 + 37 = 62 > 55, the arithmetic doesn't close."** It closes. Of the 25 guard files,
  **18** also take `:userId`/`:clientId` and **7** do not — they guard via body fields or import the
  helper directly. 55 − 18 = 37. Derivation now published, which was the fair underlying point:
  37 was asserted without showing the working.
- **F11 — "§5's hazards sit on files never diffed against main."** `protected-route.tsx`,
  `verifyClientAccess.mjs` and `viewAsGuard.mjs` are each **identical** to `origin/main`, and the
  full `frontend/src/routes/` + `backend/middleware/` diff is empty. **The methodology criticism is
  accepted:** drift was verified for `backend/routes/` only, and §5's hazards inherited that
  verification. It happened to land safe. That is luck, not method.

## R1.8 — The architectural point, recorded because it outlives this matrix

Per-route middleware across 230 route files is statistically guaranteed to leak — one instrument on
one axis already surfaced 37 candidates. A point-in-time matrix certifies twelve cells; it cannot
create an enforcement invariant. The durable fix is **object-scoping at the data layer** (query-level
scoping / row-level security), with this matrix demoted to a CI monitor. A launch decision can be
made without that; a *trust property* cannot.

---

**Status: NOT ready to build. Revision 2 must fold in R1.1-R1.6 (including R1.2b) before any code.**

Kimi labelled **four** rows Critical — F1, F2, F3, and F4 (`Critical for PII targets`). An earlier
draft of this appendix reported three, having folded F4 into R1.2. Corrected above: F4 is the
cheapest attack in the review (no account required) and stands alone.

The four CRITICAL findings share one shape: the design specified assertions whose *preconditions it
never created* — fixtures that cannot express the crossing, denials with nothing proving the request
was authenticated, and a verb restriction that excludes the endpoints capable of invalidating every
other result. Each would have produced green cells. None would have produced evidence.
