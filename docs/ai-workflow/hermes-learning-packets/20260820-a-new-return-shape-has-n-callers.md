---
title: "A new return shape is a contract change, and a contract change has N callers"
originating_model: "claude-opus-5"
tier_basis: "Sean designated claude-opus-5 Fable-tier 2026-08-10; this session ran as Opus 5 and authored every fix and verification in this packet."
privacy: "IDs and roles only. No client names, no PII, no credentials, no absolute paths. Secret-scanned clean before commit."
date: 2026-08-20
surface: "money-path / stripe-webhook / checkout"
decision: "Adding a field that changes control flow is a contract change; enumerate and fix every caller in the same slice, or the fix becomes the next round's finding."
status: shipped
supersedes: none
models_used:
  - model: "claude-opus-5"
    role: "builder + hostile reviewer + final decider"
    did: "found H1 independently, verified GLM's H2 against source before acting, built behavioural test harnesses after mutation exposed the source-text suite as decoration"
    cost: "subscription"
  - model: "glm-5.3"
    role: "external hostile review"
    did: "found H1 independently and H2 alone; 8 of 8 findings real; correctly listed the files it lacked and declined to rate anything depending on them"
    cost: "subscription"
  - model: "moonshotai/kimi-k3"
    role: "external hostile review (did not run)"
    did: "blocked — OPENROUTER_API_KEY absent from the environment; no spend incurred"
    cost: "0"
skills_touched:
  - id: "rule-20 / rule-54 (sibling sweep)"
    change: "reinforced"
    motivating_failure: "I added unfulfillable:true to a service with three callers and taught one. The slice that did this was itself the fix for a sibling-drift finding one round earlier."
  - id: "rule-73 (proof-before-done)"
    change: "reinforced"
    motivating_failure: "a source-text suite scored 14/14 while both guards it covered were neutered. Sixth decorative-assertion incident in one workstream."
---

# A new return shape is a contract change, and a contract change has N callers

## The lesson

Round 2's finding was: a guard refused and the caller did not stop. My fix added
`unfulfillable: true` to `grantSessionsForCart` and taught **the webhook** to
short-circuit on it. I shipped that, wrote it up as closed, and moved on.

`grantSessionsForCart` has three production callers.

    webhook            -> handled it
    verify-session     -> fell through to success: true
    admin manual grant -> fell through to "sessions granted"

`unfulfillable` carries `alreadyProcessed: false`, so both untouched callers
dropped into their success branches. A paying customer was told "Order verified
and completed successfully" with zero sessions granted. An admin was told
sessions were granted when none were.

**Adding a field that changes control flow is a contract change.** The moment
a return shape gains a case, every caller either handles it or silently
mis-handles it — and "silently" is the default, because the new field is
`undefined` in the old code and `undefined` is falsy. Enumerate callers with
grep BEFORE adding the field, and fix them all in the same slice.

The bitter part: the slice that made this mistake was itself the fix for a
sibling-drift finding one round earlier. Knowing the pattern by name did not
stop me committing it.

## The second lesson: better symptom, worse defect

My crash-window recovery replaced an honest 404 ("Order not found") with a
silent `success: true`. The 404 was confusing and generated support tickets. The
false success generates nothing — a customer told their order completed has no
reason to contact anyone.

**A confusing error the customer reports beats a false success they never
question.** When a fix changes what a failing path *says*, check that the new
message is not more comforting than the state deserves.

## The third: terminal vs transient is per error class, not per catch block

`throw grantError // let Stripe retry; the grant is idempotent` reads as
correct and is correct — for a DB blip. `CheckoutInventoryError` means stock ran
out between checkout creation and payment. No redelivery restocks a shelf, so
that comment turned a signed **paid** event into an infinite retry against a
state that can never change.

A catch block that rethrows everything has decided every error is transient.
That decision belongs to the error class.

## Who did what

**GLM-5.3** found H1 independently of me and found H2 alone. Its H2 write-up
named the exact sibling — `verify-session` — that already had the correct
terminal handling, which is the pattern-match that makes whole-family source
worth the tokens over a diff. 8 of 8 real. It also listed the seven files it
would have needed and refused to rate anything depending on them.

**Kimi K3** could not run: the API key is absent. I did not go hunting for it.

**I** found H1 by sweeping callers of my own changed function — the one habit
from the previous round that actually paid — verified GLM's H2 against source
before acting, and found nothing GLM missed.

## Skills created or changed

No new skill. One procedural change, and it is a change of *kind*, not of
effort:

**A guard gets a behavioural test, not a source-text test.** My source-text
contract suite scored 14/14 while both guards were neutered with
`if (false && x)` — the text it matched was still present. Source text proves a
branch EXISTS; only an executed request proves it FIRES. Both guards now drive
the real router over supertest: neutering verify-session turns 8 RED, the admin
guard 5 RED, on the exact mutation the source suite scored green.

## Mistakes I made

- Shipped a control-flow contract change to one of three callers, in the slice
  that existed to fix sibling drift.
- Source-text suite passed 14/14 against neutered guards — sixth decorative
  assertion in this workstream.
- Mocked `captureVerifiedCheckoutLead`, which is a LOCAL function, so the mock
  intercepted nothing and the assertion passed vacuously.
- Truncated my own test file: `io.open(p,'w').write(regex_op(...))` empties the
  file before evaluating the argument, and the argument threw.
- Wrote an alert calling `sendNotification` in a route that never imported it —
  a ReferenceError on the refusal path only.
- Quoted ~$0.25–0.35 for a paid review pass without re-estimating; the real
  figure was $0.51 on a larger packet.

## Error → fix → repeat ledger

| Error class | Recurrences this session | Documented before recurring? | What finally stopped it |
|---|---|---|---|
| Decorative / unreachable assertion | 6 | YES, repeatedly | Behavioural tests over the real router; source text demoted to secondary |
| Contract change not swept to all callers | 1 | YES — Rule 20, and the prior round's own finding | grep callers BEFORE adding a control-flow field |
| Destructive op ordered before the op that can fail | 2 | After the first | Compute content fully, then open the write handle |
| Symbol used without checking scope | 1 | No | grep the import list before writing the call |

Six recurrences of row one, documented every single time. **The write-ups were
never the fix.** What stopped it was changing the kind of test — a mechanical
substitution, not a resolution to be careful. Every correction in this corpus
that survived is procedural; every one that was a promise to try harder came
back.

## External-model calibration

| Model | Raised | Real | Cost | Best at |
|---|---|---|---|---|
| GLM-5.3 | 8 | 8 | subscription | cross-file pattern-match: naming the sibling that already does it right |
| Kimi K3 | — | — | 0 | blocked, key absent |

GLM's value this round was not raw defect count but **precedent-finding**: for
both HIGHs it identified an existing correct implementation elsewhere in the
codebase and framed the defect as drift from it. That framing makes a fix
obvious and low-risk, and it is worth prompting for explicitly.
