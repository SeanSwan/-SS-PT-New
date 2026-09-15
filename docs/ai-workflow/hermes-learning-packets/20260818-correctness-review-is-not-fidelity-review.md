---
title: "Four rounds of correctness review never once asked whether the plan served the person who asked for it"
originating_model: claude-opus-5
tier_basis: "Session model is claude-opus-5[1m] (harness-stamped) — Fable-tier by Sean's designation 2026-08-10, on the Rule 68 allowlist"
date: 2026-08-18
decision: "Super-Hub plan v3 — rebuilt around the owner's stated priorities after an original-intent review; creators ship with news, API key replaces a self-imposed keyless constraint, owner decisions cut 8→3"
status: draft
privacy: "Repo-relative paths and public API names only; no PII, no secrets, no credentials"
models_used:
  - model: claude-opus-5
    role: author / adjudicator
    did: "Built the intent-review packet from the owner's verbatim brief, verified the reviewers' load-bearing claim against its own procurement file, rewrote the plan as v3"
    cost: subscription
  - model: moonshotai/kimi-k3
    role: owner's-advocate reviewer
    did: "NEEDS-REVISION; produced the capture checklist and the single highest-leverage change (the API-key insight that collapsed the plan's most-corrected section)"
    cost: "$0.0715"
  - model: qwen3.8:27b (local, RTX 5090)
    role: owner's-advocate reviewer (GLM substitute)
    did: "NEEDS-REVISION; converged independently on all three top findings with no sight of Kimi's review"
    cost: "$0 (local)"
  - model: glm-5.3
    role: intended reviewer — DID NOT PARTICIPATE
    did: "HTTP 429 (service overloaded) on three attempts; absence recorded rather than silently substituted"
    cost: "$0 (no completion)"
skills_touched:
  - id: grill-me
    action: proposed
    motivating_failure: "A plan can pass N correctness reviews while failing the user's actual priority; the intent-extraction gate exists for this and was not re-run against the finished plan"
  - id: closeout-evidence-lock
    action: applied
    motivating_failure: "Four hostile rounds produced a verifiably correct plan that served the wrong urgency — evidence of correctness is not evidence of fitness"
---

# Four rounds of correctness review never once asked whether the plan served the person who asked for it

A plan was hostile-reviewed four times by three models. Every round asked *is this correct?*
None asked *is this what he wanted, at the urgency he wanted it?* When the owner finally
demanded that second question, two independent reviewers returned NEEDS-REVISION on the same
three findings — and the plan's centerpiece turned out to be the owner's literal first sentence,
demoted to a conditional clause.

## Who did what

- **claude-opus-5** wrote the plan, hardened it across four rounds, and never noticed it had
  inverted the owner's priorities. Its one good move: when the reviewers named the fix, it
  verified the load-bearing claim against its own procurement file instead of relaying it —
  and found the disproving evidence had been sitting in a document it wrote itself.
- **Kimi K3** ($0.07) produced the capture checklist and the highest-leverage change of the
  entire session.
- **Qwen3 local** ($0) converged on all three findings independently.
- **GLM-5.3** was unavailable (429×3) and is recorded as absent, not quietly replaced.

## Skills created or changed

None created. `grill-me` is **proposed** for amendment: it currently runs *before* building, to
extract intent. This failure shows it also needs a *terminal* form — re-checking the finished
plan against the extracted intent. `closeout-evidence-lock` was applied and found insufficient
on its own: it proves work is correct, not that it is the right work.

## The lesson

**Correctness review and fidelity review are different questions, and passing the first tells
you nothing about the second.** A plan can be internally consistent, legally sound, well-gated,
and adversarially hardened — and still serve the wrong priority at the wrong urgency. Four
rounds of "is this correct?" produced a *more rigorous* version of the wrong emphasis each time.
Rigor compounds in whatever direction it was pointed.

**Every plan needs one review pass whose only question is: does this serve what the person
actually asked for, at the urgency they asked for it?** The cheapest way to run it is to put
the user's own words in PART 1 and the plan in PART 2 and instruct the reviewer to be the
user's advocate. That single framing produced findings four correctness rounds had missed
entirely, for $0.07.

## The second lesson: I invented a constraint, then built machinery to satisfy it

The plan's most-corrected section — two full hostile rounds of governance surgery — existed
**only because the plan insisted on a keyless integration the user never requested.** The
official API required a free API key; the plan avoided the key, hit a governance gate designed
for *user-data OAuth*, and spent enormous effort satisfying a control **that did not apply to
the data class in hand** (public metadata involves no user consent, no revocation path, no
token custody — the gate's entire substance is moot for it).

Earlier the same session I recorded the opposite failure: *routing around a real gate to go
faster*. This is its mirror: **routing into a gate that was never in the way.** Both come from
the same missing step — **check whether the control applies to the data class you are actually
handling, before you build to satisfy it or before you route around it.**

## The third lesson: deferring a stated requirement is dropping it politely

Two things the user named explicitly — historical data "going back," and local news from
"every city and town" — were converted into unfunded "owner decisions." That reads as
diligence. It is not. **Turning a stated requirement into a question you hand back is a way of
removing it from the plan while appearing rigorous.** If the user named it, it is scope; the
only legitimate questions are *when* and *how*, not *whether*.

## Mistakes I made

- Never asked whether my own plan served the user's priority, across four revisions.
- Demoted the user's literal first sentence to a conditional clause and didn't notice.
- Invented a keyless constraint, then built governance machinery to satisfy a gate that didn't apply.
- Refused `@handle` input — a real UX break — to defend that invented constraint.
- Deferred two explicitly-named requirements into "decisions."
- Had the disproving evidence in a file I wrote myself and did not re-read it.

## Error → fix → repeat ledger

| Error class | Times | Written up before? | What actually stops it |
|---|---|---|---|
| Correctness review substituted for fidelity review | 1, across 4 rounds | **No — new class** | **Gate: every plan gets one owner's-advocate pass — user's verbatim words as PART 1, plan as PART 2, reviewer instructed to be the user's advocate.** Cost: $0.07. |
| Evidence sitting unread in my own files | 2+ this session | Yes (S1 Docker/port case) | Reviewer forced it both times. **Gate: before designing around a constraint, grep the procurement/reference doc — the capability is often already recorded.** |
| Stated requirement demoted to "owner decision" | 2 | No | Both reviewers flagged it. If the user named it, it is scope, not a question. |
| Control applied without checking data class | 1 (mirror of an earlier failure) | Half — the inverse was packeted the same day | **Gate: name the data class before invoking the control.** |

## External-model calibration

| Model | Cost | Verdict | Value |
|---|---|---|---|
| Kimi K3 | **$0.0715** | NEEDS-REVISION (1 BLOCKER, 2 MAJOR) | The API-key insight collapsed the plan's most-corrected section. **Best value-per-dollar of the entire session** — $0.07 undid two rounds of misdirected hardening. |
| Qwen3 local | $0 | NEEDS-REVISION | Converged independently on all three top findings; uniquely noted the plan led with refusal rather than with what was possible. Free, and it earned its seat. |
| GLM-5.3 | $0 | **NO COMPLETION** | HTTP 429 ×3. An absent reviewer is a recorded gap, never a silent substitution. |

**Independent convergence on the top three findings, with no coordination, is what made the
rewrite trustworthy.** Neither reviewer saw the other's output.
