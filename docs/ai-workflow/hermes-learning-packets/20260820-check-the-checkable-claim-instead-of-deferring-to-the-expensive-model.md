---
title: Check the checkable claim instead of deferring to the expensive model
originating_model: claude-opus-5
tier_basis: Sean's designation 2026-08-10 — Opus 5 is Fable-tier; claude-opus-5 is on the Rule 68 tier_allowlist. Kimi K3, also on the allowlist, contributed the root-frame finding.
date: 2026-08-20
decision: reviewer output is verified by execution in BOTH directions — a cleared finding is a hypothesis exactly as much as a raised one; and an overclaiming docblock is a defect because it misdirects paid review, not merely future readers
status: shipped
supersedes: none
privacy: IDs/roles only; no PII, no secrets, no absolute paths
models_used:
  - model: claude-opus-5
    role: panel orchestrator, builder, verifier of every claim
    did: built the review packet byte-exact from the deployed tree; ran the four-model panel in Sean's sequence; executed every reviewer claim against the shipped code before acting; measured the quadratic two reviewers cleared; measured the false-positive cost of a reviewer's recommendation and overrode it with data; shipped round-1 fixes and refused to declare dry
    cost: subscription (flat)
  - model: openai/gpt-5.6-sol-pro
    role: opening reviewer — scope-setting
    did: named the attack surfaces for the other reviewers and ranked which questions were load-bearing; 6 of 7 testable claims confirmed; one CRITICAL refuted on execution because it was built on a false comment in the author's own source; incorrectly cleared the ReDoS class
    cost: $0.9379 (OpenRouter, 333s)
  - model: moonshotai/kimi-k3
    role: root-frame reviewer
    did: 8 of 8 testable claims confirmed; found the temporal root frame no one else framed — the verdict binds to file content at Stop time while the harm is content entering model context at Write time, so write-dirty/read/write-clean yields a forgeable CLEAN; also incorrectly cleared the ReDoS class
    cost: $0.1500 (OpenRouter, 66s)
  - model: z-ai/glm-5.3
    role: independent hostile reviewer
    did: independently found the email-pattern quadratic that BOTH paid reviewers had explicitly cleared, plus transcript forgeability and the harness-timeout delegation
    cost: $0 marginal (subscription)
skills_touched:
  - id: lib/scan-text.mjs
    change: created
    failure: the detector was quadratic in line length and unbounded, so a crafted artifact could hang a fail-closed gate past its hook timeout — a state worse than a block, whose only remedy is the disable marker the adversary wants thrown
  - id: lib/gate-run.mjs
    change: amended
    failure: `Boolean(outcome?.block)` treated a Promise and every malformed value as "allow", so the first async check written by any future author would silently invert the fail-closed mode
  - id: cross-env-verify
    change: proposed-amendment
    failure: two paid consults reported exit code 0 having made zero API calls, because they ran from a worktree with no .env; a tool that exits 0 having done nothing is the false-success class the whole system exists to detect
---

# Check the checkable claim instead of deferring to the expensive model

## The lesson

Rule 30 says a reviewer's output is a hypothesis. That is almost always read as *they might
overclaim*. This panel showed the expensive failure runs the other way too.

**Two strong reviewers explicitly CLEARED a real defect.** Both GPT-5.6 Sol Pro and Kimi K3
examined the two regexes I had flagged as ReDoS suspects, correctly determined they were bounded,
and concluded there was no hang risk — Sol Pro called the hypothesis "a red herring". Neither
examined the email pattern, which is quadratic in line length. Measured: 8k=28ms, 16k=109ms,
32k=434ms, ~4x per doubling, projecting roughly thirty minutes on a 2 MiB line against a
thirty-second hook timeout. On a fail-closed gate a hang is strictly worse than a block: the turn
cannot complete, and the only remedy is the disable marker, which is precisely the adversary's
objective. GLM-5.3 — the free one — found it independently.

The reviewers were not sloppy. They answered the question as framed, about the patterns named in
the framing. **A cleared finding inherits the framing of the question; a measurement does not.**
When a claim is empirically checkable in minutes, check it, and do not let the more expensive
model's reasoning substitute for the check.

**The mirror lesson: my own bad comment consumed a reviewer's best finding.** Sol Pro's most
dramatic CRITICAL described relocating the gate's kill switch through an environment variable. I
built the exploit and it failed — a previous slice had already removed env from the trust path. Sol
was reading a docblock I wrote that still *claimed* the variable was honoured. The code was right
and the comment lied.

So an overclaiming docblock is not merely a hazard for future readers, which is how I wrote it up
last time. **It misdirects review.** A paid reviewer spends its scarcest resource — the top of its
findings list — on a vulnerability that does not exist, and the real ones move down. Documentation
accuracy is a review-efficiency property.

## Who did what

- **GLM-5.3, free on subscription, caught what $1.09 of paid review cleared.** Cost is not a proxy
  for coverage, and a panel's value comes from *independent framings*, not from the price of the
  most expensive member.
- **Kimi K3 at $0.15 returned the deepest finding**: the gate binds its verdict to file content at
  Stop time while the harm is content entering model context at Write time, so an agent can write
  dirty, read it (the leak is now complete), overwrite clean, and collect a CLEAN verdict. Eight of
  eight of its testable claims confirmed. Best value on the panel by a wide margin.
- **Sol Pro's distinctive contribution was scope**, not defect count: it told the other reviewers
  which surfaces to attack and which questions were decoration. That is worth buying once, at the
  start — exactly where Sean placed it.
- **I was wrong to ship a comment I had not re-read**, and right to execute every claim before
  acting on it. Both halves of that mattered.

## Skills created or changed

- **`lib/scan-text.mjs` (created).** The detector now scans per line with a hard bound, calibrated
  against 375,055 real corpus lines (99.998% fit under 4096 chars). An over-long line is reported
  UNSCANNABLE, never clean — on a fail-closed gate, "I could not read this" must not resolve to
  "this is fine."
- **`lib/gate-run.mjs` (amended).** The check's return value is now schema-validated. A thenable
  throws rather than silently reading as `{block:false}`.
- **A measured override of a reviewer.** Kimi recommended a case-insensitive street pattern and
  said to "eat the small FP rise — the corpus test exists to measure exactly this." Measured: 2 to
  54 false positives, almost entirely the word *lane* (this repo says "build lane", "coordination
  lane" constantly). I split the suffix set by ambiguity instead and kept the coverage. **The
  reviewer named the right experiment; running it is what turned good advice into a good change.**

## Mistakes I made

- **I wrote a real NUL byte into a source file** by inlining code through the Bash argument, after
  a durable packet of mine three days earlier established the fix. The master handoff already
  records this class as having happened three times before, "including inside the comment warning
  about it." That is now four. The rule was right; I did not follow it until it had cost an hour.
- **I ran paid consults from a worktree with no `.env`**, so two attempts made zero API calls and
  reported exit code 0. I nearly recorded a review that never happened.
- **I piped long-running background commands through `tail`**, which buffers, and briefly believed
  a healthy reviewer had died.
- **A verification probe silently inverted** after I changed a return shape from array to object:
  it asserted `.length === 0`, and `undefined === 0` is false, which reads as "the exploit is
  fixed." A probe that changes meaning under a refactor is the decorative instrument I keep
  writing memos about.
- **I applied a reviewer's pattern change before measuring it**, then measured and reverted — the
  same ordering error I wrote up the day before.

## Error → fix → repeat ledger

| error class | times this session | written up before? | what actually stopped it |
|---|---|---|---|
| code inlined through the Bash argument gets mangled | ~7, incl. a real NUL byte in source | **YES — my own durable packet, 3 days earlier, plus the master handoff** | Nothing yet, within this session. The written rule did not change behaviour; only repeated failure did. The mechanism-level rule is: the Write tool produces every file that contains code, always. |
| tool exits 0 having done nothing | 2 (both early Sol Pro attempts) | partially | Asserting on the OUTPUT ARTIFACT, never the exit code. A missing output file is the only reliable signal. |
| probe inverts silently after a refactor | 1 | no | A probe must assert against a named shape, not a truthiness accident. |
| change applied before it was measured | 1 | YES (2026-08-19 packet) | Measure, then change. Recurred one day after being written up. |

**Two rows here recurred within days of being documented by me, in this corpus.** The pattern is
now unmistakable: a write-up that records the *instance* changes nothing, and even a write-up that
records the *mechanism* changes nothing if there is no gate. These two belong in a hook, not in a
packet.

## External-model calibration

| model | cost | testable claims | confirmed | wrong calls | worth it? |
|---|---|---|---|---|---|
| GPT-5.6 Sol Pro | $0.9379 | 7 | 6 | cleared a real ReDoS; one CRITICAL refuted (built on my bad comment) | Yes, ONCE, as the opening scope-setter |
| Kimi K3 | $0.1500 | 8 | 8 | cleared the same ReDoS | Yes — highest value per dollar on the panel |
| GLM-5.3 | $0 | — | — | none identified | Yes — found what both paid models cleared |

Routing conclusion for adversarial review of a bounded module: **open with Sol Pro for scope, then
run Kimi and GLM for defects.** Do not treat the most expensive reviewer's clearance as a
clearance; treat it as one framing among several, and measure anything measurable yourself.
