---
decision: Acted on the Kimi K3 + GLM-5.3 hostile review of all 15 shipped money-path commits; 7 further commits close every verified finding except two that are migration- or policy-gated.
status: shipped
supersedes: none
---

# Money-Path Review Round 2 — Phase Audit Record

**Phase:** Hostile-review remediation of the money-path security workstream
**Scope:** Everything the 2026-08-19 Kimi K3 + GLM-5.3 review found in the 15 previously shipped commits
**Dates:** 2026-08-19 → 2026-08-20
**Reviewers:** Kimi K3 (`moonshotai/kimi-k3`, ~$0.27), GLM-5.3 (`glm-5.3`), plus my own hostile passes
**Branch:** `claude/refund-lifecycle-20260819` (cut from `origin/main`)
**Verdict:** SHIPPED — 7 commits, 9,500 tests pass, 0 regressions

---

## 1. Why this phase exists

The previous round shipped 15 commits closing real vulnerabilities. This round
asked two external models to attack that work as a whole family, with full
source rather than a diff. Both independently found that **one of the fixes had
made production worse than before it landed** — the adoption amount guard.

That is the single most important fact in this document. A fix written to close
an over-grant hole introduced a silent-failure path for a guaranteed-to-occur
population of honest customers. It passed my own hostile pass. It took two
external models, arriving at it from different directions, to surface it.

---

## 2. Findings and disposition

| Sev | Finding | Source | Disposition |
|---|---|---|---|
| C1 | Adoption guard compared `amount_total` (post-tax, post-discount) against `cart.total` (pre-tax, pre-discount) — refused honest crash-window payments, silently | Kimi | FIXED `ce760b208` |
| H1 | `cartTotalCents > 0` skipped the guard entirely; totals persistence is non-fatal, so the original $5,060-for-$60 exploit survived the fix meant to close it | Kimi | FIXED `ce760b208` |
| H1 | Refusal returned normally → webhook fell through into `processCompletedOrder`: role promoted with ZERO sessions, order booked at the mutated total, commission on uncollected money, points, notification | GLM | FIXED `ce760b208` |
| H2 | Paid session that can never own its cart threw → permanent 500 retry storm on captured money | Both | FIXED `ce760b208` |
| H3 | ACH/offline `OrderItem` rows still used `new Decimal(price \|\| 0)` — charged correctly, recorded $0.00 | GLM H3 / Kimi M1 | FIXED `3f061ec71` |
| — | `storefrontMap.get()` dereferenced without a miss check → TypeError on replay of a paid order | Kimi M1 | FIXED `3f061ec71` |
| M1/M2 | `payment_intent.processing` / `payment_failed` left on the stale combined lookup; no fallback, no safe-integer guard, no signal on zero rows | GLM M1 / Kimi M2 | FIXED `acbc89b8a` |
| M2 | Weak (metadata-only) match given the same authority as a strong one — completed and allocated with no amount check | Kimi | FIXED `acbc89b8a` |
| L5 | No `payment_intent.canceled` handler | Kimi | FIXED `acbc89b8a` |
| M3 | v2 checkout re-validated quantity fail-closed but had no price analogue | GLM | FIXED `60ced794d` |
| M3 | Deleted catalog row skipped the availability gate (`undefined === false`) | Kimi | FIXED `60ced794d` |
| M4 | Session-package rail had no webhook fulfilment — paid, never granted, if the browser never returned | Both | FIXED `bd87cd1c4` |
| L1 | ACH `!items?.length` accepted a string → 500 for a 400 | Kimi | FIXED `254ea94ad` |
| L2 | Offline `new Decimal(clientTotal)` threw on garbage → 500 for a 400 | Kimi | FIXED `254ea94ad` |
| L3/L1 | `refunds.data[length-1]` was the OLDEST refund, and the list is truncated past ~10 | Kimi/GLM | FIXED `254ea94ad` |
| L4 | VIP fulfilment recorded a hardcoded `amount: 175` | Kimi | FIXED `254ea94ad` |
| L2 | `/cancel-checkout` unrate-limited while making 1–2 Stripe calls per hit | GLM | FIXED `254ea94ad` |
| M4 | Crash-window cart had no self-service recovery — verify-session 404'd a paying customer | Kimi | FIXED `8edbb1b89` |
| H3 | Checkout idempotency key derived from state the claim mutates → feared duplicate payable sessions | Kimi | **DISPROVED** — see §5 |
| M2 | Cart-add TOCTOU between the status check and `CartItem.create` | GLM | **DEFERRED** — needs a unique index (migration, Sean-gated) |
| L3 | Adoption guard skipped on null/zero amounts | GLM | Subsumed by the C1/H1 verifiability rework |

---

## 3. Commits

| SHA | Subject |
|---|---|
| `ce760b208` | adoption guard was refusing honest payments and leaking fulfilment |
| `3f061ec71` | fix #4 never reached the durable rows — ACH/offline OrderItems were $0.00 |
| `acbc89b8a` | the ACH hardening never reached its three sibling states |
| `60ced794d` | the last gate before Stripe guarded quantity but not price |
| `bd87cd1c4` | session packages were fulfilled only if the browser came back |
| `254ea94ad` | the LOW-tier cluster — three of the four were sibling drift |
| `8edbb1b89` | a customer stranded in the crash window had no self-service recovery |

---

## 4. Security posture — what each control blocks and how it breaks

**Adoption verifiability guard** (`SessionGrantService.mjs`)
Adoption proceeds only when both the charged amount and the cart total are
known AND agree. WHAT IT BLOCKS: adopting a mutated cart at a price the buyer
never paid. HOW IT BREAKS: if a future caller stops passing `amountTotalCents`,
the guard fails closed and refuses honest recoveries — loudly, via alert, which
is the intended failure direction but will read as an outage. If someone
"helpfully" reintroduces `> 0` short-circuits, H1 returns verbatim.

**Unfulfillable short-circuit** (`stripeWebhook.mjs`)
`break`s before the PI persist and before `processCompletedOrder`. WHAT IT
BLOCKS: role promotion, order booking, commission, points and notifications on
a refusal. HOW IT BREAKS: any new side effect inserted ABOVE the short-circuit
is outside its protection. Keep it first.

**Weak-vs-strong match authority** (`stripeWebhook.mjs`)
`findAchOrder` returns `matchedBy`; only a paymentId match may fulfil without
an amount check. HOW IT BREAKS: a caller that ignores `matchedBy` silently
restores the original defect. There is no type-level enforcement.

**Price and catalog gates** (`checkoutLinePriceGuard.mjs`, `checkoutStockAvailabilityService.mjs`)
Fail closed at 422/409 before Stripe. HOW IT BREAKS: the price guard validates
the SNAPSHOT deliberately — it must never be "improved" into a catalog
re-resolve, which would reprice a cart mid-checkout underneath the total the
buyer was shown.

**Backfill vs creation asymmetry** (`offlinePaymentOrderItems.mjs`)
Creation throws; backfill cannot. HOW IT BREAKS: making backfill throw "for
consistency" turns an idempotency replay of a paid order into a 500. The
asymmetry is the point.

---

## 5. Disproved, recorded so it is not re-raised

**Kimi H3 — duplicate payable sessions from an unstable idempotency key.**
The key incorporates `cart.lastCheckoutAttempt`, which the claim then mutates,
so a retry does compute a different key. But the claim is a conditional
`UPDATE ... WHERE status = 'active'` and returns 409
`CART_CHECKOUT_IN_PROGRESS` when it claims nothing, so a retry cannot reach
`sessions.create` at all. The only path that reopens the window is the
reconciliation sweeper releasing a stranded cart — and that case is terminal
after the H2 fix rather than a 500 storm. `[VERIFIED]` by reading
`v2PaymentRoutes.mjs` 588–604.

---

## 6. Known limitations / non-goals

- **Cart-add TOCTOU (GLM M2)** — closing it properly needs a unique index on
  active carts. Migration = production DDL, Sean-gated. NOT done.
- **Refund revocation policy** — still undecided (freeze vs revoke vs neither).
  Detection ships; revocation does not. Deliberate.
- **`packageType: 'monthly'`** — still unresolved with Sean.
- **Lead-capture contract regex looseness** — greedy `[\s\S]*` lets a later
  occurrence satisfy an earlier claim. Predates this work; noted, not fixed.
- **Files never reviewed** — both models flagged that `authorizeResourceAccess`
  (fix 15) was never in their packet, so that fix remains externally unaudited.

---

## 7. Test coverage

93 new tests across 6 files. Every fix mutation-verified — the guard is disabled
or reverted, the tests must go RED, then restored.

| File | Tests | Mutation result |
|---|---|---|
| `stripeRefundDisputeHandling` (extended) | 19 | short-circuit disabled → 6 of 7 leak tests RED |
| `orderItemPricingParity` | 13 | resolver reverted → 6 RED; backfill rethrow → 3 RED |
| `achPaymentIntentLifecycle` | 21 | weak-match → 3 RED; status guard → 2 RED; completed-order guard → 1 RED |
| `checkoutPriceAndCatalogGates` | 25 | catalog gate → 4 RED; price guard unwired → 2 RED; recovery removed → 4 RED |
| `sessionPackageWebhookFulfilment` | 8 | detector disabled → 3 RED |
| `moneyPathLowSeverityHardening` | 14 | each of 5 fixes reverted → 1–4 RED |

**Full backend suite: 9,500 pass / 6 fail / 9,510 total.** All 6 failures were
measured failing at this branch's base commit (`38e8355c1`) BEFORE this work:
equipment-scan ×4, associations-model-registry, phase1b-controllers. Zero
regressions introduced. 19 further files fail to COLLECT on missing optional
packages or are empty stubs — environmental, unchanged.

---

## 8. Rollback plan

Each commit is independently revertable and touches disjoint code except
`stripeWebhook.mjs` (three commits). To roll back the whole phase:

```
git revert --no-commit 8edbb1b89 254ea94ad bd87cd1c4 60ced794d acbc89b8a 3f061ec71 ce760b208
git commit -m "revert: money-path review round 2"
```

No migrations, no env vars, no feature flags — nothing to unwind outside git.
Reverting `ce760b208` alone restores the *worse-than-before* state described in
§1; do not revert it in isolation.

---

## 9. Future review hooks

1. **Re-attack the adoption guard with a promo-code cart.** C1 existed because
   two numbers that looked comparable were not. Confirm `amount_total` and
   `cart.total` still mean what §4 assumes after any tax or discount change.
2. **Check `matchedBy` is still honoured** at every `findAchOrder` call site
   after any new ACH state is added. Nothing enforces it.
3. **Verify the unfulfillable short-circuit is still FIRST** in the
   `checkout.session.completed` handler after any new side effect lands.
4. **Re-run the mutation suite**, not just the tests. Four times this workstream
   a test passed against deleted code. Passing tests are not evidence; RED
   under mutation is.
5. **Audit `authorizeResourceAccess`** — never included in either review packet.
6. **Re-examine the cart-add TOCTOU** when the unique-index migration is
   approved; GLM M2 stays open until then.
7. **Check whether `Order.status` ever gains `cancelled`.** If it does, the
   `payment_intent.canceled` handler should stop writing `failed`.
8. **Confirm `amountIsExactDelta` is surfaced** wherever refund alerts are
   read. A flag nobody reads is the same as no flag.

---

## 10. AI review log

| Round | Reviewer | Outcome |
|---|---|---|
| 1 | Kimi K3 | 1 CRITICAL, 3 HIGH, 4 MEDIUM, 6 LOW. C1/H1/H2 all real and verified against source. |
| 1 | GLM-5.3 | 0 CRITICAL, 3 HIGH, 4 MEDIUM, 3 LOW. Independently found the same fulfilment leak from a different direction. |
| 2 | Me (hostile) | Verified every finding against real code before acting. Disproved H3. Found the enum trap and the completed-order downgrade that neither model raised. |

**External-model calibration.** Both models earned their cost. Kimi is stronger
on composed/sequence defects (C1's tax-vs-total is a two-file composition); GLM
is stronger on control flow (it traced the refusal's fall-through into
`processCompletedOrder` line by line). Neither invented findings. Of 21 raised,
19 were real, 1 disproved (H3), 1 subsumed. That is a materially better hit rate
than earlier rounds and is attributable to packet construction: whole-family
source, not a diff.

---

## 11. Mistakes I made

- **My adoption guard was the defect this round exists to fix.** I compared
  `amount_total` to `cart.total` without checking they were the same quantity,
  in a workstream whose entire subject is money. Both models caught it. It
  shipped to `main`.
- **Unreachable assertions, for the fourth time in this workstream.** The
  downstream-leak tests caught 1 of 7 under mutation because my mocked cart had
  no `cartItems`, so `processCompletedOrder` returned early and the leak could
  not fire either way. Fixed the fixture; it then caught 6 of 7.
- **Then a fifth time, differently.** The 13 LOW-tier tests were written after
  their fixes, so none was ever observed RED. I only learned they bit by
  mutating afterwards. Writing the test after the fix is how a decorative test
  gets born.
- **I destroyed `node_modules` myself.** I created an NTFS junction to a live
  `node_modules` and then asked `git worktree remove --force` to delete the
  containing tree. It followed the junction and wiped the target — the second
  time this tree lost its dependencies, and the first time it was my doing.
- **`vi.clearAllMocks()` does not drain `mockResolvedValueOnce` queues.** Setups
  bled between tests and made unrelated assertions pass and fail at random. I
  chased three phantom results before recognising it.
- **A static import broke a suite outright.** Importing the session-package
  service pulled the whole Sequelize model graph into the webhook — the same
  static-import blast radius that broke four suites earlier in this workstream.
  I had already written that lesson down and still reached for the static
  import first.
- **Two source-pinned assertions broke on a rename I made.** They pinned
  variable NAMES rather than invariants. Re-anchored with reasoning, and
  re-verified both still bite.
- **The enum trap I nearly shipped.** My own test asserted `status: 'cancelled'`
  for the new cancellation handler. `Order.status` has no such enum member;
  it would have thrown in Postgres at runtime while passing every unit test.
  Caught by reading the model, not by any tool.

The repeat count is the signal here: unreachable assertions recurred **five
times in one workstream**, twice after I had written the lesson down. The
write-up was not the fix. The fix is procedural — mutate every new guard before
believing any test that covers it — and that is now what §7 records for each
file.

---

## 12. Sign-off

- Commits: `ce760b208` → `8edbb1b89` (7)
- Tests: 9,500 pass / 6 pre-existing failures / 0 regressions
- Rule 42 backend audit: clean (no untracked, no modified-uncommitted)
- Secret scan: clean on every commit
- Next: two items remain, both gated on Sean — the cart-add unique-index
  migration (GLM M2) and the refund revocation policy.
