---
title: The test required the bug
originating_model: claude-opus-5
tier_basis: Sean's designation 2026-08-10 — Opus 5 is Fable-tier; claude-opus-5 is on the Rule 68 tier_allowlist
date: 2026-08-16
decision: guard-shaped constants take NAMED imports (link-time validated) and every guard gets a behavioural test; a source-matching assertion is anti-regression only and may never be a guard's sole coverage; at least one test per module must import the real, unmocked module
status: draft
supersedes: none
privacy: IDs/roles only; no PII, no secrets, no absolute paths
topic: "A guard compared against undefined for months — the test suite required the broken binding as a matter of policy, and its mock was more complete than the real module"
models_used:
  - model: claude-opus-5
    role: builder, verifier, hostile reviewer
    did: found and runtime-proved a dead money-path guard while porting an unrelated fix; baselined every suite against pristine origin/main before attributing failures; mutation-tested three guards; disproved 3 of 7 external findings
    cost: subscription (flat)
  - model: z-ai/glm-5.3
    role: hostile reviewer of the finished branch
    did: 7 substantive findings — 4 real and fixed (best one, a subtle test false-green, was correct and unconsidered), 3 disproven on verification including 2 rated CRITICAL on files it could not see
    cost: flat-rate Z.ai coding plan
skills_touched:
  - id: test-driven-development
    change: proposed-amendment
    failure: a suite mocked the module under test and supplied a constant the real module never exported on that path, so it was green against a shape that does not exist at runtime
  - id: verification-before-completion
    change: proposed-amendment
    failure: a source-matching assertion ("the file contains `qty > MAX`") passed while the guard was completely inert; nothing required a behavioural check of the guard's effect
  - id: rule-18-existing-pattern-first
    change: proposed-amendment
    failure: the rule says match the working in-repo example; I matched an in-repo example that was itself broken, and propagated the defect to two more files before a behavioural test caught it
---

# The test required the bug

## The lesson

`utils/cartHelpers.mjs` exports the cart's quantity ceiling as a **named export only**:

```js
export const MAX_CART_ITEM_QUANTITY = 99;
```

It is not a key on the module's default-export object. `cartRoutes.mjs` took it off the
**default**:

```js
const { MAX_CART_ITEM_QUANTITY } = cartHelpers;   // => undefined
```

So all three ceiling checks computed `n > undefined`, which is `false` for every `n`. The
guard had never fired. The user-facing message rendered as:

> Quantity must be **undefined** or fewer per item.

Proven at runtime rather than inferred:

```
named export MAX_CART_ITEM_QUANTITY = 99
default export keys = [ calculateCartTotals, persistCartTotals, updateCartTotals,
                        getCartTotalsWithFallback, validateCartItemSessions, debugCartState ]
what cartRoutes.mjs:31 actually binds = undefined
9999999 > MAX_CART_ITEM_QUANTITY => false
```

## Why nothing caught it

There was a dedicated suite — `cartQuantityCeiling.test.mjs`, ten passing tests. Two independent
failures let the bug through, and the second is the interesting one.

**1. The mock was more complete than the module.** The suite did:

```js
vi.mock('../../utils/cartHelpers.mjs', () => ({
  default: { MAX_CART_ITEM_QUANTITY: 99, /* ... */ },
}))
```

It invented a default-export shape the real module does not have, then tested against it. Every
assertion was true of the mock and false of production.

> **A mock is an unverified assertion about the real module's shape.** If no test in the suite
> imports the real thing, the suite is testing your beliefs, not your code.

**2. The suite required the broken binding, by policy.** This assertion:

```js
expect(source).toMatch(/MAX_CART_ITEM_QUANTITY \} = cartHelpers/);   // the DEFECT
```

pinned the defect in place. Anyone who fixed the binding would have *broken the test* and,
reasonably, reverted. And the very next line required the **correct** shape of a different file:

```js
expect(checkout).toMatch(/import \{ MAX_CART_ITEM_QUANTITY \}/);      // the FIX
```

Both patterns sat four lines apart in one test, one enshrined as required and one as required,
and nothing noticed they contradicted each other.

> **A source-matching assertion encodes today's text as tomorrow's requirement.** Written before
> the behaviour is verified, it converts a bug into a contract.

## The two rules that fall out

**Guard-shaped values take named imports.** ESM validates named imports at link time — remove or
rename the export and the module fails to load. A default destructure of a missing key binds
`undefined` in silence. This is not stylistic; it is the difference between a loud failure and a
disabled security control. (Vitest enforces it too: a mock that omits a named export *throws* on
access, which is exactly the behaviour you want.)

**Every guard needs one behavioural test, not only a source test.** The split that worked here:

| Layer | Proves | Fails when |
|---|---|---|
| Behavioural (runtime, real request) | the guard *acts* | the guard is inert |
| Source/text guard | the shape isn't reintroduced | someone re-adds the pattern |

The text guard is anti-regression only. If it is the sole coverage, an inert guard reads as green
forever. In this branch the source-parity test passed while the ceiling was completely dead; the
behavioural test — `expect(response.status).toBe(400)` — is what exposed it.

## Corollary: existing-pattern-first assumes the pattern works

I introduced this same bug into two more files. Porting a fix onto the ACH and offline payment
rails, I copied `cartRoutes.mjs`'s idiom because it was the established in-repo pattern — and
inherited its `undefined`. The *correct* sibling (`v2PaymentRoutes.mjs`, named import) was one grep
away.

> **Before propagating an in-repo pattern, verify the pattern's runtime effect — not just that it
> exists.** "Three files do it this way" is evidence of consistency, never of correctness. When two
> siblings disagree, the disagreement is the finding.

## Corollary: baseline before you attribute

A full suite run showed 14 failing files. Instead of guessing, I stashed, checked out pristine
`origin/main`, re-ran the same files, got **identical** numbers, and restored. Zero were mine.

> Never attribute a failure — or claim a clean run — without the same command on the unmodified
> baseline. "14 failed" and "14 failed, exactly as before" are opposite facts.

## Who did what

**claude-opus-5** built and verified all four commits. It found the dead ceiling *by accident* —
while porting an unrelated fix onto a sibling rail, its own behavioural test returned 200 where 400
was expected. It had already propagated the same defect into two more files before that test fired.
It also disproved three of GLM's seven findings by reading the files GLM named.

**z-ai/glm-5.3** reviewed the finished branch hostilely and produced the single best finding of the
session: the escalation regression test would **false-green** on a reintroduction shaped as
`user.role='client'; await user.save()`, because the mocked user instance had no methods, the old
code swallowed its own errors, and the assertion only watched `User.update`. That was correct,
subtle, and unconsidered; a mutation test confirmed it exactly. GLM was also **wrong twice at
CRITICAL**, both times on files it had not been given — it converted "I would need this file" into
top severity. Its own honesty about those blind spots is what made the errors cheap to correct.

The division that worked: **GLM attacks the tests, the local model settles the facts.** GLM cannot
resolve a mount, a caller, or a runtime binding from a file dump, and should never set priority.

## Skills created or changed

- **`test-driven-development` — proposed amendment.** Nothing in the discipline requires a single
  unmocked test per module. A suite that mocks its subject and invents a shape the module lacks is
  green against fiction. Add: *at least one test per module must import the real thing.*
- **`verification-before-completion` — proposed amendment.** A source-matching assertion passed
  while the guard was inert. Add: *a guard is not verified until a behavioural test shows it acting;
  text guards are anti-regression only.*
- **Rule 18 (existing-pattern-first) — proposed amendment.** The rule sent me to an in-repo example
  that was itself broken, and I propagated it. Add: *verify the pattern's runtime effect before
  propagating; when two siblings disagree, the disagreement is the finding.*

## Mistakes I made

- **I propagated a broken idiom because the rules told me to match the existing pattern.** Copied
  `const { MAX_CART_ITEM_QUANTITY } = cartHelpers;` from `cartRoutes.mjs` into two payment rails →
  caught by my own behavioural test (expected 400, got 200) → rule: verify a pattern's runtime
  effect before propagating it; the correct sibling was one grep away.
- **My source-parity test went green with the guard completely dead.** It matched
  `qty > MAX_CART_ITEM_QUANTITY` as text in both rails → caught only because I had also written a
  behavioural case → rule: text proves text; behaviour proves behaviour.
- **I let spies leak between test cases.** No `beforeEach` reset, so case 1's call failed case 2's
  `not.toHaveBeenCalled()` — and I briefly read that manufactured failure as a real finding about
  `adminOnly` → rule: reset every spy in `beforeEach`; unreset spies invent discoveries.
- **My first quantity predicate was clever and wrong at the edges.** A `String(x).trim() !==
  String(qty)` comparison rejected a legitimate `"02"` → caught in my own hostile pass → replaced
  with `Number()` + `typeof` guard → rule: prefer obvious semantics over a predicate that happens
  to pass today's cases.
- **I stated a reachability negative from a two-file search.** Claimed `testRoutes` was unmounted
  after checking `core/routes.mjs` and `server.mjs`; the real mount was `routes/api.mjs:33`. I
  corrected it in the same turn, but the claim was already out. **This is a repeat**: earlier in the
  same session the instrument-validation habit caught a too-narrow search *before* I spoke. The
  habit is real but I applied it selectively — see the ledger.
- **I deferred a question that was cheaper to answer than to record.** Logged "paid-path promotion
  is only asserted by a grep" as an open item; closing it took two greps of the webhook.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before it recurred? | What actually stopped it |
|---|---|---|---|
| Too-narrow search → premature absence claim | 2 | **Yes** — the validate-the-instrument habit is an existing memory, and it worked the first time (adminAuth mounts). It failed the second time (testRoutes) because I only invoked it when I *expected* to be wrong. | Nothing yet. The habit is conditional on suspicion, which is exactly when it is least needed. **Procedural fix: for any mount/reachability negative, the whole-tree grep is the FIRST command, not a confirmation step.** |
| Source-matching assertion mistaken for proof | 2 (own comment tripped one; dead guard passed another) | No — discovered this session | Pairing every text guard with a behavioural case, and mutation-testing both. |
| Propagating an unverified in-repo pattern | 1 (into 2 files) | No | A behavioural test on the newly-written code. Would have been cheaper: grep the other siblings first and notice they disagree. |
| Test-harness self-inflicted failure (spy leak, own comment matching own regex) | 2 | No | Reading the failure before believing it. Both looked like product findings for ~30 seconds. |

The repeat entry is the one that matters. A habit that fires only when you already suspect a
problem is not a control — it is a coincidence. **The fix that survives is procedural (run this
command first), never resolutional (be more careful).**

## External-model calibration

- **z-ai/glm-5.3** — hostile review of a 4-commit branch (22.6k in / 16.2k out, 12.5k reasoning,
  ~254s, flat-rate coding plan). **7 substantive findings → 4 real and fixed, 3 disproven on
  verification, 2 of the disproven rated CRITICAL.** Real: per-request quantity aggregation; the
  `save()`-shaped test false-green; a `NODE_ENV` assertion matching only `===` and missing the
  `!==` fail-open spelling; no assertion on the Stripe amount. Disproven: "v2 rail may not filter
  isActive" (it does, via `checkoutStockAvailabilityService`), "no paid path proven to promote /
  may promote on ACH `processing`" (promotion is on `succeeded`, gated on sessions granted), "the
  $0.02 tolerance compares the wrong total" (client sends pre-fee, server compares pre-fee).
  **Verdict: outstanding at adversarial TEST review — it attacks assertions better than I do.
  Systematically over-rates severity on unseen files. Use for finding; never for prioritising.**

## What carries forward

1. Anything guard-shaped (`limit`, `max`, `ceiling`, `allowlist`, `role`) takes a **named import**.
2. Every guard gets a **behavioural** test. Text guards are anti-regression, never proof.
3. A mock's shape is an unverified claim; keep at least one **unmocked** test per module.
4. A source-matching assertion written before behaviour is verified can enshrine a bug — when a
   test *requires* an odd shape, ask why, and check the shape actually works.
5. Verify an in-repo pattern's runtime effect before propagating it; sibling disagreement is a finding.
6. Baseline against the unmodified tree before attributing any failure or claiming a clean run.
