# Tencent Hy3 - Design Inspiration

**Reviewer:** `tencent/hy3` (high)
**Document:** C:/Users/BIGOTS~1/AppData/Local/Temp/claude/c--Users-BigotSmasher-Desktop-quick-pt-SS-PT/eae22129-148b-43db-b548-76f52a346a75/scratchpad/authz-review-packet.md
**Seed:** (none)
**Tokens:** 18822 in / 20420 out | **Cost:** ~$0.0133 | **Wall:** 167.9s | **finish_reason:** stop

---

# Hostile Security Review — SwanStudios authorization/crypto diff (2026-08-14)

**Preamble on the claim itself.** The diff contains **zero** mutation-testing infrastructure: no Stryker/_mutate_ config, no mutator, no killed-mutation report. The "CONTROL" blocks are positive-path assertions, not mutation killers. So "mutation-verified" is false on its face. "Non-decorative" is *mostly* true for the four authz-execution suites (they drive the real `ensureScopedClientAccess`, `checkClientAccess`, `messagingGroupPolicy`, badge gate — none of those are mocked), but it is false for one specific property of the preKeyFetch suite. Details below, with file/line/exploit/severity.

---

## (1) Mutation probes: honest or strawmen?

**Verdict:** Strawmen for the one property that matters on this diff — the limiter's key derivation from *validated* input.

The preKeyFetch suite (`backend/tests/api/preKeyFetchRateLimit.test.mjs`) uses only canonical integer targets: `3001`, `3002`, `3004`, `3005`, `3006`. Every test sends a clean `/api/encryption/keys/<int>`. The "design test" (different target not throttled) and "different actor not punished" test are *honest* for the per-pair scoping logic — they would catch a mutation that keyed on actor-alone or target-alone.

But **none of them supply a crafted `userId` string**. Therefore they cannot distinguish a correct keyGenerator (one that normalizes/validates the target before keying) from the broken one shipped (raw `req.params.userId`). The tests pass identically whether or not the target is validated before the limiter runs.

**The mutation that WOULD catch the real bug:**
- *Test-side:* add a case that sends `GET /api/encryption/keys/03002` (or `3002%20`, `+3002`, `3002.0`) repeatedly after exhausting `3002`, and assert the 21st request of *either* spelling returns 429 — i.e. spellings must collapse to one bucket. No such case exists.
- *Source-side (proves the strawman):* mutate the route to move `param('userId').isInt()` **before** `preKeyFetchLimiter` (the fix). Every existing preKeyFetch assertion still passes. A suite that was genuinely mutation-verified against the input-validation dependency would fail on that mutation. It doesn't, because the dependency was never exercised.

So the claim is false: the preKeyFetch tests are decorative with respect to the actual defect (unvalidated key input), even though they are non-decorative with respect to per-pair scoping.

---

## (2) Do the mocks hide the bug? What a real request does that the stubs don't

Every suite stubs `protect`/`authMiddleware`. The stubs differ from production in a way three of the four suites never account for:

- **String vs numeric `req.user.id`.** `clientPhotoUploadAuthzExecution.test.mjs` documents plainly that production `protect` sets `req.user = { id: toStringId(user.id) }` — a **STRING**. Yet `badgeConsentAuthzExecution.test.mjs` (`OWNER = { id: 901, ... }`), `clientOnboardingAuthzExecution.test.mjs` (`CLIENT_A = { id: 801, ... }`), `groupParticipantAuthzExecution.test.mjs` (`OWNER = { id: 501, ... }`), and `preKeyFetchRateLimit.test.mjs` (`currentUser = { id: 1001, ... }`) all stub `req.user.id` as a **NUMBER**. A real request carries a string id. Any controller in those three suites that does `req.user.id === targetId` (strict, target parsed to number) will **PASS self-access in the test** (number === number) but **DENY it in production** (string !== number) — a fail-closed bug the mock hides. Conversely a loose `==`/parseInt comparison could fail open; the tests can't tell. Only the photo suite exercises the production type. The other three are testing a request shape that never occurs.

- **Real `protect` validates the JWT and loads the user.** The stubs set `req.user` unconditionally and call `next()`. So the suites never prove the *end-to-end* request is safe when `protect` is absent/malformed — they assume the gate is the only defense and pre-load a well-formed user. Acceptable for unit-scoping the controller gate, but it means the IP-fallback branch of the keyGenerator (`actor ? ... : ip:...`) is **never executed** (every stub sets `req.user`), so a real request where `protect` fails to set `req.user.id` silently switches to IP-keyed limiting — untested.

- **Real DB queries run.** In `groupParticipantAuthzExecution.test.mjs` the entire `messagingRepository` is mocked; the suite verifies `messagingGroupPolicy` given canned rows, but never exercises the repository's actual SQL scoping (conversationId + userId WHERE clauses, injection safety). The mock returns exactly what the test dictates, so a repository-level missing-WHERE bug would not be caught. Only `clientPhotoUpload` inspects the SQL *string* passed to `query` — and even there the mock `query` doesn't execute it.

---

## (3) `preKeyFetchLimiter` keyGenerator attack

File: `backend/middleware/rateLimiter.mjs`, added `preKeyFetchLimiter` (~lines +242–+270); `keyGenerator` at ~+245–+248. Route: `backend/routes/encryptionRoutes.mjs` +81–+82 (`router.get('/keys/:userId', protect, preKeyFetchLimiter, [ param('userId').isInt() ], ...)`).

**Is the key computed from VALIDATED input? NO — this is the real bug.**
The keyGenerator reads `const target = req.params?.userId` **raw**. The limiter is mounted *before* `param('userId').isInt()`. So the rate-limit bucket is keyed on unvalidated URL text.

*Exploit (LOW severity, but defeats the limiter's stated purpose):* authenticated actor `2002` wants to drain target `3002`'s one-time prekey pool. They send:
`/api/encryption/keys/3002`, `/03002`, `/3002%20` (decodes to `"3002 "`), `/+3002`, `/3002.0`, `/3.002e3` — each produces a **distinct** bucket (`u:2002:t:3002`, `u:2002:t:03002`, `u:2002:t:3002 `, …) because the key is the raw string. The controller resolves all of them via `Number()` to target `3002` and consumes the same pool. The attacker gets ~10–20× the intended 20/hour per spelling, with no extra accounts needed. The limiter is bypassable by string-spelling alone. (Number-coerceable spellings are finite, so it's not unlimited — but the per-pair control is objectively defeated.)

**Memory-store growth (LOW).** Default `MemoryStore` keys on `u:${actor}:t:${target}`. An attacker varies `target` arbitrarily (or hammers many target ids) → unbounded distinct keys per hour, each living 1h. express-rate-limit sweeps expired keys, so growth is bounded by request rate × window, and per-key memory is tiny. Not a serious DoS, but it is uncontrolled key creation the suite never tests.

**Key collisions (effectively NONE today — say so plainly).** With numeric `actor`, the key is `u:<num>:t:<target>`; two distinct pairs collide only if the concatenated strings are byte-identical, which requires identical target strings. No practical collision. The unquoted `:t:` delimiter concatenation is *fragile* (if `actor` or `target` ever contained `:t:` a collision would appear), but given numeric user ids it is not exploitable now.

**Behaviour when `req.user` is absent (LOW, untested footgun).** Falls back to `ip:${req.ip}:t:${target}`. The route mounts `protect` first, so this shouldn't fire. But if `protect` is buggy (sets `req.user` without `.id`) or the route is re-mounted without auth, limiting becomes IP-keyed: an attacker rotating egress IP bypasses per-actor scoping, and a NAT'd gym shares one bucket. The branch is never exercised by any test.

**Legitimate group-chat fan-out at 20/hour (FINE — say so plainly).** The limit is per **(actor, target)** pair. Fan-out fetches many *distinct* targets, each its own pair at count 1. 20/hour per pair does **not** throttle a user messaging many friends or opening a large group. The author's rationale is correct and the design test confirms it. No finding.

**Whether 20 is right (REASONABLE — say so plainly).** Draining a ~100-prekey pool takes ~5h per attacker account at 20/h; the author already accepts that defeating the limit "costs many distinct accounts." For a LOW-severity issue (Signal degrades to the signed prekey; messaging still works), 20/hour per pair is a defensible mitigation. The defect is the unvalidated-target bypass above, not the number.

---

## (4) Did removing `window.adminAccess.force()` and the setItem calls break something load-bearing?

Files: `frontend/src/components/Emergency/EmergencyDashboard.jsx` (constructor + `goToAdminDashboard`), `frontend/src/config.js` (`window.adminAccess.force` removed).

**Verdict: No production-security breakage. The removal is safe and arguably an improvement (deletes a working half of a retired bypass).**

- `EmergencyDashboard` is admin-gated at `main-routes.tsx`; it never needed to grant itself anything. The removed writes (`bypass_admin_verification`, `admin_emergency_mode`, `emergency_dashboard_loaded`, `use_emergency_admin_route`) had no reader since the `protected-route.tsx` bypass branch was retired. Removing the writers cannot break authorization.
- The allowed reader `routes/protected-route.tsx` (dev-gated) still *reads* `bypass_admin_verification`, but with no writer it can no longer be triggered — a silent removal of a dev convenience, not a production control.

**Gap (LOW, test-completeness not a broken feature):** `adminBypassFlagsUnwritten.contract.test.ts` only scans `bypass_admin_verification` and `admin_emergency_mode`. The other two removed flags (`emergency_dashboard_loaded`, `use_emergency_admin_route`) are **not** in `BYPASS_FLAGS`, so re-introduction of a writer/reader for them would pass CI. `use_emergency_admin_route` in particular could route to an emergency admin surface; it deserves coverage. This is a contract-test blind spot, not a live vulnerability.

---

## (5) Is `adminBypassFlagsUnwritten.contract.test.ts` sound?

File: `frontend/src/routes/adminBypassFlagsUnwritten.contract.test.ts`.

**Verdict: Mostly sound for its narrow invariant (no literal `setItem` of the two bypass flags in `frontend/src`), with LOW-severity completeness gaps.**

What it does well: the positive controls are mandatory and present — walker-reach (>500 files, has jsx/js/tsx), the `removeItem` canary (proves the matcher can see storage calls), and the known-reader canary (`protected-route.tsx` + `config.js` must still appear). The test/file exclusion logic correctly skips `*.test.*` so assertion-data strings don't self-trigger. For preventing re-introduction of a *literal* `setItem('bypass_admin_verification'|'admin_emergency_mode')`, it is fit for purpose.

Gaps:
1. **Scope (LOW):** `SRC = resolve(__dirname, '..')` is `frontend/src` only. A writer in `frontend/public`, `frontend/scripts`, or another frontend dir is missed. The removed writers lived in `src`, so risk is low.
2. **Indirect writes evade (LOW):** `writeRe` matches only `setItem('<flag>'` literally. `const k = 'bypass_admin_verification'; localStorage.setItem(k, …)` bypasses the scanner entirely.
3. **Two removed flags unguarded (LOW):** as noted in (4), `emergency_dashboard_loaded` and `use_emergency_admin_route` are outside `BYPASS_FLAGS`.
4. **Allowed-reader safety not verified by this test (LOW/by-design):** the test pins "no *new* readers" and asserts the *existing* readers exist, but it does **not** verify that `protected-route.tsx`'s read is dev-gated / absent from prod — it defers to an external manual grep claim ("0 getItem reads in prod build"). That's acceptable for a contract test but means the suite trusts, rather than proves, the reader is safe.
5. **`config.js` reader claim (minor inconsistency):** the config.js diff shown contains no `getItem` for the flag (only `removeItem` in `reset`). The test's CONTROL asserts `config.js` *is* found as a reader, implying unshown `showUser` code reads it. If it doesn't, the `ALLOWED_READERS` set is permissively listing a non-reader (harmless, but the CONTROL would actually fail — so the unshown code must read it). Worth a glance to confirm the allowlist isn't vestigial.

No active vulnerability flows from the scanner itself. Severity of all five gaps: LOW.

---

## Summary of where the "mutation-verified / non-decorative" claim is FALSE

| # | Claim vs reality | Severity |
|---|---|---|
| 1 | "Mutation-verified" — no mutation harness exists; preKeyFetch tests are strawmen for unvalidated key input (no crafted-`userId` cases) | LOW (defeats the limiter's purpose, but underlying issue is LOW) |
| 2 | Authz stubs use numeric `req.user.id`; production sends string — 3 of 4 suites test a request shape that never occurs, hiding type-mismatch fail-closed/fail-open risk | LOW–MED (test-fidelity gap; real risk depends on unseen controller comparisons) |
| 3 | `keyGenerator` keys on raw, unvalidated `req.params.userId` (limiter mounted before `isInt()`) → spelling bypass of the per-pair limit | LOW |
| 3 | IP-fallback branch, memory growth, untested | LOW |
| 3 | Group fan-out / "20 is right" | FINE (no finding) |
| 4 | Removal of `force()`/setItem | FINE (safe); contract test misses 2 of 4 flags | LOW (test gap) |
| 5 | Source scanner | Mostly sound; 5 LOW completeness gaps | LOW |

No severity inflated. The preKeyFetch limiter's *intent* (stop prekey-pool drain) is undermined by its own key derivation, and the test suite certifies the limiter without ever probing that derivation with hostile input — that is the central place the author's claim breaks.
