# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** .ai-workflow/fusion/panel4-post-regression-review.md
**Seed:** .ai-workflow/fusion/_full-source.txt
**Tokens:** 6619 in / 7267 out · **Cost:** ~$0.0000 · **Wall:** 230.4s · **finish:** stop

---

## VERDICT
REVISE — the fixes mostly hold, but `getClientPackagePricing` can return a **program/one-time purchase's full price (up to $33,600) as a "verified" per-session rate**, which `applyServerDerivedChargeAmount` will then trust and override an operator's `full` charge with; that plus two unverifiable-by-seed pricing functions blocks merge.

## BLOCKERS

1. **P0 — Non-session items resolved as per-session rates, stamped `isFallback: false`.**
   Scenario: client's *newest* completed order contains only a `'one-time'` item or a program (`sessions: 0`) — e.g., they buy the $8,400 program in June after their March 10-pack. `storefrontItems.length !== 0` passes the early return; `sessionPackages` is empty (filter requires `sessions > 0 && packageType !== 'one-time'`); execution reaches `const sessionPackage = sessionPackages[0] || storefrontItems[0];` (backend/utils/cancellationPricing.mjs, resolved-rate block). With `sessions: 0`, `pricePerSession = parseFloat(item.price)` = **8400**. The ambiguity population *excludes* one-time items by design, so `distinctRates` is empty → no guard fires. Return payload: `pricePerSession: 8400, isFallback: false`. Downstream, `applyServerDerivedChargeAmount` explicitly trusts non-fallback payloads: `chargeType === 'full'` → `applied = sessionRate` → **an $8,400 cancellation charge recorded as server-derived and verified**. The exact class of bug this slice was meant to kill (a trusted invented number), reintroduced through the fallback-to-any-item line.

2. **P1 — Warning/service predicates diverge on missing or unparseable `sessionDate`.**
   Scenario: `session.sessionDate` is null/garbage. Handler: `new Date(null).getTime()` → 0 or `NaN`; `NaN < 24` → `false` → `isLateCancellation: false`, copy says *"Your session credit will be returned and no fee will be charged"* (routes/sessions.mjs, cancel-warning handler). Service: `hoursUntilSession === null` → `refundEligible = false` → `lateForfeit` can fire → credit not restored, record stamped `forfeited`. The client was told one thing; the server did the opposite. The "exact complements" claim holds only for well-formed dates — the boundary fix made `24` agree but left the null-path disagreeing.

3. **P1 (evidence-gated) — `createDefaultPricingState()` is unseeded and almost certainly still carries the invented number.**
   The sixth-instance fix cleaned only the *success* branch of `useSessionPackagePricing`. Every failure path — fallback payload, network error, `fullCharge === null` — calls `setPricing(createDefaultPricingState())`, whose source is **not in the seed** despite the document claiming "the seed contains every function that touches pricing on this path." If that factory seeds `defaultFullCharge: 175` / `defaultLateFee: 88` (extremely likely given `DEFAULT_FULL_CHARGE` existed in this very hook), the invented number survives through the most-travelled path: any ambiguous client (which the new backend guard now manufactures deliberately) sees $175/$88 again. Same gap for `getSessionPackagePricing`, `parseMoneyAmount`, and `mapLateCancelWarning` — none seeded.

## ATTACKS

**Correctness**
- **The `limit: 12` guard evaporates for exactly the clients with the most history.** The prompt's framing ("flips to `isFallback` permanently") is backwards. Phase 1: split-rate history inside the window → permanent fallback (conservative, correct, but sticky for low-frequency clients — could be years). Phase 2: the old order scrolls past 12 → `distinctRates` collapses to one → confident resolution from newest, with **no change in the client's actual holdings** (sessions never expire — acknowledged). The guard is a function of order count, not of held inventory. Right trade in direction (fallback beats a wrong number, and `requiresAdminReview: true` on the ambiguous branch is correct), wrong axis. Bound by time or by packages with remaining sessions instead. What I'd have chosen: ambiguity over *active* holdings, not recent receipts.
- **Ambiguity-population vs resolved-rate incoherence (attack #2):** answered by Blocker 1 — population excludes one-time items, resolution doesn't. Second, milder case: newest order holds a session pack *plus* a one-time add-on; `sessionPackages[0]` picks whichever pack sorts first — fine today at two flat rates, but nothing enforces intra-order rate homogeneity.
- **Silent unverified charge:** in `applyServerDerivedChargeAmount`, the `!Number.isFinite(sessionRate) || sessionRate <= 0` branch returns with **no log and no `chargeAmountSubmitted`/`chargeAmountSource` marker** — an unverifiable charge indistinguishable in the record from a verified one, violating the function's own stated invariant two paragraphs above. (P2)
- **Admin late-cancel misattribution:** admin/trainer cancelling late *without* passing `cancellationOptions` → `normalizeCancellationBillingOptions` returns `null` → `lateForfeit` fires → record stamped `client_late_cancel_credit_forfeit` for an operator decision. `cancelledBy` preserves the actor, but the reason string fabricates a client policy event. (P2)
- **Concurrency TOCTOU on credit restore:** `shouldRestoreCredit` is computed from the in-memory `session.sessionCreditRestored` *before* the `LOCK.UPDATE` on the user row. Two concurrent cancels of the same session can both read `sessionCreditRestored: false`, serialize on the user lock, and both increment `availableSessions` — unless `Session` uses optimistic locking, which is not in evidence. Whether the earlier `findByPk` on Session takes a lock is not shown. (P1-pending-evidence)

**Security**
- `error: error.message` is returned inside the pricing payload from the catch block; if the `client-package-price` endpoint passes this through, internal error text (potentially table/driver detail) reaches the client. (P2)
- Cancel-warning authz is genuinely present this time (`canAccessSessionRecord(... allowClient: true, allowTrainer: true)` → 403) — confirmed, withdrawn as a finding. IDOR on `:id` is bounded by strict integer parse + ownership check as far as the seed shows; `canAccessSessionRecord`'s body is not seeded, so trainer-scope cross-client access is unverified.
- No replay/idempotency guard on cancel-warning (read-only, fine) or on cancelSession itself — double-submit doubles the charge path; see TOCTOU above.

**Data-truth / schema drift**
- The service writes seven `cancellation*` fields onto `session`. Whether those columns exist in **production** is exactly what "migrations are gated / what runs migrations is unestablished" means is unknown. If they don't, `session.save({ transaction })` throws on every cancellation post-deploy — the deploy plan below hinges on this.
- Line-drift: the fix comment cites `core/routes.mjs:286`; the verified mount walk says `:355`. Cosmetic, but comments that cite moving line numbers rot fast.
- `routes/sessionRoutes.mjs` holds the historically-correct version of the server-derived-charge logic and is unmounted — a live divergence trap; the port is welcome, the dead file should be deleted, not maintained in parallel.

**House rules:** no violations observable in the seeded source (no component/chart/styling code present — I cannot affirmatively clear styled-components/Victory/palette/touch-target rules and won't pretend to). Logging carries IDs and amounts, no PII to any LLM surface visible. Copy uses no banned language; no credential wording appears.

## HIGHEST RISK
The merge itself, because it is a money-path deploy into a production whose schema state is unknown, with no staging — and it currently ships Blocker 1. Cheapest concrete de-risk, in order:

1. **Sever dev→prod `DATABASE_URL` first** (prerequisite for everything, zero user risk).
2. **Diff prod schema vs models**: run `SELECT column_name FROM information_schema.columns WHERE table_name='sessions'` against prod and assert all seven `cancellation*` columns plus `sessionCreditRestored`/`sessionDeducted` exist. If any are missing, migrations get established *before* merge, not after — otherwise every cancellation 500s on `session.save`.
3. **Fix Blocker 1** (three lines: if `sessionPackages.length === 0`, return the ambiguous/fallback shape with `requiresAdminReview: true`) plus a unit test whose newest order is program-only.
4. **Render preview environment** for the branch against an isolated DB (snapshot restore or seeded fixtures) — Render supports per-branch previews; this is your staging and it costs an afternoon. Run the missing HTTP-level test there: real `GET /cancel-warning` for a known late and on-time session, one end-to-end cancellation on a throwaway client, assert the charge record.
5. Merge in the trainer's lowest-traffic window; immediately verify live: prospect pricing sheet renders, `cancel-warning` for a real client shows no `$88`, tail logs for the new `[Cancellation]` warn lines.
6. **Rollback:** Render one-click rollback to the previous deployment (image-level, minutes). Name the honest limitation: **image rollback does not undo writes** — any `cancellationChargeAmount` rows written post-deploy need a reconciliation query (`WHERE cancellationReviewedAt > deploy_ts`) reviewed by the trainer. That reconciliation script should be written *before* merge, not improvised during an incident.

## CONFIDENCE
Could not verify from the document alone:
- **Sources absent despite the seed's own completeness claim:** `getSessionPackagePricing`, `parseMoneyAmount`, `createDefaultPricingState`, `mapLateCancelWarning`, `canAccessSessionRecord`, `detectSpecialPackage`, `FALLBACK_PRICES`. Blocker 3 and the "seventh instance" question are settled or refuted by `createDefaultPricingState`'s body alone — that one file is the highest-value missing evidence.
- **Response shape of `/client-package-price`:** the frontend expects `{ success, data: { isFallback, pricePerSession, defaultChargeAmount, lateFeeAmount, packageName } }`; the endpoint handler is unseeded, so field-name drift (the exact drift class this panel keeps finding) is unchecked.
- **Whether prod's `sessions` table has the new columns** — settles whether step 2 above is a formality or a blocker.
- **Optimistic locking on Session** and whether non-deducting clients can ever carry `sessionDeducted: true` (determines whether the "knowingly stamped" non-deducting case is reachable or moot).
- I am **not** certain Blocker 1's exact severity in practice — it requires a newest-order composition of only non-session items, and I haven't seen StorefrontItem seed data to know how often programs ship as `packageType: 'one-time', sessions: 0` vs something else. The code path is unconditional; the trigger frequency is the uncertainty.
