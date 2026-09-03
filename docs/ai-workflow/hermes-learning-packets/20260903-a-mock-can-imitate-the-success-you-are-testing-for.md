---
date: 2026-09-03
originating_model: claude-opus-5
surface: vs-claude
workstream: SWA-225 blueprint v3, slice EX-2 (webhook redelivery proof)
decision: A stub that returns the wrong thing can produce the exact observation your assertion is looking for — assert the failing direction, not just the passing one
status: shipped
supersedes: none
models_used:
  - model: claude-opus-5
    role: builder + hostile reviewer
    did: wrote the redelivery proof, caught its own imitating mock, merged EX-2/EX-4/EX-3/EX-6
    cost: subscription
  - model: coderabbit (free tier)
    role: automated PR review
    did: reviewed PR 115, returned zero findings — no inline comments, no review body
    cost: free
skills_touched:
  - id: rule-73 (proof-before-done)
    change: reinforced
    failure: a green suite would have proved the opposite of its own claim
  - id: instrument-check
    change: widened
    failure: existing guidance covers instruments that CANNOT fire; this one fired correctly at the wrong thing
---

# A mock can imitate the success you are testing for

Yesterday's packet said: validate the instrument, because it may be incapable of
observing the thing. This is the sharper and more dangerous sibling. The
instrument here worked perfectly. It observed exactly what it was built to
observe. The problem was that a broken stub produced **the same observation as
success**, so a correct measurement pointed at the wrong conclusion.

## What happened

The task was to prove a Stripe webhook cannot double-grant when the same paid
event is redelivered. The assertion is a count: deliver twice, expect exactly one
grant.

I stubbed `hydrateCartCheckoutItems` to return nothing. The real service does
this:

```js
cart.cartItems = await hydrateCartCheckoutItems({ ... });
const sessionsToAdd = calculateCartSessionCredits(cart.cartItems);
```

It **assigns** the return value over the cart's items. My stub returned
`undefined`, so credits computed to zero, so no grant was ever issued.

Zero grants across two deliveries. Now read the assertion I was about to write:

> deliver the event twice, and confirm the customer was not granted twice

Zero satisfies that. A slightly looser assertion — `expect(grants.length)
.toBeLessThanOrEqual(1)`, or asserting on the response status rather than the
write — passes green, and the PR ships carrying a test whose name says
"idempotency is proven" while the code under test never executed.

The failure mode of my mock was **indistinguishable from the success I was
looking for.** That is the whole lesson.

## Who did what

**claude-opus-5** wrote the defect and caught it. It was caught by exactly one
thing: an in-suite control asserting the *opposite* direction — with the
idempotency key unable to persist, the same two deliveries MUST produce two
grants. That control reported zero, and zero is not two, so the control failed
and dragged the real defect into the light.

Had I written only the passing-direction assertion, nothing in the suite, the
review, or CI would have caught it.

**coderabbit (free tier)** reviewed the PR and returned zero findings — no inline
comments, no review body, on a diff containing a 250-line test with three
deliberately-shaped mocks. Recorded so the routing table reflects what it is
actually worth on a test-and-docs PR: on this one, nothing.

## Skills created or changed

No new skill. The `instrument-check` discipline needs its scope widened. Its
current framing is about instruments that cannot fire — a spy that is never
consulted, a probe wired to nothing. This case is the inverse: the instrument
fires correctly, and the *fixture* manufactures the reading. The generalisation
that covers both:

> For every assertion that something did NOT happen, write the paired assertion
> that it CAN happen, and make it run on every pass. A count of zero is only
> evidence of restraint if you have separately proven the thing is capable of
> counting to two.

That paired control is now in the suite permanently rather than being a
mutation someone has to remember to perform by hand.

## Mistakes I made

1. **The imitating mock above.** Nearly shipped a proof of the opposite of its
   claim.
2. **Two more stubs returned the wrong SHAPE, not the wrong value.**
   `claimIdempotentRecord` returned `undefined` where the caller destructures
   `{ record, created }`; `createCommissionForPurchase` returned `undefined`
   where the caller chains `.catch()` on it directly. Both threw into a 500. A
   stub must satisfy the caller's *contract*, not merely exist.
3. **I measured a bundle delta with a control that did not remove the thing**
   (a second file still imported the SDK), and compared builds against a `dist/`
   that is never emptied. Two confident wrong numbers in one slice.
4. **I read "missing tooling" as absence rather than as branch drift.** The
   orient renderer and the workstream blueprint exist only on a stale wip branch,
   not on main; my worktree is main-based, so both looked deleted.

## Error → fix → repeat ledger

| error class | times this session | written up before recurring | what actually stopped it |
|---|---|---|---|
| a measurement that imitates the expected result | 1 | no — this is the new one | assert the opposite direction, in-suite, every run |
| stub satisfies the import but not the caller's contract | 2 | no | read the call site, not just the module's exports |
| control that does not remove what it claims to remove | 1 | **yes — yesterday's packet** | make the control's own effect visible before trusting it |
| stale artifacts / stale branch read as truth | 2 | **yes — twice now** | `rm -rf` the output dir; check which branch actually has the file |

Rows three and four are repeats of lessons written up **the previous day**, which
is the highest-signal fact in this table. Writing a lesson down did not prevent
its recurrence. What prevented recurrence in the one case where it worked was a
mechanical step that runs whether or not I remember the lesson: the in-suite
opposite-direction control. Prose in a packet is not a fix; a control that runs
on every CI pass is.

## External-model calibration

- **coderabbit, free tier:** 0 findings on a 2-file, ~490-line test-and-docs PR.
  Not a substitute for control mutation. Cost $0, so it is not worth removing
  either — just do not let its green mean anything.
- **codex:** still unavailable on this workstream (OpenRouter-billed, returns
  402). Blueprint v3 labelled it a free seat; that is wrong and has now cost two
  sessions a review pass each.

## The transferable rule

Before trusting a test that asserts something did not happen, ask: **what else
would produce this same reading?** If a broken fixture, a skipped branch, or a
zeroed input would produce it too, the assertion is not measuring what its name
claims. Add the control that must fail, keep it in the suite, and let it run
forever — the version of this lesson that survives is executable, not written.
