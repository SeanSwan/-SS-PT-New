# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** C:/Users/BIGOTS~1/AppData/Local/Temp/claude/c--Users-BigotSmasher-Desktop-quick-pt-SS-PT/eae22129-148b-43db-b548-76f52a346a75/scratchpad/authz-review-packet.md
**Seed:** (none)
**Tokens:** 18185 in / 17681 out | **Cost:** ~$0.3198 | **Wall:** 461.8s | **finish_reason:** stop

---

# Hostile Security Review — SwanStudios authorization slice

Verdict up front: the suites are unusually well-controlled for controller-gate logic, but the "mutation-verified" claim fails in three concrete places: the new limiter's key is computed from **unvalidated** input (a real bypass class with no probe), the limiter's stated anti-drain rationale is **arithmetically false**, and two of the four deleted localStorage keys are **unverified deletions** the scanner never covers. Nothing here is High. Details below.

---

## (3) preKeyFetchLimiter — this is where the real findings live

### F1. Key is computed from raw, unvalidated `req.params.userId` — Medium (conditional), the headline finding

**File:** `backend/middleware/rateLimiter.mjs` ~L263–267; mount at `backend/routes/encryptionRoutes.mjs` ~L81

Middleware order is `protect → preKeyFetchLimiter → param('userId').isInt() → handler`. The limiter runs **before** express-validator touches the param, so the bucket key embeds the attacker-controlled raw string:

```js
return actor ? `u:${actor}:t:${target}` : `ip:${req.ip}:t:${target}`;
```

**Exploit:** alternate spellings of the same victim id produce **distinct buckets** for one victim.

- Even if the handler enforces `validationResult`: validator.js `isInt()` accepts a leading `+` (`'+42'` passes). `u:attacker:t:42` and `u:attacker:t:+42` are two buckets → 40 consumptions/hour instead of 20. Small but free.
- If the handler does **not** call `validationResult` (the diff truncates at `try {` — this must be verified) and does `Number(req.params.userId)` / `parseInt`, then `042`, `0042`, `00042`, … are unbounded distinct keys all resolving to user 42. The limiter is **fully defeated** with one account.

The author's own photo-upload suite documents exactly this coercion table (`"0902" → 902`, `"9e2" → 900`) and then the preKey suite never applies the lesson to the limiter.

**The mutation that would have caught it (and is absent):** keyGenerator using `String(Number(req.params.userId))` vs raw string. No test varies target spelling. The probe that belongs in `preKeyFetchRateLimit.test.mjs`:

```
20 requests to /keys/3002, then 20 to /keys/+3002 (and /keys/03002);
assert fetchKeyBundle total call count ≤ 20.
```

**Severity:** Medium if validation is unenforced (complete bypass of the change); Low if enforced (2× amplification). Either way the fix — normalize the key — is one line.

### F2. The "many distinct accounts" rationale is arithmetically false — Low, but it's the design's justification

**File:** `rateLimiter.mjs` comment block ~L243–262

Typical Signal prekey pools are ~100. At 20/hour **one account** drains a full pool in 5 hours, and — worse — can hold it at zero **indefinitely**: 480 consumptions/day exceeds any realistic client replenishment rate (clients top up on app open). The comment's claim that 20/hour "forc[es] pool exhaustion to cost many distinct accounts" is wrong by an order of magnitude. What 20 actually buys is converting "drain in seconds" into "sustained suppression at trivial cost." Given the author's own (correct) LOW impact rating, severity stays Low — but the comment should be corrected or the number dropped to ~3–5/hour per pair.

### F3. No per-actor ceiling: mass-drain of the entire user base is unpunished — Low

**File:** `rateLimiter.mjs` L262–269; pinned as intended behavior in `preKeyFetchRateLimit.test.mjs` "THE DESIGN TEST" (~L117–126)

Per-pair keying means one account can consume **20 prekeys per hour from every user in the system simultaneously**: 1,000 victims × 20 = 20,000 prekey consumptions/hour from a single account, all within limits. The design test explicitly asserts cross-target traffic is unthrottled, i.e. it pins this weakness as a feature. The comment justifies per-pair keying (group fan-out, NAT) and that justification is sound — but the correct shape is per-pair **plus** a generous per-actor total (e.g. 300/hour), which preserves group fan-out and caps mass drain. Severity Low because per-victim impact is the documented graceful degradation, but at fleet scale the aggregate forward-secrecy loss is no longer one victim's first message.

### F4. MemoryStore is per-process — Low

**File:** `rateLimiter.mjs` L262 (no `store` option)

- Behind K replicas with non-sticky load balancing, the effective budget is up to 20×K per pair. The tests run single-process and cannot see this. If production runs one replica, fine — say so in the comment; if not, the limit is not the limit.
- Memory growth: keys are one small entry per (actor, target) pair per hour, attacker-influenced only up to (#users × #attacker-accounts) entries/hour. **This is fine — stating plainly, not a finding.**
- Key collisions between actors: actor ids are numeric from the JWT and can't contain `:t:`, so no cross-actor key collision exists. **Fine, stating plainly.**

### F5. The IP fallback's "degrades to throttling" claim only holds without spoofable XFF — Low

**File:** `rateLimiter.mjs` L266–267

The comment says the fallback exists so a future re-mount without auth "degrades to throttling." If the app sets `trust proxy` (standard behind ALB/Cloudflare), `req.ip` is X-Forwarded-For-derived and attacker-rotatable; IPv6 /64 rotation does the same even without XFF. In that remount scenario the fallback degrades to **no throttle**, not throttling. (Also: express-rate-limit ≥7.2 flags raw `req.ip` in a custom keyGenerator via its IPv6 validation — version-dependent, verify.) In the current mount this path is unreachable because `protect` 401s first, so: Low. Supertest can't exercise any of this (all requests are 127.0.0.1), which is exactly what a real request behind a proxy would do differently.

### Is 20 right? Is group fan-out broken?

**Group fan-out is fine — stating plainly.** Per-pair keying correctly separates "message 200 people once each" (200 buckets, 1 request each) from "hammer one victim." Multi-device clients of one user share the bucket but 20/hour per pair is ample for session re-establishment. The number fails only the anti-drain rationale (F2/F3), not legitimate use.

---

## (1) Mutation probes — where they're strawmen

### F6. Consent suite doesn't test the role its own header identifies as the live risk — Low

**File:** `backend/tests/api/badgeConsentAuthzExecution.test.mjs`, "AI consent status" describe (~L180–235)

The header states: the client-check "does not cover role `user`" and "the ONLY thing standing between a plain `user` and someone else's consent record is the trainer-assignment branch not applying to them… Pinning current behaviour is the point: if it ever changes, this test is the alarm." **There is no test with role `user`, and no unknown-role fail-closed test** (the onboarding suite has the `affiliate` test; this suite doesn't). The surviving mutation: the consent controller's fallthrough for non-client/non-trainer/non-admin roles flips from deny to allow — every existing test still passes. The suite declares an alarm and never installs it. Low (consent status leaks AI-enabled state + consentVersion — mild), but it's a direct falsification of the header's claim.

### F7. `windowMs` mutation survives the entire preKey suite — Low

**File:** `preKeyFetchRateLimit.test.mjs` burst test (~L95–104)

All 23 requests complete in milliseconds. `windowMs: 60*60*1000 → 60*1000` (60× weaker protection) passes every assertion. `max` mutations are honestly caught (LIMIT+3 with exact boundary assertions — good). Cheap fix: `standardHeaders` is on, so assert the `RateLimit` reset value ≈ 3600s.

### F8. SQL-shape assertions are substring scans over an author-fed mock — Low

**File:** `clientPhotoUploadAuthzExecution.test.mjs` ~L160–172

`expect(sql).toContain("status = 'active'")` passes against `WHERE status = 'active' OR 1=1 --`. `toContain(':clientId')` matches a comment. And because `mocks.query` returns rows **the test author chose**, the mock can never reveal a real mis-scoped query: a query scoped to `trainerId` alone returns rows in production while the mock returns `[]` only when told. The honest statement: this suite executes the controller's *branching* and *scans* the SQL; it does not execute the authorization decision that the SQL embodies. A real request runs that SQL against real rows — that is the thing the stubs structurally cannot do. Low (test-integrity, not a live vuln; the parameterization check on `options.replacements` is genuinely good).

### F9. PATCH participant-role: no invalid-role body probe — Low

**File:** `groupParticipantAuthzExecution.test.mjs`, PATCH describe

`normalizeGroupRole` failing closed is tested only via a junk role arriving in the **stored membership** row. No test sends `PATCH … { role: 'superadmin' }`. Surviving mutation: the write path accepting an arbitrary role string and storing it — dormant until any later policy version treats the junk string as privileged. The removal-path probes are honest; the write-path input validation is unpinned.

### What's NOT a strawman — stated plainly

The badge crafted-id battery, the movement-screen self-denial pin (`allowSelf: false` — the one boolean that matters), the admin-cannot-promote asymmetry control, the "throttled attacker stops *consuming*" test (this genuinely catches the limiter-after-handler mutation), and the mirror test (a field-rename mutation `req.user?.id → req.user?.userId` collapses all actors into one IP bucket under supertest and the mirror test fails — correctly designed). The control-test discipline throughout is real.

---

## (2) What the mocks hide — global answer

Every suite stubs `protect`. Concretely, a real request differs in these ways:

1. **Actor id type.** The photo suite's own header establishes that production `protect` delivers `req.user.id` as a **string** (`authMiddleware.mjs:356-357`), and argues "a suite that used numeric ids would be testing a request shape that never occurs." By that standard, **four of the five suites test a shape that never occurs**: badge (L35–38, `id: 901` numeric), onboarding, group, and preKey all use numeric ids. Per the author's own analysis the fail direction here is *closed* (a `req.user.id === +req.params.x` regression locks users out of self-access while CI stays green) — so this is an availability-blindness finding, not a leak. **Low.** But the author cannot claim the string-id rigor and apply it to one suite in five.
2. **Real `protect`** rejects expired/revoked tokens and deactivated/banned users, and loads `role` from the DB. Mocked away — acceptable scaffold for gate testing, but it means no suite would notice if, e.g., a deactivated trainer's assignment row still clears the trainer gate because the user-status check lived in `protect`.
3. **Real repositories execute SQL**; mocks return author-chosen rows (F8). The group suite is the best-behaved here: the policy module is real and the repo boundary is honestly labeled.
4. **Real deployment is multi-process** (F4) and sits behind a proxy (F5). Single-process supertest can see neither.
5. Badge suite only asserts `setUserBadgeDisplay` not-called; a future write path through a different service method on the denial path is invisible to it. Minor.

---

## (4) The deletions — load-bearing or not

**`window.adminAccess.force()` and the two bypass-flag writes: not load-bearing — stating plainly.** Dev-only (`NODE_ENV === 'development'` guard in config.js), the only remaining readers are the two allowlisted ones, and the dev branch in `protected-route.tsx` is itself dev-gated. Removing a writer-of-bait is correct.

### F10. Two of the four removed keys are unverified deletions — Low

**Files:** `EmergencyDashboard.jsx` ~L132–142 (constructor) and ~L156–163 (`goToAdminDashboard`); scanner gap at `adminBypassFlagsUnwritten.contract.test.ts` L54 (`BYPASS_FLAGS`)

The "verified by grep, 0 reads" claim covers `bypass_admin_verification` and `admin_emergency_mode`. It does **not** cover `emergency_dashboard_loaded` (removed from the constructor) or `use_emergency_admin_route` (removed from `goToAdminDashboard`) — those get a bare "had no reader either." The scanner never scans for either: `BYPASS_FLAGS` contains only two flags, `use_emergency_admin_route` is checked for writes **only inside EmergencyDashboard.jsx**, and `emergency_dashboard_loaded` appears in no assertion at all. If any component reads `emergency_dashboard_loaded` (e.g., to decide an emergency banner or a redirect), this diff silently breaks that flow and CI stays green. Either extend the scanner to all four keys or delete the claim. Low (not an authz hole; a verification gap on a security-adjacent invariant).

Secondary: the scanner asserts config.js contains no `adminAccess.force`, but nothing scans for **callers** of `window.adminAccess.force()` elsewhere — a dev tooling/e2e helper calling it now throws. Dev-only, loud, informational.

---

## (5) The scanner — sound?

The positive controls are genuinely good and directly answer the prior false positive: walker-reach control, the `removeItem` canary (a matcher that can't see the kept cleanup calls can't be trusted), the non-vacuous allowlist control, and `.js/.jsx` extension coverage (the exact miss that produced the earlier false positive). That part is sound — stating plainly. Three real holes:

### F11. `TEST_FILE` regex excludes files that aren't tests — Low

**File:** `adminBypassFlagsUnwritten.contract.test.ts` ~L57

`/\.(test|spec)\./` matches any file whose name *contains* `test.` or `spec.` — `contest.jsx`, `protest.js`, `latest.testimony.ts` are silently excluded from the scan. A writer in `contest.jsx` is invisible. This is the same false-confidence class as the original tsx-only grep, one layer down. Anchor it: `/(^|[.\-_])(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/`.

### F12. Scan root misses executed code — Low

**File:** `adminBypassFlagsUnwritten.contract.test.ts` ~L44 (`SRC = resolve(__dirname, '..')`)

Only `frontend/src` is walked. `frontend/index.html` inline `<script>` and anything under `frontend/public/` are served and executed but unscanned — a writer there evades CI entirely. Low because it's an unlikely hiding spot for an honest mistake, but the test's stated purpose is "re-introduction fails CI instead of shipping," and this is a hole in "re-introduction."

### F13. Literal-string matching only — Informational

`setItem('bypass_admin_verification'` is matched only as a literal. `const k = 'bypass_admin_verification'; localStorage.setItem(k, …)`, `localStorage['setItem'](…)`, or `'bypass' + '_admin_verification'` all evade. For an honest-mistake tripwire this is acceptable; as a control against a determined insider it is not. The file should say which one it is. Not a finding against current intent — a labeling requirement.

---

## Severity summary

| # | Finding | Severity |
|---|---------|----------|
| F1 | Limiter key from unvalidated `userId` — spelling bypass, no probe | **Medium** if handler skips `validationResult` (verify — diff truncates); Low if enforced |
| F2 | "Many distinct accounts" rationale arithmetically false | Low |
| F3 | No per-actor ceiling; mass-drain pinned as intended | Low |
| F4 | Per-process MemoryStore multiplies limit by replica count | Low |
| F5 | IP fallback not a throttle under spoofable XFF / IPv6 | Low |
| F6 | Consent suite untested for the `user` role its header flags | Low |
| F7 | `windowMs` mutation survives preKey suite | Low |
| F8 | SQL assertions are substring scans over author-fed mocks | Low |
| F9 | No invalid-role body probe on participant PATCH | Low |
| F10 | `emergency_dashboard_loaded` / `use_emergency_admin_route` deletions unverified | Low |
| F11 | `TEST_FILE` regex excludes `contest.jsx`-style source files | Low |
| F12 | Scanner misses `index.html` / `public/` | Low |
| F13 | Scanner is literal-only; label it tripwire, not control | Informational |

The "mutation-verified, non-decorative" claim is **false in one load-bearing place (F1)** and **partially false in two others (F6, F10)**. Everything else is solid work that this review confirms rather than excuses.
