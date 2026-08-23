---
title: "A change-filter cannot see a failure that changes nothing"
originating_model: "claude-opus-5"
tier_basis: "Sean designated claude-opus-5 Fable-tier 2026-08-10; this session authored the brief, ran the panel, and did the verification. anthropic/claude-fable-5 also participated as a panel seat and its contribution is attributed below."
privacy: "IDs and roles only. No client names, no PII, no credentials, no key values. Secret-scanned clean before commit."
date: 2026-08-23
surface: "QA tooling / cost control / agent-behaviour"
decision: "Never gate an adversarial check on 'did something change'. The failures worth catching are the ones that produce no change: silent failures and steady-state lies. Escalate on what is ASSERTED, not on what MOVED."
status: shipped
supersedes: none
models_used:
  - model: "claude-opus-5"
    role: "author of the design thesis, brief, and panel orchestration"
    did: "proposed the flawed diff-gated cost control that all 11 seats rejected; wrote the brief that made the rejection possible; found two vacuous passes in its own new test"
    cost: "subscription"
  - model: "anthropic/claude-fable-5"
    role: "panel seat"
    did: "named the metric that distinguishes a real tool from theater — AI spend per run must FALL month over month as findings compile into deterministic guards"
    cost: "$0.5754"
  - model: "openai/gpt-5.6-sol-pro"
    role: "panel seat"
    did: "reframed the whole problem: truth is a data-lineage question, not a vision question; the tool must never say 'correct', only which claims were independently verified"
    cost: "$0.5045"
  - model: "moonshotai/kimi-k3"
    role: "panel seat"
    did: "never let the LLM author the invariants it grades against; drill every invariant for falsifiability by corrupting the data once"
    cost: "$0.1874"
  - model: "x-ai/grok-4.6"
    role: "panel seat"
    did: "predicted the exact failed product that would ship from the unamended thesis; proposed dogfooding the house rules as the first invariants"
    cost: "$0.0831"
  - model: "stealth/ox-alpha"
    role: "panel seat (free)"
    did: "the tautology-engine warning — within months the ground truth is written by whatever agent just shipped the feature; and 'making amber honorable'"
    cost: "$0"
  - model: "google/gemini-3.1-pro"
    role: "panel seat (free)"
    did: "the single most precise statement of the flaw: a forced failure producing zero UI change is skipped by a diff-gate, which then reports green"
    cost: "$0"
  - model: "tencent/hy3"
    role: "design seat"
    did: "first to identify that diff-gating blesses static wrongness; also that the liar detector stops at the error UI and misses silent partial state"
    cost: "$0.0033"
  - model: "deepseek/deepseek-v4-pro + v4-flash, glm-5.3, qwen3.8 (local)"
    role: "panel seats"
    did: "independently converged on the same rejection; qwen contributed evidence-linked verdicts (a green requires a hash of the DOM actually inspected)"
    cost: "$0.0084 combined"
skills_touched:
  - id: "spend-guard (skill + PreToolUse hook)"
    change: "exercised"
    motivating_failure: "It blocked Fable on ask one, released on Sean's explicit yes, and the run came in at $1.3621 against a $2.00 estimate. First live proof the two-ask gate works on a real workstream rather than a synthetic test."
  - id: "frontend/e2e/api/trainer-cross-tenant.spec.ts"
    change: "created, then hardened"
    motivating_failure: "Two vacuous-pass paths found in my own test 30 minutes after writing it — one of which stayed green with the fix under test reverted."
---

# A change-filter cannot see a failure that changes nothing

## The lesson

I proposed a cost control for an AI-judged QA tool: run a cheap deterministic
diff first (screenshot/DOM), and escalate to the expensive model **only what
changed**. It is the obvious optimisation. It is what almost everyone builds.

Eleven independent models rejected it, unanimously, as the one thing that would
sink the tool. Gemini 3.1 Pro stated it most precisely:

> *"if a forced failure results in zero UI change (a silent failure), a
> diff-gate will skip the LLM and report a false green."*

The tool's flagship feature was a **liar detector**: force every save to fail and
assert the UI admits it. The worst failure that detector exists to catch is the
*silent* one — the save fails and the screen does not change. **That is, by
definition, a zero diff.** My cost control and my flagship feature were in direct
opposition, and I did not see it while writing both into the same document.

The general form, which is what makes this durable:

> **A filter that escalates on CHANGE is structurally blind to the failure mode
> that produces NO change.**

That is not a QA-tooling fact. It is true of every monitor that alerts on deltas,
every diff-based review, every "what's new since last run" digest. Steady-state
wrongness and silent failure are invisible to all of them. HY3 supplied the
second half: a dashboard that has *always* rendered fabricated numbers diffs
clean against yesterday's equally fabricated numbers — **the expensive bugs do
not move.**

The correction is to escalate on what is **asserted**, not on what **moved**.

## Why the panel could reject it

The brief stated the thesis explicitly and instructed the seats to attack it,
with the highest-value sections being "where the thesis is wrong" and "what
nobody else will say". Had I written the brief as a specification to implement,
I would have received eleven implementation plans for a broken design. **The
brief's job was to make its own author refutable.**

Cost: $1.3621 for eleven seats. The cheapest paid seat ($0.0033) found the flaw.
Two free seats found it too.

## The second lesson, which arrived immediately

Thirty minutes after the panel warned about tests that pass without proving
anything, I turned that lens on the cross-tenant security spec I had committed
one commit earlier, and found two vacuous passes:

- It compared two trainers' moderation queues for shared ids. **With both queues
  empty, the intersection is empty and the test passes — including with the
  authorization fix reverted.**
- It asserted two API replies were byte-identical to prove a subject clamp. Two
  identical *error* bodies satisfy that equally well.

Both are the same shape: **an assertion satisfiable by the absence of data.** The
guard against it is a non-vacuity precondition — prove something could have
failed before treating its absence as success. A test that cannot fail is
indistinguishable from a test that passes.

## Who did what

Full attribution is in `models_used` above. The distribution matters more than
any single contribution: **the flaw was found by the $0.0033 seat, two free
seats, and the $0.57 seat alike.** Every seat found it independently. Cost did
not predict who saw it — for the third session running.

Where the expensive seats earned their price was *beyond* the shared finding:
Fable's decay metric, Sol's reframing of truth as data lineage, Kimi's
falsifiability drill, Ox's tautology-engine warning. Those were not
convergent — each was singular. **The cheap seats and the expensive seats do
different jobs: cheap seats confirm, expensive seats reframe.** Buy accordingly.

## Skills created or changed

- **spend-guard** — first live exercise on a real workstream. Blocked the premium
  seat on ask one, released on an explicit human yes, and the run landed at
  $1.3621 against a $2.00 estimate. The two-ask gate is now proven outside its
  own test fixtures.
- **trainer-cross-tenant.spec.ts** — created as permanent regression cover for a
  gap the existing RBAC suite never had (role boundaries were covered;
  cross-tenant was not), then hardened against its own vacuous passes.

## Mistakes I made

- **I designed a cost control that defeated the feature it was protecting, and
  wrote both into the same brief without noticing.** Not a subtle interaction —
  a direct contradiction, two sections apart.
- **I wrote a test with two vacuous passes and committed it**, one of which stays
  green with the fix under test removed. I found them only because the panel's
  lesson was fresh; without that prompt they would have shipped as coverage.
- **I under-quoted the panel's cost** at "worst case ~$2.50" using a 6k-token
  output assumption I had already seen to be wrong on this exact roster. It came
  in at $1.36, so the error was harmless this time — but I have now erred in both
  directions on spend estimates in two days, and the fix is the ledger, not
  sharper guessing.
- **My PowerShell probe launcher would have failed on its first call.** It posted
  `{email, password}`; the API expects `{username, password}`. I only found out
  by reading the existing fixture while superseding the launcher. I had written
  and handed over a tool I never executed.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before recurring? | What actually stopped it |
|---|---|---|---|
| Assertion satisfiable without the condition under test (vacuous pass / tautology) | **3** — two in this spec, one in the prior session's `actorScope` test | **Yes** — the prior session's packet named it | Nothing procedural yet. This packet adds the rule: every adversarial assertion needs a non-vacuity precondition, and must be run once against reverted code. |
| Building a tool I never executed before handing it over | 1 | No | Superseded by a spec that was actually run (fail-closed verified). Rule: never hand over an unexecuted tool as if it were tested. |
| Spend estimate wrong | 2 (once 3.6× under-reported, once ~2× over-quoted) | Yes | The ledger. Estimates are now recorded against actuals so the error is visible instead of asserted. |

The first row is the one that matters. **Three occurrences, already documented,
still recurring.** The write-up was not a fix because it stated a principle;
principles do not fire at the moment of authorship. The procedural control is
mechanical: *run the new test once against reverted code and confirm it fails.*
I did that for the context fixes last session and it caught a fake test. I did
not do it here, and shipped two.

## External-model calibration

| Model | Cost | Verdict |
|---|---|---|
| Fable 5 | $0.5754 | Singular. The spend-decay metric is the sharpest idea in the whole panel and nobody else approached it. |
| Sol Pro | $0.5045 | Singular. Reframed the problem class entirely; expensive but not redundant. |
| Kimi K3 | $0.1874 | Strong. The falsifiability drill is directly actionable. |
| Grok 4.6 | $0.0831 | Outstanding value. Predicted the exact bad product that would ship, and gave the cheapest useful first milestone. |
| HY3 | $0.0033 | **Best value on the panel.** First to name the flaw, for a third of a cent. |
| DeepSeek Pro / Flash | $0.0084 | Converged correctly; no unique contribution. |
| Ox Alpha | $0 | Singular, and free. The tautology-engine governance warning is the one nobody else raised. |
| Gemini 3.1 Pro | $0 | The single most precise sentence in the panel, for nothing. |
| Qwen 3.8 (local) | $0 | Evidence-linked verdicts. A free local seat contributing an adopted design constraint. |

Total $1.3621 for eleven seats. **Four of the eleven cost nothing and two of
those four produced singular contributions.** The free tier is not a consolation
prize.

## Related

- [[20260822-a-known-failure-mode-makes-a-premature-absence-feel-confirmed]] — same family: a plausible prior makes a wrong conclusion feel verified.
- [[a-green-suite-is-evidence-only-about-what-you-thought-to-check]] — the vacuous-pass problem is its sharpest instance.
- [[a-written-trap-is-not-a-control]] — third session running in which a documented lesson failed to prevent its own repeat.
