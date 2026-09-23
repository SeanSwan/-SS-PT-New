---
title: Effort is not a budget, and a fix that stops at one sibling is not a fix
originating_model: claude-opus-5
tier_basis: Sean's explicit designation 2026-08-10 — Opus 5 and Kimi K3 are Fable-tier
reviewed_by: self, structural + arithmetic + secret-scan passes; 3 defects found in my own output and fixed
date: 2026-08-14
decision: A paid call's token ceiling is the only real budget — reasoning effort is not one; and a fix applied to one of two sibling scripts has not been applied
status: shipped
supersedes: none
models_used:
  - model: claude-opus-5
    role: orchestrator, notes author, independent reviewer, adjudicator
    did: read and noted out a 1195-line directive, wrote an independent enhancement pass before the paid results landed, verified three external claims, amended the directive, found and fixed three defects in its own output
    cost: subscription
  - model: moonshotai/kimi-k3
    role: paid product/architecture enhancement reviewer
    did: 12 ranked items; surfaced a declared blocker with no owning phase, a control with no spec, and a spend ledger that does not foot — all three independently confirmed
    cost: $0.3316
  - model: tencent/hy3
    role: paid design/interaction enhancement reviewer
    did: 6 grouped items plus wireframes on the successful run; produced one excellent reframe and three proposals that violated the target document's own accessibility law
    cost: $0.0043 successful, plus a prior fully-billed run that returned nothing
skills_touched:
  - name: rule-20 (repo-wide sibling sweep)
    change: exercised — and found violated in the tooling itself
    why: a fix committed to one consult script was never propagated to its identically-shaped sibling, and the gap cost a billed empty call today
  - name: rule-30 (subagent/model skepticism)
    change: exercised
    why: three of the paid reviewer's twelve claims were checkable; all three were checked before acceptance rather than relayed
  - name: rule-51 (confidence tags) / evidence discipline
    change: exercised
    why: separating "verified by recomputation" from "model asserted" is what made the ledger finding usable instead of alarming
privacy: IDs/roles only; no PII, no secrets, no absolute paths
---

## The lesson

I ran two paid model reviews. One of them burned its entire token budget on hidden
reasoning and returned an **empty message** — `finish_reason: length`, no content,
fully billed.

The failure was already documented. In the sibling script, sitting in a comment
block I had read minutes earlier:

> Effort ALONE is not a budget: at effort `high` the model can spend the whole
> `max_tokens` on hidden reasoning and return EMPTY content with `finish_reason`
> `stop` — a fully billed call that delivers nothing. Observed 2026-08-14. The
> obvious fix (also passing `reasoning.max_tokens`) is rejected by the provider
> with a 400: only one of effort and max-tokens may be specified. So the budget
> has to come from the OVERALL ceiling instead.

I read that. Then I launched the *other* model at a **lower** ceiling than the one
that comment was written about, at the same high effort. It failed identically,
the same day, in my hands.

Two separate failures compound here, and only one of them is mine.

**Mine:** I treated a warning as description rather than instruction. The comment
was in a file I had open, in the script I was about to invoke a sibling of. Having
a warning in context is not the same as applying it, and I have no mechanism that
converts the first into the second except noticing — which is exactly the mechanism
that fails under momentum.

**The tooling's:** the fix for that failure was committed to `consult-kimi.mjs`
and to nothing else. Its sibling `consult-hy3-design.mjs` — same structure, same
provider, same failure mode, same file shape — received neither the
reasoning-channel recovery nor the failure-path cost reporting. Verified:

| | reasoning-channel recovery | reports spend when the call returns nothing |
|---|---|---|
| `consult-kimi.mjs` (this branch) | yes | yes |
| `consult-hy3-design.mjs` (this branch) | **no** | **no** |
| both, on `origin/main` | **no** | **no** |

So when the call failed, it could not salvage the answer from the reasoning
channel — a capability that exists, ten files away — and it could not tell me what
it had just spent. I had to estimate the cost of a call I had personally made,
because the script that made it declines to say.

**A fix that stops at one of two siblings has not been applied. It has been
rehearsed.** The commit message reads `fix(consult-kimi): cap reasoning, and
report spend on a call that returns nothing` — accurate, scoped, and precisely the
shape of a fix that will be repeated later by someone who does not know it already
exists.

## Who did what

**Opus 5 (me)** orchestrated, wrote the notes-out, ran an independent enhancement
pass deliberately *before* the paid results returned so that agreement between the
three would mean something, verified every checkable external claim, amended the
directive, and found three defects in its own output during a structural pass.

**Kimi K3** was the strongest performer, and the reason is worth generalizing: it
was given an **enhancement** remit and *explicitly forbidden* from re-reporting the
four defects a previous review had already found. That single constraint bought a
whole call of new ground instead of a restatement I had already paid for. Three of
its twelve findings were independently confirmed — a declared architectural blocker
that no phase in the plan actually builds, a UI control referenced twice with no
specification anywhere, and a money ledger that does not add up. Zero of its
checkable claims were disproven. Its proposed statistical threshold for one gate
was more rigorous than the one I had drafted myself, and I adopted its version over
mine.

**Hy3** produced one genuinely excellent idea — reframing an accessibility mode
from a degraded fallback into a deliberate premium aesthetic — and roughly half a
call of proposals that violated the target document's own accessibility rules:
text contrast asserted against arbitrary moving video content, a press-and-hold-only
affordance in a document that forbids hover-only actions, and an auto-hide rule
that would have overridden an existing explicit exemption. **It was right about
taste and wrong about compliance, confidently, in the same output.** Cheap, worth
running, never to be accepted unadjudicated.

## Skills created or changed

No new skill. Two existing rules were exercised hard enough to be worth recording:

- **Rule 20 (sibling sweep)** was found violated *in the agent tooling itself*,
  which is the most expensive place for it to be violated, because the tooling is
  what every future session runs. The failure motivating this entry is not a
  product bug; it is a maintenance bug in the thing that spends money.
- **Rule 30 (model skepticism)** is what made the paid review usable. Three claims
  were checkable and all three were checked. Had I relayed the ledger finding
  unverified, I would have handed Sean an alarming claim about missing money with
  no arithmetic behind it. Having recomputed it, the finding is precise, small,
  and actionable — `$0.00045536` unexplained in the itemization, and `$1.7234` of
  earlier spend recorded nowhere.

## Mistakes I made

- **I read the warning and did not apply it.** The sibling script's comment block
  described my failure before I caused it. I set a *lower* ceiling than the one it
  warned about. Cost: one fully billed call returning nothing.
- **I inserted a new subsection before, not after, the one it should follow** —
  17.4 landed above 17.3. Nothing in a markdown pipeline objects to out-of-order
  headings; only reading the heading list caught it.
- **I wrote a self-contradicting range.** The document's own top-level summary said
  "amendments A1–A16" after I had written A17 — inside a document whose entire
  purpose is internal consistency. Caught on re-read.
- **I gave a cost figure as an approximation without stating in the same sentence
  why it had to be one.** The number was marked approximate, but "the script does
  not report spend on the failure path" is the actual fact and belonged next to it.
- **I did not fix the sibling script.** I verified the gap, confirmed it exists on
  the main branch too, and then wrote it up as a recommendation instead of closing
  it — on the correct reasoning that it was outside the task's scope, and with the
  full knowledge that the next call to that script can fail the same way and still
  will not say what it cost. Recording this because "correctly scoped" and "still
  broken tomorrow" are both true.

## Error → fix → repeat ledger

**Error class: a reasoning model consumes its whole token ceiling and returns an
empty, fully-billed response.**

- **Recurrences this session/day: 2.** First with Kimi earlier on 2026-08-14; then
  with Hy3, in my hands, hours later.
- **Had it been written up before recurring? Yes** — in the source comments of the
  very script family involved, with the date, the mechanism, the rejected
  workaround, and the correct fix all stated.
- **Why the write-up did not prevent the repeat:** it lived in one script's
  comments. It was documentation of a past incident, not a constraint on a future
  call. Reading it produced understanding, not behaviour.
- **What actually stopped it:** raising the overall ceiling (30k → 60k) and
  lowering effort (high → medium) on the retry. It then succeeded in 77 seconds for
  less than half a cent.
- **The correction that would survive** is procedural, not resolutional. Not "be
  more careful with effort settings." Instead: *port the recovery and cost-reporting
  to every sibling script, so the failure is either salvaged or at minimum priced* —
  and treat any consult script's comment block as a preflight checklist to apply,
  not background reading. A warning that only one of two identical files carries is
  a warning the other file's users will pay to rediscover.

**Second error class: a declared blocker with no owning phase.** Not mine — found
in the reviewed document — but the pattern generalizes and is worth carrying. A
plan can name something as mandatory-before-everything and then never assign it to
a step. It reads as rigorous and ships as a gap. The check is mechanical: for every
"must exist before X" in a plan, grep the execution sequence for who builds it. It
took one command to find, and three prior hostile reviews had missed it.

## External-model calibration

| Model | Findings | Real on verification | Disproven | Cost | Verdict |
|---|---|---|---|---|---|
| Kimi K3 (high, enhancement remit, known defects excluded) | 12 | 3 of 3 checkable confirmed | 0 | $0.3316 | **High value.** Worth the money on plan/architecture critique. The remit design — forbidding restatement of known findings — is most of why. |
| Hy3 (design remit) | 6 | ideation strong; ~3 needed correction for violating the target's own a11y rules | n/a (taste, not fact) | $0.0043 | **Cheap, useful, never authoritative.** Run for ideas; adjudicate every compliance claim. |
| Hy3 (high effort, low ceiling) | 0 | — | — | billed, unreported | **Anti-pattern.** Higher effort at a lower ceiling cost more than the successful run and returned nothing. |

Generalizable routing lesson: **on an enhancement or critique remit, tell the model
what has already been found and forbid it from repeating that.** The same money
buys new ground instead of a confident restatement of what you already knew. And
when a paid model returns findings, the checkable ones are cheap to check and are
what separate a usable review from a plausible one.
