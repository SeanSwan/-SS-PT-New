---
title: A correct gate nobody runs is not a gate
originating_model: claude-opus-5
tier_basis: Opus 5 is Fable-tier by Sean's designation 2026-08-10
decision: Cost review is part of correctness review for any gate. A gate must be timed against its sibling gates before it ships, not only proven correct.
status: draft
privacy: IDs and file paths only; no client data, no secrets, no PII
date: 2026-08-23
models_used:
  - model: claude-opus-5
    role: builder, then adversarial reviewer of own work
    did: built four rule gates, reviewed them hostilely, found a 17x perf regression in one, fixed and merged all three PRs
    cost: subscription
skills_touched:
  - id: Rule 34 (no blind cleanup / a gate that cries wolf gets disabled)
    change: reaffirmed
    failure: applied the reasoning inside a PR to justify a design choice, then failed to apply it to the gate itself
  - id: Rule 74 (Proof-Before-Done)
    change: proposed extension
    failure: proof was read as proof-of-correctness only; a gate also needs proof-of-cost before it can be called done
---

# A correct gate nobody runs is not a gate

## The lesson

I built a commit-time gate, tested it to 19 passing cases, mutation-tested both suites, replayed forty real commits through it to confirm zero false positives, wrote the PR, and asked Sean to merge it. Every question I asked was a correctness question. Not one was *"what does this cost to run."*

It cost **~3 seconds on every frontend commit.** The sibling gate already in that hook costs 172ms. Seventeen times slower, on an action Sean performs constantly.

That is not a performance nitpick, and framing it as one is the mistake. A three-second tax on every commit is the mechanism by which a gate gets bypassed: the human learns the shape of the delay, learns that `--no-verify` removes it, and the gate stops existing. **A gate that is routinely skipped provides less protection than no gate at all, because the org believes it is covered.**

The sharpest part: I had already made this exact argument *inside that same pull request*. It is why the gate fails only on lines a commit is adding rather than on the standing backlog — I wrote that a gate failing on inherited debt "gets switched off (Rule 34)." I applied the reasoning to what the gate checks and never once turned it on the gate itself.

## Who did what

**I was wrong, and only a stopwatch caught it.** No model, no review, no test. Sean asked me to decide and act; I chose to review my own three open PRs adversarially first, and the single highest-value finding of the session came from typing `date +%s%N` around the thing rather than reasoning about it.

I also misdiagnosed the cause before measuring it properly. My instinct was that three separate `matchAll` passes per file were the cost, and my first fix would have combined them into one regex. Profiling: the regex work is **47ms**; reading 26.9MB across 5,245 files is **~2,500ms**. The optimization I was about to write would have bought nothing. *Profile before optimizing* is old advice, and I still nearly skipped it because the wrong answer was more interesting than the boring one.

## Skills created or changed

No new skill. Two proposals:

**Rule 74 (Proof-Before-Done) should require a cost measurement for anything that runs on a developer action.** Today "proof" is read as proof-of-correctness — tests, receipts, verified caller paths. For a hook, a gate, or a pre-commit check, correct-but-slow is a latent failure with a delayed fuse. The proof should include a timing run against the nearest existing gate as a baseline, because the absolute number means nothing without one. 3,000ms sounds tolerable until you know the neighbour is 172ms.

**The fix design generalizes, and is worth stating once:** when caching to make a gate fast, the cache must never be able to *fail* the thing it gates. Mine rebuilds from disk and re-checks before blocking anything, so a stale cache costs one rebuild and can never wrongly reject a commit. That property is worth more than the speedup, and it is the part to verify — which I did by mutation, making the safety path throw and confirming the suite went red. Present-but-unexercised safety code is the same lie as a green gate that inspects nothing.

## Mistakes I made

- **Shipped a PR for review having never timed it.** Correctness was thoroughly established; cost was never asked about. The reviewer's second question, and I hadn't asked the first.
- **Misdiagnosed my own regression before profiling** — blamed 47ms of regex for a 2,500ms I/O cost, and nearly wrote an optimization worth nothing.
- **Wrote a cache test that passed for the wrong reason.** It was named for the safety net but exercised fingerprint invalidation instead; adding a file changes the fingerprint, so the cache was never consulted. Found by mutation testing, not by reading it.
- **A mutation attempt silently failed while the suite printed 12/12.** That number described the unmutated code and meant nothing about the mutation. A mutation that changes no outcome is itself the signal.
- **Two verification commands lied with reassuring output** — one mangled a git path and reported "0 references" (reads as: the merge didn't land), one cloned a stale local ref and reported the merged files as missing. Both times the honest-looking failure was mine, not the system's.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stops it |
|---|---|---|---|
| Instrument reports a reassuring number while measuring the wrong thing | **~12** | Yes, repeatedly | Cross-check any surprising result against a second signal before recording it; an internally inconsistent run is the tell |
| Declared work done on correctness alone, cost unmeasured | 1 | **No — new class** | Time it against the nearest sibling before opening the PR. One command. |
| Test passes without exercising the code it is named for | 2 | Yes (same session) | Mutation-test every safety path; a test that cannot fail is not evidence |
| Optimized before profiling | 1 | No | Profile first, always — the boring cause is usually the real one |

The second row is the one to carry. It is new, it survived a full correctness review, a mutation pass, and a forty-commit historical replay, and **none of those would ever have caught it** — they were all pointed at the wrong question. The correction is procedural and takes one command: before calling a gate done, time it against the gate standing next to it.

## External-model calibration

No paid or external model was consulted for this lesson, and that is the calibration point worth
recording. The finding it documents — a 17x performance regression in a gate that had already
passed a full correctness review, a mutation pass, and a forty-commit historical replay — cost
$0 and came from wrapping a stopwatch around the thing rather than asking anyone about it.

Routing implication for Hermes: for gates, hooks, and anything that runs on a developer action,
a timing run against the nearest existing sibling outperforms a second opinion, and costs
nothing. Reserve paid seats for questions where judgement is genuinely contested. A stopwatch
is not a cheaper reviewer; for this class of question it is a better one, because it answers
the question a reviewer would have asked second and I had not asked first.
