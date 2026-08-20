---
title: "A guard that refuses must also stop the caller"
originating_model: claude-opus-5
tier_basis: "Sean designated claude-opus-5 Fable-tier 2026-08-10; this session ran as Opus 5 throughout and authored every fix and verification in this packet."
privacy: "IDs and roles only. No client names, no PII, no credentials, no absolute paths. Secret-scanned clean before commit."
date: 2026-08-20
surface: "money-path / stripe-webhook / checkout"
decision: "A guard that refuses must also stop the caller — and a fix's own correctness is not evidence the system got safer."
status: shipped
supersedes: none
models_used:
  - model: claude-opus-5
    role: "builder + hostile reviewer + final decider"
    did: "wrote the 7 fixes, verified every external finding against real source, disproved one, found two defects neither model raised (Postgres enum trap, completed-order downgrade)"
    cost: "subscription"
  - model: moonshotai/kimi-k3
    role: "external hostile review"
    did: "found C1 (tax/promo vs cart.total), H1 (zero-total bypass), H2 (500 retry storm), M1-M4, L1-L6; 13 of 14 real"
    cost: "~$0.27"
  - model: glm-5.3
    role: "external hostile review"
    did: "independently found the fulfilment leak downstream of the refusal, the OrderItem $0 regression, the ACH sibling drift, the missing price gate; 10 of 10 real"
    cost: "subscription"
skills_touched:
  - id: "rule-73 (proof-before-done)"
    change: "reinforced"
    motivating_failure: "five separate unreachable-assertion incidents in one workstream — tests that passed against deleted code. \"Tests pass\" is not proof; RED-under-mutation is."
  - id: "rule-58 (proactive schema-drift detection)"
    change: "extended-in-practice"
    motivating_failure: "nearly wrote a status value of cancelled into a Postgres ENUM with no such member. Unit tests all passed. The drift class is enum membership, not just column names."
  - id: "rule-20 / rule-54 (sibling sweep)"
    change: "reinforced"
    motivating_failure: "three of four LOW findings were sibling DRIFT — one rail hardened, its twin left behind. Also: adding one import broke a suite that partially mocked the module."
---

# A guard that refuses must also stop the caller

## The lesson

I wrote a guard that correctly refused to adopt a cart it could not verify. The
guard was right. The system got **worse**, because the refusal `return`ed
normally and the webhook kept going — promoting the user to `client` with zero
sessions granted, booking a `completed` order at a mutated total, paying trainer
commission on money never collected, awarding points, and sending a "New
Purchase" notification. Then it 200'd, so Stripe never retried, and no alert
fired.

Before my fix: a loud failure that at least retried and was visible.
After my fix: silent, permanent, and it leaked everything the grant would have.

**A refusal is only a refusal if the caller stops.** Refuse, short-circuit
before any side effect, and alert. Three parts. I shipped one.

## The second half of the same lesson

The same guard also compared `session.amount_total` against `cart.total`. Those
are not the same quantity: the checkout enables `automatic_tax` and
`allow_promotion_codes`, so `amount_total` carries tax and reflects discounts,
while `cart.total` is written pre-tax (`const total = subtotal`) and
pre-discount. Every taxable or promo cart in the recovery path was refused — the
exact population the recovery exists to serve.

In a workstream whose entire subject is money, I compared two numbers without
checking they measured the same thing.

The generalisation: **before writing any comparison between two money figures,
establish in the code itself that both sides mean the same quantity.** When I
later added an amount check to the ACH rail, I first read `achPaymentRoutes` 276
and 320 to confirm `Order.totalAmount` and the PI `amount` are both
`totalWithFee`, and wrote that citation into the comment. That is the shape.

Related: use **coverage, not equality**. Paying more than owed is fine; paying
less is not. And **unverifiable fails closed** — unknown is not agreement.

## Who did what

**Kimi K3** found the tax/promo mismatch and the zero-total bypass — both are
*compositions* across two files (the guard in one, the non-fatal totals write in
another). That is its strength: defects that only exist in the interaction.

**GLM-5.3** found what happened *downstream* of my refusal, tracing the
fall-through into `processCompletedOrder` line by line. That is its strength:
control flow.

Neither would have found the other's. Sending both the **whole family's source**
rather than a diff is what made this round land 19 of 21 findings real.

**I** verified all 21 against real code before acting, disproved one (Kimi H3 —
the cart claim is conditional on `status: 'active'` and 409s, so a retry cannot
mint a second session), and found two that neither model raised: the Postgres
enum trap, and a late `processing` event downgrading a completed order.

The model that was WRONG matters as much as the ones that were right — and the
model that was wrong most expensively was **me**, on my own prior fix.

## Skills created or changed

No new skill. Three existing rules earned reinforcement, each against a specific
failure — recorded in the frontmatter rather than restated here, because a rule
recorded without the failure that motivated it becomes cargo-cult within a
month.

The one procedural change worth institutionalising: **mutate every new guard
before believing any test that covers it.** Not "write tests." Not "review
carefully." Disable the guard, run the tests, require RED, restore. Every guard
in these 7 commits carries its mutation result in the commit message.

## Mistakes I made

- Shipped the defect this round exists to fix, to `main`, after my own hostile
  pass cleared it.
- Unreachable assertions **five times in one workstream**, twice after writing
  the lesson up.
- Wrote 13 tests after their fixes, so none was ever observed RED.
- Destroyed `node_modules` by junction + `git worktree remove --force`.
- `vi.clearAllMocks()` leaves `mockResolvedValueOnce` queues; setups bled
  between tests and I chased three phantom results.
- Reached for a static import that pulled the Sequelize model graph into the
  webhook — the same blast radius I had already documented.
- Nearly wrote a non-existent enum value that every unit test would have passed.

## Error → fix → repeat ledger

| Error class | Recurrences this session | Documented before recurring? | What finally stopped it |
|---|---|---|---|
| Unreachable assertion | 5 | YES — twice | Mandatory mutation of every guard; result recorded per-file |
| Static import blast radius | 1 | YES | Lazy `await import()` inside the branch |
| Test pinned to identifier not invariant | 2 | No | Re-anchor to the invariant, then re-verify it still bites |
| Two quantities compared as if comparable | 1 | No | Cite both definitions in the comment before writing the comparison |
| Guard exists but nothing asserts it | 1 | No | Surviving mutation is the detector — it is why this was found |

The highest-signal row is the first: **documented, then repeated, five times.**
That proves writing it down is not a fix. What stopped it was a mechanical step
I now perform before making any claim — not an intention to be careful.

## External-model calibration

| Model | Raised | Real | Disproved | Cost | Best at |
|---|---|---|---|---|---|
| Kimi K3 | 14 | 13 | 1 (H3) | ~$0.27 | composed/sequence defects across files |
| GLM-5.3 | 10 | 10 | 0 | subscription | control flow, downstream consequence tracing |

Both explicitly listed the files they were NOT shown and declined to rate
findings that would depend on them — including `authorizeResourceAccess`, which
means that earlier fix is still externally unaudited. That refusal to speculate
is itself a quality signal and is worth weighting when choosing a reviewer.
