---
decision: Full handoff of the money-path security workstream — 22 commits across three review rounds, branch pushed, awaiting merge decision.
status: open
supersedes: none
---

# Money-Path Security Workstream — Handoff

**For:** the next agent (any model)
**Branch:** `claude/refund-lifecycle-20260819` — pushed to origin, **NOT merged to main**
**State:** 22 commits, 9,536 backend tests passing, 0 regressions, hostile loop dry across 5 rounds
**Blocking:** Sean's go-ahead on merge + Render deploy. Nothing technical is blocking.

---

## 1. Read this first — the environment trap that cost this session

**The work lives in a git worktree at `c:/tmp/ss-cart-role-20260816`, NOT in the
main repo at `c:/Users/BigotSmasher/Desktop/quick-pt/SS-PT`.**

Consequences you must know before running anything:

| Thing | Where it works |
|---|---|
| `npx vitest run`, `node --check`, git ops on the branch | the **worktree** |
| `scripts/consult-kimi.mjs`, `consult-glm.mjs`, anything needing `.env` | the **main repo** — `.env` is gitignored, so the worktree does not have it |

I burned real time and asked Sean to "restore" an API key that was never
missing, because I ran a consult script from the worktree, got
`OPENROUTER_API_KEY not found`, and believed it. **Validate the instrument
before believing a negative.** Presence check that never exposes a value:

```bash
cd c:/Users/BigotSmasher/Desktop/quick-pt/SS-PT
grep -c '^OPENROUTER_API_KEY=' .env     # returns a COUNT, never the value
```

Two more environment facts, both of which bit me:

- **`backend/node_modules` has been wiped twice.** Once inherited, once caused by
  me: I made an NTFS junction pointing at a live `node_modules`, then ran
  `git worktree remove --force` on the containing tree — it followed the
  junction and deleted the target. **Never create a junction into a tree you
  will later delete.** Recovery: `cd <worktree>/backend && npm install --no-audit --no-fund`.
- **Bash heredocs die on backticks**, and python one-liners die on regex escapes.
  Write patch scripts to a file (`c:/tmp/patch_x.py`) and execute them. I lost
  four attempts to this before adapting.
- **`io.open(p,'w').write(f(...))` truncates the file before evaluating `f`.**
  If `f` throws you are left with a 0-byte file. I destroyed one of my own test
  files this way. Compute the content fully, *then* open the handle.

---

## 2. What this workstream is

SwanStudios has four money rails: v2 Stripe card checkout (primary), ACH
(1–3 day settle), offline (check/zelle/venmo), and admin manual grant. This
workstream hardened all four against a class of defect where **money is captured
and nothing is delivered, silently**.

It ran in three review rounds. Each round attacked the previous round's fixes.

---

## 3. Commit history — 22 commits

### Round 1 (15 commits, already on `main`)

Closed: unpaid role escalation at add-to-cart, a self-service role-upgrade
endpoint, retired items purchasable on the primary rail, $0 package pricing on
ACH/offline, a dead quantity ceiling (`MAX_CART_ITEM_QUANTITY` was destructured
off the default export and bound `undefined`, so every ceiling check was
`n > undefined` = false), the crash-window CRITICAL, refund/chargeback
blindness, webhook mount divergence, partial-refund mishandling, and a
string-vs-INT authz query.

### Round 2 (7 commits + 2 docs, on this branch)

Kimi K3 + GLM-5.3 reviewed all 15. **Both independently found that one round-1
fix had made production worse than before it landed.**

| SHA | Fix |
|---|---|
| `ce760b208` | Adoption guard: equality → verifiability; terminal returns; webhook short-circuits before any side effect |
| `3f061ec71` | ACH/offline `OrderItem` rows through the shared resolver — they recorded $0.00 on correctly-charged packages |
| `acbc89b8a` | Shared `findAchOrder` across all 4 ACH states; weak-match amount coverage; new `payment_intent.canceled` |
| `60ced794d` | Price gate at v2 checkout (422) + catalog-row-absence gate (409) |
| `bd87cd1c4` | Session-package webhook fulfilment (lazy-imported) |
| `254ea94ad` | LOW cluster: array guard, finite guard, refund-delta selection, VIP amount, `/cancel-checkout` limiter |
| `8edbb1b89` | verify-session crash-window recovery + `amountTotalCents` passthrough |
| `5cbb6e29a` | Rule 48 phase audit record |
| `260059b19` | Rule 68 learning packet |

### Round 3 (3 commits, on this branch)

GLM-5.3 reviewed the round-2 fixes with **the fixes as the attack surface**.
Two HIGHs — one of them inside the fix I wrote for round 2.

| SHA | Fix |
|---|---|
| `5381f2bfd` | H1: `unfulfillable` honoured by all three callers; H2: webhook classifies `CheckoutInventoryError` as terminal |
| `ec14ed39f` | L1: three paid cart-rail dead ends now alert; L3: ACH advisory diff uses `resolveUnitPrice` |
| `508454f31` | Rule 68 learning packet |

---

## 4. The three defect patterns that recur — expect them again

Every round found the same shapes. If you continue this work, hunt these first.

**A. A guard that refuses but does not stop the caller.**
Round 2: the adoption guard returned a refusal and the webhook fell through into
`processCompletedOrder` — promoting the user with zero sessions, booking an
order at a mutated total, paying trainer commission on money never collected.
Round 3: the *fix* for that added `unfulfillable: true` and taught **one of
three callers**. The other two answered `success: true` with `sessionsAdded: 0`.

*Rule: adding a field that changes control flow is a CONTRACT change. `grep` for
every caller before adding it. The new field is `undefined` in old code and
`undefined` is falsy, so silent mis-handling is the default.*

**B. Two figures compared as if they were the same quantity.**
The adoption guard compared `session.amount_total` (post-tax, post-discount —
`automatic_tax` and `allow_promotion_codes` are both enabled) against
`cart.total` (written pre-tax as `const total = subtotal`, pre-discount). Every
taxed or promo cart in the recovery path was refused, silently.

*Rule: before writing a money comparison, establish in the code that both sides
mean the same thing. Cite the line numbers in the comment. Use COVERAGE
(`paid >= owed`), not equality. Unverifiable fails CLOSED — unknown is not
agreement.*

**C. Fix-shaped propagation that skipped a sibling.**
`payment_intent.succeeded` hardened while `processing`/`payment_failed` were
not. A price resolver applied to the charge but not to the durable `OrderItem`
rows. Alerts added to the ACH/print/session-package rails but not the cart
rail's own dead ends. A terminal error classified correctly in `verify-session`
and rethrown forever in the webhook.

*Rule: when you fix one rail/state/caller, enumerate its siblings in the same
pass and say explicitly which ones you checked.*

---

## 5. Verification standard used here — do not lower it

**Mutation-verify every guard.** Disable it, run the tests, require RED, restore,
require green. This is not optional and the commit messages record the result
for each.

**Why it is not optional:** six times in this workstream a test passed against
effectively-deleted code. The worst instance — a source-text contract suite
scored **14/14 while both guards it covered were neutered**, because
`if (false && result?.unfulfillable)` still contains the text it matched.

**Source-text tests prove a branch EXISTS. Only an executed request proves it
FIRES.** Guards now have behavioural suites driving the real router over
supertest:

- `tests/api/verifySessionRefusalBehaviour.test.mjs` — neutering the guard → 8 RED
- `tests/api/adminGrantRefusalBehaviour.test.mjs` — neutering the guard → 5 RED
- `tests/api/sessionPackageWebhookFulfilment.test.mjs` — disabling alerts → 3 RED

Two more test traps found here:
- **Mocking a local function does nothing.** `captureVerifiedCheckoutLead` is
  defined *in* `v2PaymentRoutes.mjs`, not imported. My mock intercepted nothing
  and the assertion passed vacuously. Assert on a real import instead.
- **`vi.clearAllMocks()` does not drain `mockResolvedValueOnce` queues.** Setups
  bleed between tests. Use `vi.resetAllMocks()` and re-establish implementations.

If a source assertion is the only practical option, **strip comments before
matching** — twice a guard passed by matching the prose describing the defect it
was written to catch.

---

## 6. Current verification state (run 2026-08-20)

- **Full backend suite:** `npx vitest run` from the worktree → **9,536 passed /
  6 failed**. Those 6 were measured failing at base commit `38e8355c1` BEFORE
  any of this work: equipment-scan ×4, associations-model-registry,
  phase1b-controllers. **Zero regressions.**
- 19 further files fail to COLLECT on missing optional packages or are empty
  stubs — environmental, unchanged.
- `node --check` exit 0 on all changed modules.
- Pushed artifact verified: `git hash-object` matches
  `git rev-parse origin/<branch>:<path>` for every changed file.
- Secret scan CLEAN on every commit. Rule 42 backend audit clean.

**Not proven in-session:** no live Stripe event, no real Postgres, no
authenticated browser journey. The backend cannot boot here — DB-on-import fails
identically for untouched modules (control-confirmed). The deploy itself is
unproven because it has not happened.

---

## 7. What is left

### Blocking on Sean
1. **Merge to `main` + Render deploy.** Nothing technical blocks it.
2. **M2 — `Order.totalAmount` means two different things per rail.** The card
   rail records `cart.total` (pre-tax); `fulfillSessionPackageCheckoutSession`
   records `session.amount_total / 100` (post-tax). Revenue sums understate
   every taxable order and Stripe reconciliation disagrees by the tax. Fixing
   it changes a durable column's meaning and implies a backfill decision.
3. **Refund revocation policy** — freeze unused sessions / revoke all / neither.
   Detection ships; revocation deliberately does not.
4. **Cart-add TOCTOU** — needs a unique index on active carts. Production DDL.

### Open technical work (tracked in SWA-168)
5. **M1** — gallery credit/donation replay guards commit outside the fulfilment
   they gate. The print rail got a shared transaction for exactly this; its two
   siblings did not. A crash between the marker INSERT and the increment leaves
   a paid session marked processed with nothing delivered.
6. **L2 — adoption TOCTOU.** The adoption check reads persisted `cart.total`,
   then hydrates items after. An `add` committing in that sliver makes hydration
   see an item the verified total never included. Deliberately deferred: this
   guard has caused two separate regressions already and deserves its own slice.
7. **L4** — a finalized-but-response-lost cart has no recovery. Sweeper and
   verify-session recovery both require `checkoutSessionId: null`;
   `/cancel-checkout` needs the id the browser never received. UX lockout until
   24h expiry, no money captured.
8. **`authorizeResourceAccess`** (round-1 fix 15) was never included in any
   review packet — externally unaudited.

---

## 8. How to run the external reviewers

**From the main repo, not the worktree** (see §1).

```bash
cd c:/Users/BigotSmasher/Desktop/quick-pt/SS-PT

# GLM-5.3 — subscription, no spend cap needed
node scripts/consult-glm.mjs --document <packet.md> --out <out.md>

# Kimi K3 — PAID. Sean's standing rule: ONE review, ask before a second.
# Fail-closed on SWAN_CONTEXT_MAX_USD; set a tight per-invocation cap.
SWAN_CONTEXT_MAX_USD=0.55 node scripts/consult-kimi.mjs \
  --document <packet.md> --out <out.md> --effort high --remit "..."
```

Note the flag is `--document`, **not** `--file`. Passing `--file` prints usage
and exits 0 — a silent no-op that looks like success.

**Packet construction matters more than the remit.** Round 2 landed 19 of 21
findings real, and both models attributed that to receiving **whole-family
source** rather than a diff. The builder is at `c:/tmp/build_packet2.py`. Cost
scales with packet size: ~50k tokens ≈ $0.37, ~65k ≈ $0.51.

**Model strengths, measured across two rounds:**
- **Kimi K3** — defects that exist only in the COMPOSITION of two files.
- **GLM-5.3** — control flow, downstream consequence tracing, and
  *precedent-finding*: for both round-3 HIGHs it named an existing correct
  implementation elsewhere and framed the defect as drift from it. Prompt for
  that explicitly; it makes fixes obvious and low-risk.
- Both correctly list files they were not given and decline to rate findings
  that depend on them. Treat that as a quality signal.

---

## 9. Mistakes I made — so you do not repeat them

- **Shipped a contract change to one of three callers** — in the very slice that
  existed to fix sibling drift.
- **Compared two different quantities in a workstream about money**, and shipped
  it to `main`. My own hostile pass cleared it. Two external models caught it.
- **Six decorative-assertion incidents**, documented after several of them and
  still repeated. The write-ups were never the fix; changing the KIND of test
  was.
- **Claimed an API key was missing** because I ran the script from the wrong
  directory, and asked Sean to restore something that was never gone. He was
  using other agents successfully at the time, which was the evidence I should
  have weighted over my own tool output.
- **Destroyed `node_modules`** with a junction + forced worktree removal.
- **Truncated my own test file** by opening a write handle before the expression
  that produced the content.
- **Wrote an alert calling `sendNotification` in a route that never imported
  it** — a ReferenceError on the refusal path only.
- **Quoted ~$0.25–0.35 for a paid review pass** without re-estimating for a
  larger packet; the real figure was $0.51.

The pattern across all of these: **a destructive or outward action ordered
before the check that would have caught it.** Verify, then act.

---

## 10. Pointers

- Round-2 audit record: `docs/ai-workflow/AI-HANDOFF/MONEY-PATH-REVIEW-ROUND-2-AUDIT-RECORD-2026-08-20.md`
- Learning packets: `docs/ai-workflow/hermes-learning-packets/20260820-*.md`
- Linear: **SWA-168** carries the full disposition of both review rounds and all
  deferred findings.
- Reviewer outputs: `c:/tmp/glm-round3.md`, `c:/tmp/kimi-final-review.md`,
  `c:/tmp/glm-final-review.md`.
- Review packet builder: `c:/tmp/build_packet2.py`.
