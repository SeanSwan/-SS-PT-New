---
title: "A well-tested control that nothing calls is indistinguishable from no control"
originating_model: claude-fable-5
tier_basis: "Session model is claude-fable-5 (harness-stated: 'You are powered by the model named Fable 5', exact id claude-fable-5) — Rule 68 allowlist member by name"
date: 2026-08-25
decision: "Wired the spend ledger both lanes were missing (566211a72). Found a hardened, 64-test-passing money control with ZERO production callers, shipped months ago. Six seats then found my own fix's race condition — unanimously — and one found a logic error inside my own rationale."
status: draft
privacy: "IDs/roles only; no PII, no secrets, no absolute user paths; file paths are repo-relative"
surface: money-controls / dormant-code / reasoning-transplant
models_used:
  - model: claude-fable-5
    role: builder + packet author + Final Decider
    did: "Found the dormant ledger, wired both lanes, then shipped a fix whose central claim — that committing before spending closed the TOCTOU — was wrong, and said so in the packet. Authored all eight fixes after the panel."
    cost: subscription
  - model: glm-5.3
    role: reviewer
    did: "Deepest round: the TOCTOU sub-case across the UTC day boundary, the 30-day trim rewriting the file into the very corrupt state that refuses the billed lane, and the corrected durability trigger (the ledger lives in the repo tree, so any tree-clean re-mints the budget)."
    cost: "$0 (subscription)"
  - model: x-ai/grok-4.6
    role: reviewer
    did: "Highest-value single finding: caught a logic error INSIDE my rationale — 'never throw, the request already spent' is true for record-after (video) and false for record-before (image), where nothing has been spent yet and proceeding is unbounded spend."
    cost: "$0.0632"
  - model: stealth/ox-alpha
    role: reviewer (standing seat)
    did: "Fail-open default (`ledger = null`); independently confirmed the race. 429'd on the first attempt (upstream shared pool) and returned on retry."
    cost: "$0.0000 (data-egress seat)"
  - model: moonshotai/kimi-k3
    role: reviewer
    did: "Framed the fail-closed argument precisely: 'the positive control was a grep for one symbol — that proves nothing about call paths.' Most expensive seat; 3 findings, all real."
    cost: "$0.1614"
  - model: qwen-3.8
    role: reviewer (free standing seat)
    did: "Three findings, all real, at zero cost. Independently reached the TOCTOU."
    cost: "$0 (local)"
  - model: hunyuan-3
    role: reviewer
    did: "Cheapest seat; notable for the most honest confidence section of the round — enumerated exactly what it could not verify from the document and what evidence would settle each."
    cost: "$0.0036"
skills_touched:
  - id: dormant-control-audit
    action: proposed
    motivated_by: "A hardened money control with 64 passing tests had zero production callers for months, and its own refusal text described a daily ceiling it was not enforcing. Tests prove a module WORKS; they say nothing about whether anything CALLS it. Any control (cap, gate, guard, limiter, allowlist) needs a callers check, not just a tests check."
  - id: review-packet-generation
    action: confirmed
    motivated_by: "Yesterday's fix — generate every restated-code claim at packet-write time rather than recall it — worked on its first outing. Zero stale-packet artifacts across six seats, versus three the round before."
---

## The lesson

**A control that nothing calls is indistinguishable from no control, and tests do not tell you the difference.** `makeFileLedger` shipped hardened: corrupt-vs-missing handled, writes monotonic, thirty days retained, sixty-four passing tests, an external reviewer's probe already baked into its monotonicity comment. It had **zero production callers**. `runGenerate` took `ledger = null` — documented as "count nothing, used by tests and by any caller that has not wired persistence yet" — and no caller ever wired it. So `SWAN_VIDEO_MAX_SPEND_USD_DAILY` bounded a single run while the guard's own refusal text told operators to *"wait for the UTC day to roll over"* for a total that was recomputed as zero on every job.

Every signal a reviewer normally trusts said this was fine. The tests were green. The module was thoughtful. The docblock was honest about its own limits. **The one question nobody asked was: who calls it?** That is now the check — for any cap, gate, guard, limiter, or allowlist, grep the *callers*, and use a positive control (a symbol you know is wired) to prove the grep works. A control's test suite is evidence about the module; it is not evidence about the system.

The corollary is sharper: **an optional safety parameter will eventually be omitted.** `ledger = null` was a reasonable-looking default that made a money control opt-in, and the next caller inherits an uncapped lane silently — which is exactly how this happened the first time. Fail closed: a *billed* provider without a ledger is refused outright; a free one still runs, because there is no money to count.

**Second lesson — reasoning gets transplanted with code and does not get re-derived.** I wrote "a failed write must never throw, because throwing would fail a request that already succeeded and would not un-spend the dollar." That sentence is *correct* for the video lane, which records **after** generation. I carried it into the image lane, which commits **before** the provider call — where nothing has been spent yet, and proceeding on an unwritable ledger is unbounded spend with no counter. Grok caught it. The tell was that the justification referenced a state ("already spent") that did not exist at the line it was defending. **When you move a rationale along with a pattern, re-check its premises against the new position, not against the old one.**

**Third — "I closed the race" is a claim that needs a concurrent test, and I made it with a sequential one.** My regression test ran two batches back to back, and passed. Six seats independently said the window was narrowed, not closed, and they were right: between the gate's usage snapshot and the append sat every `await` in the lane chooser. The fix — one synchronous read-check-write — is only provable by firing two requests *concurrently* and asserting exactly one is refused. **A sequential test can never falsify a concurrency claim; if the claim is about interleaving, the test has to interleave.**

## Who did what

- **claude-fable-5** found the dormant control and then shipped a fix whose central claim was wrong.
- **x-ai/grok-4.6** found the logic error inside my own rationale — the round's highest-value finding.
- **glm-5.3** was the depth seat: UTC-boundary sub-case, the trim-rewrite corruption path, and the corrected durability trigger.
- **stealth/ox-alpha** the fail-open default, free, after surviving a 429.
- **moonshotai/kimi-k3** the sharpest framing of why a one-symbol grep proves nothing about call paths.
- **qwen-3.8** three real findings at zero cost.
- **hunyuan-3** the most honest confidence section: what it could not verify, and what would settle it.

## Skills created or changed

- **Dormant-control audit (proposed):** for any control, check callers, not just tests, with a positive control on the grep.
- **Packet generation (confirmed working):** yesterday's procedural fix produced zero stale-packet artifacts this round, down from three.

## Mistakes I made

- **Claimed a race was closed when it was narrowed** — and put that claim in a packet as settled fact. Six of six reviewers disagreed. The claim was untestable by the test I wrote to support it.
- **Transplanted a rationale into code where its premise was false.** "The request already spent" defended a line where nothing had been spent.
- **Made a pre-existing cap violation worse while touching the file** (`render-agent.mjs` 338 → 344) and initially argued the split was a separate slice. Four seats disagreed; they were right, and the extraction turned out to be the idiomatic move the directory convention already pointed at — 338 → 270.
- **Ran the wrong test command and nearly reported its number.** I named fifteen suite paths by hand; vitest silently ran twelve and reported a confident total. Three names were simply wrong. Numbers now come from a glob, never from a list I typed.
- **Under-estimated panel spend 1.6×**, the second round running — but this time I had recorded the multiplier the day before and disclosed the realistic figure up front, so the estimate did not mislead.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| Stale restated-code claim in a packet | **0** | Yes, twice (2026-08-24, 2026-08-25) | **HELD.** Generating every claim by command at write time. Zero artifacts across six seats, down from three the round before |
| Claimed a property the test could not prove | 1 | No | The claim now names its own falsification: a concurrency claim needs a concurrent test, and the fix was falsified twice against the old semantics |
| Green suite that never exercised the new wire | 0 | Yes, 2026-08-24 | **HELD.** Falsification is now routine — neutering the change must turn specific tests red, and it did, both times |
| Wrong/incomplete test-target list reported as a total | 1 | No | Enumerate suites by glob, never by hand |
| Panel spend over estimate | 1 (2nd) | Yes, 2026-08-25 | Partially held: still 1.6× over, but disclosed as such in advance, so the number did not mislead |

The first and third rows are the point. Both were **procedural** fixes — *run this command at this moment* — and both held on their first real test. The spend row is the counter-example: I recorded the multiplier but did not change the estimator, so the error recurred exactly as before and only the disclosure improved. **Writing down a number is not a fix; changing the command that produces it is.**

## External-model calibration

| Seat | Cost | Findings | Real on verification | Yield |
|---|---|---|---|---|
| glm-5.3 | $0 (sub) | 5 | 5 | Highest depth |
| x-ai/grok-4.6 | $0.0632 | 5 | 5 | Highest single finding |
| stealth/ox-alpha | $0.0000 | 4 | 4 | Free, needed one retry |
| moonshotai/kimi-k3 | $0.1614 | 3 | 3 | All real, but the fewest findings at 45× Grok's cost per finding |
| qwen-3.8 | $0 | 3 | 3 | Free and fully correct |
| hunyuan-3 | $0.0036 | 3 | 3 | Best value; most honest about its own limits |

**Routing read, now with two rounds of data.** Both rounds put the free/subscription seats (GLM, Ox, Qwen) at or near the top for real findings per dollar. Grok earns its $0.06 — it found the round's best defect both times it was asked to attack a rationale rather than a diff. Kimi has now been the most expensive seat twice while producing the fewest findings of the paid group; **for contract- and gate-shaped review, drop it and keep GLM + Grok + Ox + Qwen + HY3 (~$0.067/round).** Reserve Kimi for novel-domain work where breadth, not depth, is the bottleneck.
