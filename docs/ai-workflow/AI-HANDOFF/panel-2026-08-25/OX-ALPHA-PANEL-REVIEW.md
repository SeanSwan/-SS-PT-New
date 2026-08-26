# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** c:/tmp/swan-p1a/docs/ai-workflow/AI-HANDOFF/HOSTILE-BRIEF-PANEL-ROUND2-2026-08-25.md
**Seed:** (none)
**Tokens:** 12453 in / 7941 out · **Cost:** ~$0.0000 · **Wall:** 191.8s · **finish:** stop

---

## VERDICT
REVISE — the endpoint-existence contract is a real improvement over tail-matching, but it rests on a consumer scan that provably never looked at the frontend, and its own fail-loud instrument (`unknownGates`) is wired to nothing.

## BLOCKERS

1. **P1 — Claim #1 was verified against backend consumers only, while the registry is serialized to the browser.** The brief's own attack item 1 says "Client-side counts," and the contract test itself confirms the registry ships over the wire (`aiCommandRoutes exposes … commands`). The four-consumer grep covers `commandExecutor`, `destructiveOperations`, `aiCommandRoutes`, `hermesCommands` — all backend. If ANY frontend surface reads `cmd.endpoint` off the `/api/ai-command/commands` response (debug panel, deep-link builder, replay/dev tooling, docs generator), then the endpoint DOES become a real HTTP request, route middleware DOES run, and the refusal of the authz-parity harness as "unsound because the two sides are never connected" collapses for that path. Evidence: the brief shows no frontend grep; every cited consumer carries a `backend/` path. This is the exact shape of the round-1 failure the brief confesses to: confident reasoning inside an excerpt boundary — here the boundary is the repo root.

2. **P1 — `unknownGates` is computed, documented as the fail-loud tripwire, and asserted by nothing.** `routeTable.mjs` header: "a new gate cannot silently widen access without this table noticing." `buildRouteTable` returns `unknownGates`; the contract test destructures only `{ table }` (beforeAll) and `{ unresolved }` (third test). Worse, the failure mode is not merely "unnoticed": in `roleCeiling`, an `unknown` classification is neither `roles` nor `auth`, so a route behind an unrecognized gate reports `allowedRoles: null, authRequired: false` — i.e., PUBLIC. The instrument notices into a return value nobody reads. Today the shipped contract only asserts existence so the blast radius is contained, but the header's safety claim is currently decorative, and the moment anyone trusts `allowedRoles` (the header itself says "fix this before using allowedRoles"), it's a landmine.

3. **P1 — `pathMatches` segment-count equality is unsound for Express `*` and `:param?`, contradicting the extractor's own "cannot manufacture a false absence" claim.** `pathMatches` requires `routeSegs.length === requestSegs.length` and treats `*` as exactly one segment. In Express, `*` matches zero-or-more segments and `:id?` matches zero-or-one. Concrete failure: `router.get('/api/library/*', …)` + command endpoint `/api/library/audio/file123` → extractor: no match → "endpoint names no mounted route" → contract FAILS on a route that Express serves. Same for `/api/x/:id?` requested as `/api/x`. The header's directionality argument (permissive-ceiling only) is true for the *middleware* limitation but false for the *matcher*. Whether any current command endpoint collides with a wildcard/optional-param route is NOT SHOWN — but the contract's validity claim ("its absences can be trusted") is falsified as stated.

4. **P2 — The "no router file silently parses to zero routes" guard only catches TOTAL parse death, not the partial-drop case that is its own motivating incident.** The 2026-08-23 defect (regex literal poisoning the scanner's string state) is caught only if it zeroes EVERY route in the file. A file with routes before the poison literal and routes after parses to `parsed > 0`, `naive > parsed`, and the guard (`naive > 0 && parsed === 0`) stays green. The guard's name promises more than its body checks. A `parsed < naive` shortfall report (tolerating known-dynamic cases via allowlist) would close this.

5. **P2 — Three of eight transcribed gates have zero source-binding, the exact drift class the binding test was built to kill.** The test excludes `requireAdmin`, `authorizeAdmin`, `adminOrTrainerOnly` from the export check (they live in `adminMiddleware.mjs`), and no other assertion reads that file. If `requireAdmin` in `adminMiddleware.mjs:22-38` is loosened or renamed, `ROLE_GATES.requireAdmin = ['admin']` silently rots. GLM-5.3's finding was patched for `authMiddleware.mjs` only.

6. **P2 — Internal contradiction in the a11y test suite: the aria-busy census cannot be simultaneously true and meaningful.** Test 2's comment says sibling nutrition panels "carry their own aria-busy and stay loading forever under these mocks" — then the same test asserts `expect(busyNodes.length).toBe(1)` document-wide. Both cannot hold. Either the nutrition panels don't render `aria-busy` under the trainer audience + mocks (comment is stale and the assertion is fine but fragile), or they do (the assertion fails/flakes depending on panel mount timing). Relatedly, test 1's bare `findByRole('status')` throws on multiple matches, so the whole suite silently depends on exactly one status region existing — the same load-fragility the brief admits elsewhere ("timeouts, not assertion failures").

7. **P2 — The KNOWN_UNROUTED allowlist contradicts the contract's stated purpose for signed audit records.** Blueprint: "A forensic reviewer reading a signed audit record must not be pointed at a route that was never mounted." `request_plan_adjustment` is wired and executes via `clientPlanAdjustmentDispatcher`, and its endpoint is allowlisted-unrouted. If that command is ever a destructive op, `destructiveOperations.mjs:34` HMAC-signs an unmounted route into the audit payload — precisely the scenario the contract claims to prevent, carved out rather than solved. The allowlist is a count-pin, not a truth guarantee; the blueprint oversells it.

## ATTACKS

**Correctness**
- `router.route('/x').get(h)` chaining is invisible to BOTH the parser (regex requires method directly after `router.`) and the naive-grep guard (same regex). Such a file contributes zero routes and passes the zero-guard vacuously. NOT SHOWN whether this codebase uses the chaining style — but the guard's guarantee ("no router file silently parses to zero routes") is false as a general claim.
- Express routes are case-insensitive by default; `pathMatches` compares segments exactly. A case-drifted endpoint produces a false absence. Low likelihood, nonzero.
- The wrong-method regression guard's `METHODS` array omits `'ALL'`; a path served only via `router.all` reports as flat absence instead of the more actionable verb-mismatch signal.
- Unresolved-pin test hardcodes line numbers (`core/routes.mjs:448` etc.) — any insertion above those lines breaks the test with a misleading diff. Fails loud, but expensively.

**Security**
- Blocker 1 is the security finding: the parity harness was deleted based on a possibly-incomplete consumer inventory. The residual protection for the Coach lane is `stepRBAC` + per-dispatcher enforcement, and the brief admits dispatcher-authz coverage is 3-of-112 and deferred. So the shipped state is: declarative metadata contract + essentially untested dispatcher authorization. That's a known gap, but it means the ONLY runtime gate is untested — worth stating in the ship notes, not just the next-slice plan.
- `stableAuth` in the a11y test returns `{data:{}}` for every `authAxios.get` — irrelevant to production, noted only because it means the behavioural test exercises none of the real caller's error branches beyond the mocked data layer.

**Data-truth / schema drift**
- The contract improves audit-trail truth but introduces a subtler lie: a signed record whose endpoint now RESOLVES implies the op executed over REST when it executed lane-internally through a dispatcher. Pre-fix, a fictional route was obviously fictional; post-fix, the record looks plausible and misdirects forensics toward a route with middleware logs that will show no hit. Existence ≠ provenance; consider signing `dispatcherId` alongside.
- `KNOWN_ROLES` includes `'user'` alongside `'client'` — if `'user'` is a legacy synonym being retired, this test enshrines it. NOT SHOWN.

**Vacuous-assertion sweep (attack item 3)**
- `expect(bodyOf(auth,'requireAnyRole')).not.toMatch(/role === 'admin'/)` is a near-vacuous negative: it evades via `"admin"` double quotes, `user?.role`, `req.user?.role === 'admin'`, or delegation to a shared helper. A determined refactor restores the override and keeps this green. A positive control (mutate requireAnyRole to include the override; watch it fail) is the only way to know this assertion can fire — the brief mutation-tested other assertions but doesn't claim this one.
- The zero-route guard's partial-blindness is blocker 4.
- `expect(table.length).toBeGreaterThan(1000)` — magic floor; a mass route deletion down to 900 routes keeps every absence claim "trustworthy" per this test. Weak but not vacuous.

**A11y design (attack item 4)**
- The ARIA reasoning is substantially correct, not invention: dynamically-inserted live regions are unreliably announced (region must pre-exist), and `aria-busy="true"` permits AT to defer/skip subtree changes — hoisting the announcer outside the busy subtree is the standard mitigation. The unconditional-mount + message-swap pattern is right.
- BUT the behavioural test's load-bearing novelty is thinner than claimed: `status.closest('[aria-busy="true"]')` being null proves the DOM shape at mock-time, not that a real screen reader announces. That's inherent to jsdom testing, fine — but the second test's contradictory census (blocker 6) means the suite's central structural invariant is asserted against a document whose composition the test's own commentary disputes.

**Blast radius (attack item 5)**
- Green tsc/vite/vitest all miss: (a) runtime-string dynamic imports (`import(variablePath)`), (b) files loaded via `fs.readdir`/glob at server boot, (c) config keys read defensively (`process.env.X ?? default`) where deleting the declaration silently changes behavior to the default, (d) deploy/CI scripts consuming the deleted config outside the test runner, (e) public URLs/bookmarked deep links into the deleted 31-file tree. None verifiable from this document — NOT SHOWN.

## HIGHEST RISK
Blocker 1: the entire reframing (deleted parity harness, shipped existence contract, "attack this first") stands on a consumer inventory that never crossed the frontend boundary, for a field the API hands to the browser. Cheapest de-risk, under an hour: (1) grep `frontend/src` for `\.endpoint\b` and for destructuring of the commands-list response; (2) snapshot the actual JSON of `GET /api/ai-command/commands` and grep the frontend test/component tree for its field names. If both come back empty, claim #1 survives and I withdraw the blocker; if not, the parity question reopens for exactly the consuming surfaces.

## CONFIDENCE
Could NOT verify from the document: any frontend consumer of `endpoint` (no frontend file shown); whether any mounted route uses `*` or `:?` optional params in a way that collides with a command endpoint; whether `router.route()` chaining exists in `backend/routes/**`; whether all mounts live in `core/routes.mjs` (extractor reads only that file — a second mount site would be a systematic false-absence source); whether `request_plan_adjustment` or the other allowlisted commands appear in destructive-op flows; whether nutrition panels render `aria-busy` under the trainer-audience mocks (the test comments contradict each other); the content of the deleted 31-file tree and 120 config lines. Settling evidence: the frontend grep above; `grep -rn "router\.route(" backend/routes`; `grep -rn "\*\|?[\"']" route path literals` against the resolved table; the destructive-op registry joined against command types. My extractor-semantics findings (wildcards, optional params, case) are certain as Express semantics but uncertain as *live* defects in this repo — I am flagging unsoundness of the instrument, not a confirmed false positive today.
