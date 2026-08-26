# HOSTILE REVIEW BRIEF — Swan Coach endpoint truth + Client Hub a11y (round 2) — reviewed by HY3 (tencent/hy3)

**Reviewer:** `tencent/hy3` (high)
**Document:** c:/tmp/swan-p1a/docs/ai-workflow/AI-HANDOFF/HOSTILE-BRIEF-PANEL-ROUND2-2026-08-25.md
**Seed:** (none)
**Tokens:** 12733 in / 11388 out | **Cost:** ~$0.0077 | **Wall:** 217.0s | **finish_reason:** stop

---

## VERDICT
REVISE — The route extractor can manufacture false “route does not exist” results via optional-parameter stripping, and the load-bearing claim that `endpoint` is never dispatched as HTTP is unverified client-side, so the shipped contract is unsound until both are closed.

## BLOCKERS
1. **P1** — Optional route params are mutated by `segments()`, producing false absence.  
   *Failure scenario:* A mounted route `router.get('/foo/:id?')` (or same under an `app.use` prefix) and a command `endpoint: '/api/foo'` (or `/foo`). `segments()` executes `p.split('?')[0]` (`backend/tests/helpers/routeTable.mjs`, `segments` function), turning the pattern into `/foo/:id` (2 segments). `pathMatches` requires equal segment counts, so `resolveRoute(table,'GET','/api/foo')` returns `{route:null}`. The contract test “every HTTP command endpoint resolves to a real mounted route” then either fails on a valid command or forces a false `KNOWN_UNROUTED` pin — directly contradicting the doc’s claim that the extractor “cannot manufacture a false absence.”  
   *Evidence:* `backend/tests/helpers/routeTable.mjs` `segments()` and `pathMatches()`.

2. **P1** — Claim #1 (`endpoint` is declarative only, never an HTTP request) is unverified for client-side code; if any frontend/executor issues a request to `command.endpoint`, the refused “authz parity harness” was a real security control and deleting it permits roleRequired-vs-route-middleware drift.  
   *Failure scenario:* Coach command with `roleRequired:['client']` but endpoint route guarded by `adminOnly` is executed via the lane; route middleware never runs, bypassing authz (IDOR/privilege escalation).  
   *Evidence:* Document supplies only backend grep consumers (`commandExecutor.mjs:512`, `destructiveOperations.mjs:34`, `aiCommandRoutes.mjs:284`, `hermesCommands.mjs:12` comment) and explicitly says “Client-side counts” but provides no frontend executor file; therefore the claim is not refuted.

## ATTACKS
- **Correctness:**
  - `segments()` strips `'?'` and `'#'` from route patterns, destroying Express optional `:param?` (and any regex) semantics; `pathMatches` then enforces strict equal segment counts, so any optional/catch-all route can yield a false “no route” (see Blocker 1).
  - `parseRouterFile` treats any `router.use('/path', x)` as a sub-mount (pushes to `subMounts`) even when `x` is plain middleware, not a router identifier; this misclassifies path-scoped middleware and records it as `unresolved` rather than applying it. Does not yet cause false absence but erodes middleware accuracy.
  - `router.use` with no path adds to `active` only for subsequent same-file routes; Express pathless middleware on a parent mount can also wrap sub-router routes (documented cross-mount limit) — model is shallow but acknowledged.
  - `ClientsWorkspace.rosterA11y.test.tsx` asserts `busyNodes.length === 1` while its own comment states sibling nutrition panels carry `aria-busy` under mocks; either the comment is stale (test fragile) or the assertion is silently vacuous because those panels are mocked elsewhere — not verifiable from supplied files.
  - No off-by-one in `pathMatches` loop; `LiveRegion` message-swap logic is sound.

- **Security:**
  - Authz parity harness refused based on Claim #1; if Claim #1 false (Blocker 2) this is a deleted authz control → IDOR / privilege escalation in Coach lane.
  - Cross-mount middleware non-inheritance (documented) makes `allowedRoles` ceiling too permissive; not used yet, but if later reused for authz assertions, will under-report required roles.
  - HMAC-signing of stale `endpoint` into audit (`destructiveOperations.mjs:34`) is forensic-integrity risk, not direct exploit.

- **Data-truth / schema drift:**
  - Extractor’s `segments` mutates route path shape (optional param stripped) → drift between actual mounted route and table entry; contract test trusts table for existence.
  - Command registry fields (`method`, `endpoint`, `roleRequired`, `frontendEvent`) are checked, but no check that `frontendEvent` values match real UI event names (frontend response-shape drift unverified).
  - No PascalCase-vs-snake_case or FK target drift visible in supplied files.

## HIGHEST RISK
The unverified Claim #1 (that `command.endpoint` is never turned into a real HTTP request, especially client-side) is the most dangerous item: if false, a real authz control was deleted and Coach commands could bypass route middleware. Cheapest de-risk: grep the entire frontend and `commandExecutor` for any use of `command.endpoint` / `c.endpoint` inside `fetch`/`axios`/request builders; if none, commit that proof (or a test asserting zero such usages) before ship. If any usage exists, restore the endpoint-vs-route role subset check.

## CONFIDENCE
Could NOT verify from document alone:
- Actual frontend command execution path (no file shown) — needed to confirm/refute Claim #1.
- Real `backend/core/routes.mjs` and router files to see if any route uses optional params (`?`) or `+`/`*` globs that trigger Blocker 1.
- `sourceScan.mjs` `matchParen`/`splitArgs` robustness (not shown) — parser could mis-split on nested parens, causing silent route drop.
- Whether `ClientsWorkspace` actually renders sibling nutrition panels with `aria-busy` (test contradiction).
- Blast radius of deleted 31-file legacy tree (NOT SHOWN) — green suite/tsc/vite cannot catch removed endpoints still referenced by external clients.
- House rule “≤300 lines per file”: not independently counted; supplied files appear within limit but line count not verified.

Evidence to settle: full frontend `commandExecutor`/Coach UI source, `routes.mjs`, one router file using optional param, `sourceScan.mjs`, and a runtime trace of a Coach command execution.
