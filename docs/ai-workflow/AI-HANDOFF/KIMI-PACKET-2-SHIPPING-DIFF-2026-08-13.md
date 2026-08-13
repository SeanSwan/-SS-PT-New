---
title: Kimi review 2 — the four bug fixes about to reach production
date: 2026-08-13
originating_model: claude-opus-5
reviewer: moonshotai/kimi-k3
remit: last check before an irreversible push to a deploy-on-push branch
privacy: IDs/roles only; no secrets, no PII, no DB material, no absolute paths
---

# Remit

Four bug fixes are about to be pushed to a branch that **deploys on push**. Your first
review (S4 certification gate) returned NOT FIT and was right on every claim I verified —
P5, P2, P1 and the P1 corollary all reproduced. Six of your nine items are fixed.

This packet is a different target: **the product fixes themselves**, not the gate. I am
asking for the thing that is cheapest to get wrong and most expensive to discover in
production.

Rank findings by whether an ordinary user or trainer trips them, not by severity label.

## What ships

Nine commits, 24 files, +2821/−25. **Zero migrations in the range** (verified both
directions: none in my commits, none in the 40 commits that landed on main while I
worked). No schema change executes on this push.

### Fix 1 — trainer calendar authorization

`POST /api/sessions/block` forwarded `req.body` to a service that resolved the subject as:

```js
trainerId: trainerId || (user.role === 'trainer' ? user.id : null)
```

The submitted value short-circuits the `||`, so the authenticated identity was never
consulted. Any authenticated trainer could write blocked time onto a colleague's calendar;
a recurrence rule multiplied it across every generated date. The role gate
(`trainerOrAdminOnly`) checks ROLE only and never inspects the subject.

Fix: one dependency-free policy module imported by BOTH the route boundary and the
service, so the two enforcement points cannot drift (they had drifted — the retired
shadow router `sessionRoutes.mjs` still holds the CORRECT clamp, actor-first; the unified
service reversed the operands). It REFUSES (403) rather than silently clamping. Compares
by numeric value because the UI posts `String(user.id)`. Rejects non-primitive types
because `Number(true) === 1` and `Number([77]) === 77`.

**Attack surface I want you on:** is refusing rather than clamping the right call for an
endpoint that already shipped? Can a trainer still reach another trainer's calendar
through the sibling unblock/delete routes, or the recurring-series routes, which I did NOT
change? Is the shadow router truly unreachable, or does any mount order or path shape
reach it?

### Fix 2 — staff onboarding returned 400 for every submission

The wizard collects `firstName`/`lastName`; the controller required `fullName`, which
appears nowhere in the frontend onboarding flow. Every staff onboarding failed. The
existing test passed because its fixture sends `fullName` — written to the contract the
server wants rather than the payload the client sends.

Fix: a name-contract module. The split the wizard collected is PRESERVED (join-then-split
is lossy past two words: `{firstName:'Mary Jane', lastName:'Van Der Berg'}` round-trips to
`{firstName:'Mary', lastName:'Jane Van Der Berg'}`). Legacy `fullName`-only callers still
work. Validation is field-specific and never echoes a submitted value.

**Attack surface:** this endpoint creates a USER. It is reachable by `authorize(['admin',
'trainer'])`. Does accepting a previously-rejected payload shape widen anything — account
creation, role assignment, an existing-user update path keyed on body-supplied email?
That email path has a security comment about a prior privilege bug; I did not touch it,
but my change makes more requests REACH it than before.

### Fix 3 — the Coach reported workouts saved before attempting to save them

```js
detail.acknowledgeAIWorkoutEvent?.();      // signature is (didHandle = true)
void handleSubmit({ ... });                // result discarded
```

The ack fired before an unawaited save; `resolveOutcome(true, true)` recorded every submit
as `applied`, including ones refused by validation that never reached the network.

Awaiting is NOT the fix — probed: the dispatch seam reads `handled` on the line after
`dispatchEvent`, so a late ack reads as "nobody was listening". So `handleSubmit` now
returns a real outcome and answers the seam synchronously from the one place that knows
the refusal rules.

**Known residual, asserted by a test rather than hidden:** an ATTEMPTED save the server
later rejects still acks `true`. The seam is one synchronous boolean and cannot express
"accepted, outcome pending". Closing it means changing a seam shared by the planner,
bootcamp and pain-chart command families.

**Attack surface:** is shipping a partial fix here net-positive or net-negative? It
converts "every submit lies" into "only server-rejected submits lie". Is there a cheap
containment I am missing that does not touch the shared seam?

### Fix 4 — onboarding injury and PAR-Q answers were collected then discarded

Wizard writes `injuries`; the master-prompt projection reads `pastInjuries || []`. 20 of
45 wizard fields were read under a different name or not at all, including movement
limitations, both PAR-Q cardiac screens, doctor clearance and blood pressure.

Precise scope: the workout generator is NOT blind to injuries — it independently reads
`WaiverRecord` and active pain entries. But `WaiverRecord` is written only by the public
waiver flow, never by onboarding. So an onboarding-only client loses these answers while
the generator's injury source stays empty.

Fix: a versioned field dictionary — every wizard field MAPPED or explicitly
UNMAPPED-with-reason, no third state. The contract test parses the wizard's own components
rather than restating the list, so a new field with no entry fails on the day it is added.
Four safety fields that had no projection key at all are now built.

**This fix opened a prompt-injection lane and I closed it in the same slice:** routing free
text into the projection means client-authored text now reaches a workout prompt. Seven
narrative fields are wrapped `<client_reported>` with instruction-override phrases, role
markers and code fences stripped, using the sanitizer that already existed for that threat.

**Attack surface I most want you on:** clinical content must survive sanitization —
`left knee ACL 2021` is preserved while the override around it is not. Where does that
tradeoff break? What clinically meaningful input does that sanitizer mangle or truncate
(280-char cap)? And is `<client_reported>` wrapping actually load-bearing against a model,
or is it security theatre that makes a reviewer feel safe?

## Deliberately NOT in this push

- Schema/migration work — blocked until your remaining findings (P3 destructive-SQL regex,
  P6 gitignored-file hole, Q6 fixture self-test) land.
- The acknowledgement-seam architecture change.
- The pre-existing red backend suite (9 files, now baselined by another session's gate).

## What I want back

For each finding: what breaks, the exact input or sequence, how cheaply an ordinary
trainer or client hits it, and the smallest fix. Then one verdict: **is this diff safe to
push to a deploy-on-push production branch today** — and if not, the minimum that makes it
safe.

Say plainly when you are inferring. I will verify every factual claim about current code
before acting, as I did with your first review.
