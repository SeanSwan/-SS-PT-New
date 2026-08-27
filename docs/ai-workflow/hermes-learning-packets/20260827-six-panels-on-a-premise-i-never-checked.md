---
name: six-panels-on-a-premise-i-never-checked
date: 2026-08-27
originating_model: claude-opus-5
tier: fable
surface: backend/services/sessions + backend/utils/cancellationPricing + the review process itself
commits: 81746e740, 505220436, 3f4f753d3, 406aabbb8, 2121e42a2, 231bd8510, 9819696da, 15abaa3bd, 29299cedc, 34e75d150, 2ea9ce532
models_used:
  - model: claude-opus-5
    role: builder, orchestrator, hostile reviewer
    did: nine fixes to one defect class; wrote six review packets; never once verified the premise every packet asserted
    cost: subscription
  - model: gpt-5.6-sol
    role: hand-driven relay seat (ChatGPT)
    did: REJECT — found in one pass that the port had already merged to main via PR #89, which six prior rounds had missed
    cost: subscription (Sean-driven)
  - model: glm-5.3
    role: hostile review seat
    did: proved by construction that my characterization contract was a branch-side regression net, not a port gate
    cost: subscription
  - model: glm-5.3-flash
    role: hostile review seat
    did: independently reached the same verdict; caught that my transaction assertion proves an argument was passed, not that transaction semantics hold
    cost: subscription
  - model: stealth/ox-alpha
    role: standing hostile seat
    did: found the $33,600 program-price P0 and the cross-order misattribution regression; three consecutive rounds of real findings
    cost: $0.0000
  - model: tencent/hy3
    role: hostile review seat
    did: found the isFallback hole that ran through the middle of four commits
    cost: $0.0071
skills_touched:
  - id: rule-26 (canonical surface receipt)
    change: reinforced
    failure: applied to files, never to REFS — I proved which file was mounted and never proved which commit was current
  - id: instrument-check
    change: extended
    failure: the drift-check hook stated the branch was 2293 commits behind at session start; I read it as divergence to manage rather than as a prompt to check whether the work was already merged
  - id: seat-relay / packet construction
    change: sharpened
    failure: an orchestrator's unverified premise propagates into every seat and returns as consensus
---

# Six panels on a premise I never checked

## The lesson

I ran six hostile-review rounds — Ox Alpha, GLM 5.3, GLM 5.3 Flash, HY3, Qwen,
DeepSeek — across a full day, on a branch whose work **had already been merged to
`main`**. PR #89, `port/cancellation-pricing-minimal`, merged at 2026-08-26 16:26.
Every fix I was still hardening was already live.

The verification is one command:

    git fetch origin main && git merge-base --is-ancestor <commit> origin/main

I never ran it. Not once, across nine fixes and six panels.

**The information was in front of me the entire time.** The `drift-check`
SessionStart hook printed, at the top of the session:

> SS-PT branch is 2293 commits behind origin/main (487 ahead). Files here may not
> reflect reality... **Verify against origin/main before auditing.**

I read that as *divergence to manage* — a merge problem to plan around. It was
actually telling me the premise of the whole workstream was unchecked. The hook
even said the words "verify against origin/main" and I built an extraction plan
instead.

## Why six panels could not save me

This is the part worth carrying.

A panel sees only the packet. I wrote *"the branch has not been merged"* into
every packet as established fact, in the section labelled **verified**. Six
independent seats then reasoned faithfully from it and returned findings that were
individually correct and collectively pointless — defects in code that had already
shipped.

**An orchestrator's unverified premise does not get caught by adding reviewers. It
gets multiplied by them, and comes back wearing the authority of consensus.**

Sol broke it in one pass for exactly one reason: it was told to read the
filesystem itself rather than trust the packet. It checked refs. Nobody else was
in a position to.

The generalisable rule: **the packet's "verified" section is the single highest-
leverage place an orchestrator can be wrong**, because it is the one part no
reviewer will re-examine. Everything else in a packet invites attack; that section
invites trust. It therefore deserves the most evidence, not the least.

## The second instance of the same class, same day

This is the *second* time in one day I fed a panel an unverified premise about
what code was live.

The first: I pasted `backend/routes/sessionRoutes.mjs` into a packet as the
server's behaviour. It is not mounted. Four seats unanimously named a "highest
risk" that does not exist on the canonical surface.

Both are the same error at different scopes:

| Scope | What I proved | What I never proved |
|---|---|---|
| File | which file was mounted | — (I did prove this, after the first failure) |
| **Ref** | — | **which commit was current** |

Rule 26 made me prove *which file is live*. Nothing in my process made me prove
*which commit is live*. A canonical surface receipt that stops at the filename is
half a receipt.

## Who did what

**claude-opus-5** produced nine genuine fixes and the entire wasted frame around
them. The fixes were real — a $33,600 program price applied as a session charge, a
placeholder surviving five layers, a correct operator figure overwritten by the
wrong order's rate — and every one of them was already on `main` while I planned
how to get them there.

**GPT-5.6 Sol** (hand-driven by Sean, one pass) returned REJECT and led with the
ancestry check. It also caught that the branch it was asked to review would, if
merged, *restore* three high-impact defects main had since fixed — cross-trainer
reschedule, order double-grant, missing deduction receipt. It was the only seat
positioned to see any of this, because it reads the filesystem rather than the
packet.

**GLM 5.3** proved my characterization contract was a branch-side regression net
rather than a port gate, by construction: copy the branch files wholesale over
main's — the exact error the contract existed to prevent — and it still runs 16/16
green. Verified empirically: grepping my own contract for `reschedule`,
`unauthenticated`, `403`, `interleav`, `balance` matched **only the prose in my own
file header** describing those risks. Zero assertions. I wrote the danger down and
then did not test for it.

**GLM 5.3 Flash** independently reached the same verdict and caught that my
"runs inside the caller transaction" assertion proves an argument was *passed* —
with mocked models nothing rolls back.

**Ox Alpha** ($0.0000, three consecutive rounds of real findings) found the
$33,600 P0 and the cross-order regression — the latter a case where my own fix had
made behaviour *worse* than before I touched it.

**HY3** ($0.0071) found the `isFallback` hole running through the middle of four
commits.

## Skills created or changed

No new skill. One rule that needs to exist, stated plainly:

> **Before any port, deploy, extraction, or "is this shipped" discussion — and
> before writing any packet that asserts branch state — run
> `git fetch origin main` and check ancestry. A claim about what is live is a
> claim about a REF, not a file.**

And the packet rule earned twice:

> The "verified / settled" section of a review packet is the one part reviewers
> will not re-derive. It carries the most weight and therefore needs the most
> evidence. Anything asserted there without a command behind it will come back as
> consensus.

## Mistakes I made

- Ran six review rounds, nine fixes, and a full day of work on a branch whose
  content was already merged, without once checking ancestry.
- Read a SessionStart hook that said "verify against origin/main before auditing"
  and built an extraction plan instead.
- Wrote "the branch has not been merged" into six packets, in the *verified*
  section, with no command behind it.
- Told Sean repeatedly "nothing is deployed, main is untouched." False from
  2026-08-26 16:26. `main` auto-deploys.
- Built a characterization contract, wrote a header explaining precisely which
  main-side fixes a bad port would destroy, and then wrote zero assertions about
  any of them.
- Ran two positive controls on that contract and reported it "proven to have
  teeth" — both controls drawn from the branch's own feature axes, the safest
  possible place to find red.
- Asserted "the lookup runs inside the caller transaction" when the test proves
  only that an argument was passed to a mock.
- Cemented $9,999 as valid input with a test asserting no clamping, making a
  future guardrail a contract-breaking change.

## Error -> fix -> repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| Unverified premise handed to reviewers as fact | **2** (dead route file; unmerged branch) | Yes — a packet was written about the FIRST instance, mid-session | Nothing internal. Both times an external seat with filesystem access broke it. |
| Trusting an instrument that did not run | 6+ across the day | Yes — skill, memory, and two packets, all written this same day | Only ad-hoc suspicion, until controls were made to assert their own landing |
| A gate that cannot fail under its target condition | 1 (the contract) | No — new | GLM's proof by construction |
| Silent money substitution | 3 variants | Yes — it is the workstream's entire thesis | Panel review, repeatedly |

The top row is the one that matters and it is damning in a specific way: I wrote a
learning packet **earlier in this same session** titled *"a review panel inherits
your errors"*, about feeding a panel a dead file. Then I fed six panels an
unverified branch state. Writing the lesson down demonstrably did not change the
behaviour, because what I wrote down was an observation, not a procedure.

The rows that did get fixed share a shape: a *mechanism* replaced an *intention*.
`String.replace` eating `$$` was fixed by function replacers — zero recurrences
since. Controls that lied were fixed by requiring the control to assert its own
landing. Neither was fixed by resolving to be careful.

So the honest conclusion: this class needs a command in a checklist, not another
paragraph. `git fetch origin main && git merge-base --is-ancestor` before any
packet asserts branch state. If that is not in a gate, expect a third instance.

## External-model calibration

| Seat | Cost | Value this workstream |
|---|---|---|
| **GPT-5.6 Sol** | subscription, hand-driven | **Broke the frame six other rounds could not.** Its edge is filesystem access — it verifies rather than accepts. Route to it when the question is "is my premise even true." |
| Ox Alpha | $0.0000 | Three rounds, three sets of real findings, including two of my own regressions. Best value on the board, repeatedly. Its failure mode is over-rating risks in code it was not shown — feed it whole handlers. |
| GLM 5.3 | subscription | Best structural reasoner. Proof-by-construction on the contract was the sharpest single argument received all day. |
| GLM 5.3 Flash | subscription | Converged with 5.3 independently and added distinct findings. Cheap corroboration with real signal. |
| HY3 | $0.0071 | Found a P0 nobody else saw, for half a cent. |
| DeepSeek V4 Pro | $0.0000 | 502 mid-stream, empty output. Do not count as coverage. |

Total spend across six rounds: **well under $1**. The money was never the waste.
The waste was six rounds of correct answers to a question that had already been
settled by a merge, and the fix for that costs one `git fetch`.
