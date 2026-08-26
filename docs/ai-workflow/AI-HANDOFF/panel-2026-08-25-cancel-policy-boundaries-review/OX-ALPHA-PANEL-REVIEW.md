# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** .ai-workflow/fusion/cancel-policy-boundaries-review.md
**Seed:** .ai-workflow/fusion/_policy-diff.txt
**Tokens:** 2717 in / 4351 out · **Cost:** ~$0.0000 · **Wall:** 116.8s · **finish:** stop

---

## VERDICT

REVISE — the origin-of-the-placeholder fix is genuinely good work, but it ships a nullable API field with no stated frontend change, leaves the cancel-warning endpoint's authorization scope unevidenced, and the new copy is *still* promising a fee the code never charges.

## BLOCKERS

1. **P1 — Response-shape drift: `lateFeeAmount` went non-null→nullable with zero frontend work in this slice.**
   Failure scenario: client on a session with no resolvable package hits `GET /api/sessions/:id/cancel-warning` → API returns `cancellationPolicy.lateFeeAmount: null` → frontend hook or panel (which Round 2 already caught ignoring `isFallback`) renders `null.toFixed(2)` or `"a fee of $null may apply"` → crash or garbage in the exact moment a user is deciding whether to cancel. The document explicitly states "NOT done: … no browser run," and no frontend file appears in the diff. Evidence: diff hunk at `routes/sessions.mjs:~2896` (`lateFeeAmount` initialized `null`); Verification section admitting no browser run.

2. **P1 (P0 if absent) — No authorization scope is evidenced for `cancel-warning` itself.**
   The diff shows `protect` at `routes/sessions.mjs:2873` and then a direct fetch by `:id`. Q3's IDOR closure covers `cancelSession` in the *service*; nothing in the document shows cancel-warning asserting `req.user` is the session's client, its trainer, or staff. Failure scenario: any authenticated user iterates `/api/sessions/<i>/cancel-warning` → receives `packageName`, derived pricing (which brackets another tenant's real rate), session date/time, and existence oracle for every session in the database. Multi-tenant scope leak. If a scope check exists above line 2873, produce it; if not, this is a P0.

3. **P1 — Silent dead-feature regression: if the route's session query lacks the package include, `getSessionPackagePricing` falls back for *every* session and `lateFeeAmount` is always `null`.**
   The helper's fallback branch (`routes/sessions.mjs:129–137`) fires whenever package resolution fails — including "association never eager-loaded." Failure scenario: route loads `session` without the package/OrderItem include → `packageInfo.isFallback === true` always → every client sees only the no-fee message forever, no error, no log. Nobody notices because the degraded path is indistinguishable from the honest-path-by-design. Only a live/browser test would catch it, and that was skipped.

## ATTACKS

**Correctness**
- **Boundary drift between warning and enforcement.** The warning computes `isLateCancellation = hoursUntilSession < 24` at `routes/sessions.mjs:~2878`. Nothing shown proves `cancelSession` in `services/sessions/session.service.mjs` uses the same operator, the same clock, or the same session-date normalization. A session cancelled at exactly 24h00m00s, or across a DST boundary, can get "your credit will be returned" from the warning and a forfeited credit from the service. One shared predicate, tested at the boundary values (24h±1s), kills this class.
- **TOCTOU ordering in the Q2 claim.** "Row read with `LOCK.UPDATE` inside the transaction" is necessary but not sufficient: if `allowedStatuses` is evaluated on a *pre-lock* read (existence check outside the lock, or a plain SELECT earlier in the tx under REPEATABLE READ), two concurrent submits can both pass the status check and serialize only afterward. The authoritative status check must be the post-lock read. The service-level tests with mocked models cannot distinguish this — mocked models don't exercise lock ordering at all (see your own Attack #4: the thing that would disprove Q2 is exactly this, plus two concurrent HTTP requests against a real DB).
- **`creditRestored: !isLateCancellation` asserts a guarantee the code may not make.** Credit restoration is "separately guarded by `sessionCreditRestored`" — implying it can fail or be skipped. Telling the user "will be returned" before the transaction that restores it has committed is optimistic copy on an unverified outcome.
- **Quoted authz omits the client.** The Q3 quote lists admin/owner/trainer only, yet Q1 discusses "client-initiated cancellation." Either the quote is truncated (say so) or clients cannot cancel through this path and half the slice's premise is moot. Resolve explicitly.

**Security**
- See Blocker 2 (IDOR/scope on cancel-warning). Additionally: the catch around pricing logs `pricingError.message` — confirm the error object can't carry user-controlled SQL/PII fragments into logs.
- Rate limiting on cancel-warning isn't evidenced; combined with Blocker 2 it becomes a cheap enumeration endpoint.

**Data-truth / schema drift**
- **`LATE_FEE_RATE` is declared in `routes/sessions.mjs` but the *charging* logic lives in `services/sessions/session.service.mjs`.** "Replaces three inline 0.5 multipliers" — in which file(s)? If the service has its own `0.5` (or its own hardcoded 88 remnant), the placeholder has simply survived a fifth layer, which is this workstream's established pattern. Grep the service for `0.5`, `88`, and `175`.
- **Other `isFallback` consumers (your Attack #3):** I cannot grep from here, but the pattern to hunt is any consumer of `defaultChargeAmount`, `fallbackPrice`, or `lateFeeAmount` that doesn't branch on `isFallback`: invoice/charge derivation, reschedule price preview, checkout defaults, trainer earnings math, and any email/template quoting a rate. Each is a repeat of the frontend bug you already found twice.
- **`cancellationChargeType: null` is schema drift by omission:** the column exists, the write path never populates it for client cancels, so admin reports silently under-count late cancellations. That's not a policy choice, it's an unrecorded event (see below).

## HIGHEST RISK

Blocker 2 — an unscoped pricing/disclosure endpoint is the classic leak that never shows up in functional tests because every test runs as the session's owner. Cheapest de-risk before ship: one HTTP-level test asserting a 403/404 when an authenticated user with no relation to the session calls `/api/sessions/:id/cancel-warning`, plus paste the lines between `protect` and the session fetch into the next revision. An hour of work, closes the worst failure mode in the slice.

## CONFIDENCE

I could not verify, from this document alone:
- Whether cancel-warning performs any ownership/role scoping (lines above 2873 not supplied). **This is my largest uncertainty and it flips between P0 and non-issue on evidence I don't have.**
- Whether the route's session query eager-loads what `getSessionPackagePricing` needs (Blocker 3 is inferred from the helper's fallback semantics, not observed).
- Whether the service layer has its own fee-rate copies, and whether the authoritative status check in `cancelSession` occurs post-lock.
- Whether any frontend consumer of `cancel-warning` handles `null`.
- Whether a client branch exists in the cancel authz at all.

Evidence that settles all five: the full route handler source, the full `cancelSession` transaction body, a repo-wide grep for `lateFeeAmount|defaultChargeAmount|fallbackPrice|LATE_FEE_RATE|0\.5` consumers, and the frontend hook/panel that renders the warning. House-rule check: no violations observed (this slice touches no UI; language and credential rules are respected in the copy shown).

On your five questions, briefly: (1) recording a zero-amount decision row with reason `client_late_cancel_credit_forfeit` is cheap and makes late cancels reportable — do it; (2) for client callers the honest copy is *"Your session credit will not be returned"* full stop — drop the fee clause unless the endpoint becomes role-aware and trainer-initiated cancels actually charge; (4) concurrent HTTP requests against a real DB, and a test where the second submit arrives after the first commits; (5) policy-as-data wins the moment you have more than one trainer with different terms — which, as a multi-trainer SaaS, you already do; until then, at minimum move the constant to a shared module imported by both routes and service so it can't drift a fifth time.
