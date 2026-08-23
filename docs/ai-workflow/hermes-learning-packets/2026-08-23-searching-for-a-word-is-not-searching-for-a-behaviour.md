---
title: "Searching for a word is not searching for a behaviour"
originating_model: claude-opus-5
tier_basis: "Session model is claude-opus-5 (harness-stated: 'You are powered by the model named Opus 5', exact id claude-opus-5[1m]) — on the Rule 68 allowlist via Sean's designation 2026-08-10"
date: 2026-08-23
decision: "Audit finding F11 ('no idempotency on the Swan Coach command path') REFUTED before it became work. The protections existed under other names — pg advisory lock + same-day dedupe for workout logging, single-use confirmation tokens for destructive commands. Recommended slice cancelled. One genuine new finding kept: schedule_session advertises roleRequired ['admin','trainer'] while its route is adminOnly."
status: draft
privacy: "IDs/roles only; no PII, no secrets, no absolute user paths; file paths are repo-relative"
surface: swan-coach / admin-dashboard / trainer-dashboard
models_used:
  - model: claude-opus-5
    role: auditor, then self-refuter
    did: "Produced F11 from a token grep, recommended it as the top slice, then refuted its own finding by reading the code before building. Cancelled the work."
    cost: subscription
  - model: moonshotai/kimi-k3
    role: prior-turn panel seat
    did: "Inherited the false premise from the brief and reasoned on top of it; did not and could not refute it without repo access."
    cost: $0.0965 (prior turn)
  - model: stealth/ox-alpha
    role: prior-turn panel seat
    did: "Built a six-item security critique partly on the same false premise. Same limitation — brief only, no repo."
    cost: $0.0000 (prior turn)
skills_touched:
  - id: feedback_validate_probe_before_absence_claim
    action: proposed-strengthen
    motivated_by: "Third violation in a single session, each with a differently-shaped probe. The existing memory says validate the probe; it does not say the probe may be validly executed and still be the WRONG PROBE. That gap is what recurred."
  - id: rule-30
    action: reinforced
    motivated_by: "A panel given only a brief inherits the brief's false premises and cannot refute them. Subagent/panel output is a hypothesis — and so is the brief you hand them."
  - id: rule-51
    action: reinforced
    motivated_by: "F11 was tagged [LIKELY] in the audit, correctly. But by the time it reached the recommendation it had hardened into 'the only open item that can cost real money'. Tags decay across restatements."
---

# Searching for a word is not searching for a behaviour

## The lesson

**An absence claim built on one spelling of a concept is not evidence of absence.**

Three times in one session I claimed a capability was missing because a grep for its most obvious
token came back empty or thin:

| Probe token | Claim | Reality |
|---|---|---|
| `frontendEvent` | "Swan Coach's UI-driving lane may be inert" | 18 declared events, all 18 with browser consumers |
| `rateLimit\|rateLimiter` | "no rate limiting on the AI command route" | `aiCommandRateLimiter` applied on both routes (case-sensitive miss) |
| `idempotenc` | "no replay guard on the command path" | `pg_advisory_xact_lock` + same-day 409 dedupe; single-use confirmation tokens |

Each probe was *validly executed*. Two of them I even control-tested against a known-present token,
which proved the grep worked — and I still concluded wrongly, because a working grep for the wrong
word tells you nothing. **The failure was never a broken probe. It was a probe shaped around my
vocabulary instead of the code's.**

The durable fix is not "validate your probe." I was already doing that. It is:

> To claim a *behaviour* is absent, name the behaviour, then enumerate every mechanism that could
> implement it, then check for each. For "no replay protection" that means: idempotency key, unique
> index, advisory lock, row lock, dedupe-on-read, single-use token, state machine guard, 409 path.
> Grep is how you check each hypothesis — it is not how you generate them.

## Who did what

- **Opus 5 (me)** — wrote F11, ranked it the top next slice, told Sean it was "the only open item
  that can cost real money," got approval, and then refuted my own finding by reading the code
  before writing any. The refutation was the correct outcome; the recommendation should never have
  been made.
- **Kimi K3, Ox Alpha, Grok 4.6, DeepSeek V4 Pro** — all four had the brief, none had the repo. Two
  built substantial security critiques on top of F11. **None refuted it, and none could have.** A
  panel cannot falsify a claim about code it cannot read; it can only elaborate on it.

## Skills created or changed

No new skill. Three rules reinforced or proposed-strengthened — see frontmatter.

## Mistakes I made

1. **Recommended work to the user on an unverified finding.** Sean approved a slice on my framing.
   The premise was wrong. Approval obtained on a false premise is not consent — the same failure
   mode as the previous packet's deletion-safety summary, one day apart.
2. **Let a `[LIKELY]` tag decay into a certainty across restatements.** F11 was correctly hedged in
   the audit record. By the closeout it was "the only open item that can cost real money." Nobody
   removed the tag; it just stopped being carried forward.
3. **Handed a panel a brief with an unmarked gap, twice.** The prior packet's lesson was "a panel
   briefed on a gap invents a gap." This session I did it again with F11 — and two paid seats spent
   real tokens reasoning about a vulnerability that did not exist.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What finally stopped it |
|---|---|---|---|
| Absence claim from a concept-vocabulary probe | **3** | **YES** — packet 2026-08-22, and a standing memory recalled at session start | Nothing procedural. Instance 3 was caught only because the next step was to WRITE CODE, which forced reading the path I had only grepped. |
| Recommending work on an unverified finding | 2 (this + the deletion summary) | Yes, one day prior | Verifying at the moment of *recommendation*, not at the moment of *implementation* |
| Panel briefed on an unmarked gap | 2 | Yes, prior packet | Marking un-audited areas explicitly as NOT AUDITED in the brief |

**The repeat count is the finding.** Three instances, one session, one already-documented lesson,
one memory recalled into context at session start. Prose does not change behaviour; the write-ups
did not work.

**What actually caught instance 3** is the transferable part: *the finding became work.* Writing
code forced me to read the path I had only grepped. Instances 1 and 2 were caught the same way —
by a later step that touched the real code. **A finding that stays in a document is never
falsified.** That is an argument for verifying findings at authoring time, because an audit's
wrong findings are exactly the ones that never get built and therefore never get corrected.

## External-model calibration

- **A panel is not a fact-checker for your premises.** Four seats, ~$0.17, zero refutations of F11 —
  not because they were weak, but because they had a brief and not a repo. Route *judgment* calls to
  a panel; keep *absence* claims in-house where the code is readable.
- **Cost of the error:** two paid seats spent output tokens on a non-existent vulnerability. Not
  ruinous, but it means a wrong premise in a brief multiplies across every seat you fan out to.
- Free seat (Ox Alpha) remains the best value-per-dollar on this task class across three slices.
