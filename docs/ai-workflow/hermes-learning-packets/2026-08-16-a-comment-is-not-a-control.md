---
packet: a-comment-is-not-a-control
date: 2026-08-16
originating_model: claude-opus-5
tier: fable-tier
surface: swan-coach / freestyle-dictation
status: durable
models_used:
  - model: claude-opus-5
    role: builder, verifier, final decider
    did: built the freestyle capture layer across 8 commits; ran mutation testing; retracted its own privacy claim after review; wrote the session handoff
    cost: subscription (flat rate)
  - model: anthropic/claude-fable-5
    role: hostile reviewer, Final Decider
    did: returned SEND-BACK; found 6 defects incl. the audio-transmission PII hole nobody else saw; refused to ratify decision docs it had not been shown
    cost: OpenRouter (unmetered by script — no spend gate)
  - model: glm-5.3
    role: designer + hostile reviewer (4 calls)
    did: designed the S4 consolidation engine (725 lines); found a WCAG regression I introduced; dismantled my privacy reasoning in 5 moves; found 16 security/reliability defects incl. a perpetual-listening loop
    cost: ZAI subscription
  - model: moonshotai/kimi-k3
    role: panel reviewer
    did: 258-line review — CAPTURED BUT NOT TRIAGED
    cost: $0.2127
  - model: hy3
    role: panel reviewer
    did: 160-line review — CAPTURED BUT NOT TRIAGED
    cost: $0.0064
  - model: sol-5.6
    role: panel reviewer
    did: 420-line review — CAPTURED BUT NOT TRIAGED
    cost: OpenRouter (unmetered by script)
skills_touched:
  - id: rule-30 (external output is a hypothesis)
    change: reinforced
    failure: an external model's highest-severity finding was factually wrong (BootcampDemoMode read as mock data when it is a TV floor board); relaying it unverified would have sent Sean to fix a non-bug
  - id: rule-73 (proof-before-done)
    change: reinforced
    failure: "done" was claimed on a mechanism with no consumer three separate times
  - id: hermes-learning-packet
    change: applied
    failure: none
---

# A comment asserting a security property is not a control. It is a claim — and it suppresses the inspection that would disprove it.

## The lesson

I closed a privacy hole by **moving the data to a different third party**, wrote a confident docblock
explaining why that was safe, told the owner it was fixed, and shipped copy that actively steered
users toward the leak — all in the same file.

The sequence:

1. Fable found that the recording pipeline uploads **audio** containing client names to a server-side
   model. Every text-tokenisation design in the repo protects the *transcript* and does nothing for
   the audio.
2. I switched to the browser's Web Speech API and reported the hole closed, reasoning that our app
   no longer creates, uploads, or stores any audio.
3. GLM dismantled it: Chrome's Web Speech implementation **streams audio to a Google cloud
   recogniser**. We invoke that API, so PII still reaches a model with us as the invoking party.
   *"SwanStudios never transmits the audio"* is a claim about **our hands**, not about **the data**.
   The constraint was "zero PII to models", and it was still violated.
4. The proof it was decorative: my own error string said **"Use Chrome or Safari"** — recommending
   the leaking browser — twelve lines below a docblock explaining that this path was chosen *for
   privacy*. Neither I nor Fable noticed the contradiction between the comment and the constant.

**The generalisable form:** a test that lies gets caught by mutation testing. A **comment** that lies
gets caught by nothing — and it is worse than silence, because it reads as a decision already made
and stops the next reader (including the author) from looking.

**Procedural correction that survives:** *a docblock asserting a security property must name the code
that enforces it, or state plainly that nothing does.* "We never transmit X" is a claim about
conduct; the constraint is almost always about **where the data ends up**. Check the destination,
not the courier.

## Who did what

- **claude-opus-5 (me)** — built the layer, and produced every defect described here. Also caught one
  external model's wrong finding by opening the file it named, ran mutation testing that exposed two
  of my own false-passing tests, and retracted the privacy claim in code once shown it was unsound.
- **claude-fable-5** — the only reviewer that questioned the *premise* rather than the code. Found the
  audio-transmission hole. Separately refused to ratify a set of decisions it had not been shown,
  calling that "manufacturing authority" — a correct and unusual refusal that is worth imitating.
- **glm-5.3** — best value per call on this task class. Caught a WCAG regression I introduced *while
  claiming to fix palette compliance*, then later found a perpetual-listening loop (TTL purge settles
  to `idle` → auto-start re-arms the microphone → an unattended tablet listens forever in 24h cycles,
  each one legitimately "purged"). That class of defect only appears when someone traces state
  transitions instead of reading intent.
- **kimi-k3, hy3, sol-5.6** — commissioned, paid for, captured, **never triaged**. Recorded honestly.

**The routing lesson, and it is the important one:** two reviewers with different priors found two
disjoint classes of defect in the same code, and **neither found the other's**. The reviewer who
disagrees with your *framing* is worth more than the one who finds more line-level bugs. On "is this
actually safe", one reviewer is not enough regardless of how good it is.

## Skills created or changed

- **Rule 30 reinforced with a procedure, not an attitude.** "External output is a hypothesis" already
  existed and still nearly failed: GLM's highest-severity bootcamp finding was wrong (it read
  `BootcampDemoMode` as mock data in production; it is a TV floor board for demonstrating exercises).
  What converted the rule into a save was a mechanical step — **open the file the finding names** —
  not a disposition to be careful.
- **New procedure: run new tests against the PRE-FIX code.** Not mutation of the fix — *reversion to
  the original*. If the tests still pass, they measure nothing. This distinguished a real regression
  test from a description of what I had just typed, twice.
- **New procedure: before believing a green mutation result, state what interleaving the harness can
  produce.** `act()` flushes effects synchronously; real native listeners do not. Several guards are
  therefore unprovable in jsdom and are labelled `NOT COVERED BY TESTS` in-code rather than left to
  imply proof.

## Mistakes I made

- **Closed a privacy hole by relocating it, and called it a fix.** Detailed above.
- **Declared the same defect class closed three times and was wrong three times** — the hot mic twice
  (GLM found one window, Fable found another), the audio hole once. My own review rounds never caught
  any of them.
- **Shipped three "slices" that were mechanisms with no consumer.** A capture engine nothing called,
  a state machine nothing drove, and a listening screen whose counters could only ever read zero
  while its status line said "Listening". Fable called the last one "a mic-shaped mood lamp".
- **Wrote four tests this session that could not fail.** Each caught only by mutation testing, or by
  a neighbouring test failing and exposing the false pass.
- **Introduced a WCAG regression while claiming to improve compliance** — swapped an off-palette tan
  that *passed* contrast (7.7:1) for a palette-adjacent red that *failed* (3.24:1 at 11px).
- **Authored a retention contract that gave false assurance.** "Audio is never persisted server-side"
  is true and irrelevant; the audio was still transmitted.
- **Let the session run to the point where the owner had to ask for a handoff**, carrying loss risk
  the entire time.

## Error → fix → repeat ledger

| Error class | Times | Already written up? | What actually stopped it |
|---|---|---|---|
| Trusting a harness that cannot observe the thing | **4** | Yes — three times, and it recurred after each | Mutation testing, and only when run. Documentation never stopped it once |
| Declaring a defect closed when one instance/aspect was closed | **3** | Yes, after the second | An independent reviewer with different priors. Never my own rounds |
| Shipping a mechanism with no consumer and calling it a slice | **3** | Yes, twice | Grepping for consumers of my own new module as a distinct review round. Disclosed earlier each time; habit intact |
| Asserting a security property in a comment and treating it as engineered | **1** | No — new | A reviewer asking "where is the code that enforces this?" |
| Misdiagnosing a failure and fixing the wrong thing | 2 | No — new | Both fixes were correct on their merits, which is exactly what made the misdiagnosis easy to miss |

**Row 1 is the headline: four occurrences, documented three times, and documentation changed nothing.**
The only intervention with a hit rate is mutation testing. Rows 1 and 4 together give the durable
rule: **a claim of correctness — in a test or in a comment — is worthless until something mechanical
would fail if it were untrue.**

## External-model calibration

| Model | Findings real? | Best at | Watch for |
|---|---|---|---|
| **Fable 5** | 6/6 real, one critical | Attacking the **premise**; refusing to ratify what it has not read | Was wrong about one detail it could not check (assumed a competing unmount teardown existed; none does). Expensive, no spend gate in `consult-fable.mjs` — run in background or a timeout wastes the call |
| **GLM-5.3** | very high; 1 wrong severity call on a filename-only packet | State-transition tracing; design work with adversarial catalogues; honest residual-risk sections | Confidently wrong when given **filenames instead of source**. Give it real code |
| **Kimi K3 / HY3 / Sol** | unknown | — | **Commissioned and never triaged. Do not commission what you will not read** |

**Packet-construction rule learned:** a review packet must carry the *artefact class the review is
about*. Design review → style source. Contract review → types and routes. Architecture review →
inventory plus contracts. GLM's one wrong finding came entirely from a packet that gave it filenames
and asked about behaviour.

## How to apply next time

1. For any security property, name the enforcing code in the same comment — or write that nothing
   enforces it yet.
2. Ask "where does the data end up", never "who transmits it".
3. Run new tests against pre-fix code before believing them.
4. Use two reviewers with different priors on any safety question, and weight the one that disagrees
   with the framing.
5. Grep for consumers of your own new module before calling a slice done.
6. Do not commission a paid review you are not going to read.
