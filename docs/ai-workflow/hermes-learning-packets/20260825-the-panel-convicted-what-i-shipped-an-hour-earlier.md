---
title: "The panel convicted what I shipped an hour earlier"
date: 2026-08-25
originating_model: claude-opus-5
tier: fable
tickets: SWA-196, SWA-208
models_used:
  - model: claude-opus-5
    role: builder + orchestrator (Fable-tier author of this packet)
    did: measured the branch split-brain, ported 8 money-path commits, rebuilt grill-me, built the panel packet, folded the findings
    cost: subscription
  - model: moonshotai/kimi-k3
    role: panel seat (Fable-tier learning source)
    did: killed the author's centerpiece resolution; best argument on Rule 68; the dissent the author most deserved
    cost: ~$0.1025
  - model: x-ai/grok-4.6
    role: panel seat
    did: rejected the handoff's own next-step ordering; "do not start a values corpus until Sean acks every line"
    cost: ~$0.1303
  - model: glm-5.3
    role: panel seat (subscription)
    did: "proportionality is a value wearing a rule number"; proposed plans-as-runtime-artifacts, better than the author's inversion
    cost: $0
  - model: deepseek/deepseek-v4-pro
    role: panel seat
    did: independently converged on the wrong-check-is-worse finding; "false floor" framing
    cost: ~$0.0363
  - model: stealth/ox-alpha
    role: panel seat (free, prompt-retaining)
    did: "nothing in the design causes a read" — the single most useful sentence about the values corpus
    cost: $0
  - model: tencent/hy3
    role: panel seat
    did: content-vs-mechanism split on grill-me (content is values, mechanism is discipline)
    cost: ~$0.0059
skills_touched:
  - skill: grill-me (Rule 64)
    change: amended
    motivating_failure: it stopped at "what should it do", was read as a design sub-skill, and persisted a durable brainstorm doc that is itself a rot vector
  - skill: SWAN-VALUES-CORPUS.md (new reference)
    change: created, then gutted the same session
    motivating_failure: shipped agent-seeded and unbounded; six seats judged it "artifact #1,608 with better branding"
  - skill: hermes-learning-packet (Rule 68)
    change: proposed
    motivating_failure: Rule 68's own "plan so complete a worker-bot executes it verbatim" fell 6/6 — the rule that governs this packet's source gate is itself under revision
---

# The panel convicted what I shipped an hour earlier

## The lesson

**Commission the review *before* you are attached to the answer, and give it the thing you
are proudest of.**

I shipped a values corpus and a rebuilt grill-me, then commissioned a six-seat panel on the
doctrine behind them. Every seat that answered convicted the corpus — unanimously, as
"artifact #1,608 with better branding." Had I run the panel first, I would have built the
right thing once. Had I run it *later*, the corpus would have been merged and defended
instead of rewritten.

The second half matters more: **the panel's strongest hits landed on the part of my
reasoning I was most confident about.** I proposed that the expensive model should produce
*the acceptance check, not the plan*, and called it the highest-leverage inversion
available. Kimi killed it in one sentence:

> A wrong plan gets **deviated from** — visibly, recoverably. A wrong check gets
> **satisfied**.

My own selling point ("fails loudly instead of rotting silently") cuts both ways: a wrong
check also *passes loudly while being wrong silently*. That is Goodhart with a gate
attached — a machine for confidently shipping the wrong thing. I did not see it, and I had
argued the opposite to Sean an hour before.

## Who did what

- **Opus 5 (me):** did the measurement and the building, and produced both defects the panel
  found. I was right about the branch diagnosis (verified by blob comparison, not by commit
  count) and wrong about the two design conclusions I was most pleased with.
- **Kimi K3** produced the highest-value output of the six by a clear margin: the
  wrong-check-is-satisfied argument, the correct reason grill-me survives (it is an
  *elicitation protocol*, not a values extractor), and the dissent that "Sean decides" was
  **risk transfer** — I had presented a fully-formed conclusion dressed as an open question.
- **GLM 5.3** produced the best *alternative*: plans are **runtime** artifacts, not repo
  artifacts. Rule 68's discrete error is not "Fable writes a plan," it is "the plan is
  persisted and worshipped." Also the sharpest one-liner: *"proportionality cannot be
  checked by a drift probe; it is a value wearing a rule number."*
- **Ox Alpha** (free) produced the single most useful sentence about the corpus: *"Nothing
  in the design causes a read."* Cost $0.
- **Grok 4.6** was the only seat to reject the *sequencing*: don't build CRAP/mutation/dep
  checkers, drain the backlog first — "everything else is the OS generating OS."
- **DeepSeek V4 Pro** independently converged on the wrong-check finding, which is what made
  it credible rather than one model's opinion.
- **HY3** was the weakest reply (14 KB vs 26–47 KB) but made one clean distinction nobody
  else did: grill-me's *content* is a value, its *mechanism* is a discipline.

## Skills created or changed

- **grill-me amended twice in one session** — first to make it domain-independent with a
  seven-tier values ladder, then to fold the panel: "exhaustive" bounded by blast radius,
  the durable brainstorm transcript demoted to ephemeral, and the survival rationale
  corrected from "extracts values" to "elicitation protocol."
- **SWAN-VALUES-CORPUS.md created and gutted the same day.** It now ships EMPTY with a
  candidate queue carrying no authority, a hard ~2KB cap, mandatory eviction, ack dates,
  and the read-mechanism question stated as a prerequisite.
- **Rule 68 itself is under revision** — 6/6 seats say it falls. The rule that gates *this
  packet's* provenance is one of the rules the panel convicted.

## Mistakes I made

- **I built the artifact before I commissioned the critique.** The corpus was written,
  committed and pushed, and *then* reviewed. Everything the panel said was knowable before
  I wrote a line.
- **I seeded a values file with values Sean never confirmed.** I labelled them "observed,
  not invented," which felt honest and was still wrong: an agent asserting what the owner
  believes is exactly the failure the file existed to prevent. Grok named it directly.
- **I dressed a finished conclusion as an open question.** "Sean decides" on the
  spec-driven conflict read as deference; Kimi correctly called it risk transfer. My
  framing ("keep the interview, kill the blueprint, keep the checks") was not neutral.
- **I wrote `$?` after a pipeline** and the exit-status gate blocked it — corpus mechanism
  #1, an error I had **already written up before**, committed while working on the
  operating system that documents it.
- **I believed my own instrument's negative twice.** A CRLF-blind regex reported "NO
  FRONTMATTER" on a healthy file; I nearly reported a working skill as broken. Then `npx
  tsc` fetched a decoy package (exit 1, zero errors) and the real `tsc` OOM'd (exit 134,
  zero errors) — the second reads as *clean* if you count only error lines.
- **I called GLM "stalled at 0 chars."** It was buffering 15,495 reasoning tokens. I hedged
  the claim, which saved it from being a false report, but the read was wrong.
- **I nearly recommended a file-copy branch rescue** before checking main's per-file history
  — it would have silently dropped six weeks of main's money-path work.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| `$?` after a pipeline | 1 | **Yes — repeatedly** | The `exit-status-gate` hook. Prose had failed on this ≥4 prior times; the gate has never failed. |
| Believing a single instrument's negative | 3 (frontmatter regex, decoy `tsc`, GLM "stalled") | Yes (`instrument-check` skill) | Habit only — no gate exists. Caught 3/3 by reflex, which is luck, not mechanism. |
| Heredoc quoting on Git-Bash CRLF | 1 | Yes | Fell back to file-write. Known trap, still cost a step. |
| Shipping before reviewing | 1 | **No — new** | The panel. Nothing in the pipeline forces review-before-build. |

**The highest-signal row is the first.** It is documented, it has a skill, it has a memory
entry, and I did it anyway — then the *gate* caught it in under a second. That is this
repo's central thesis reproduced live at the author's expense: **a duty enforced only by
the model remembering is a duty that will eventually be dropped.**

**The second row is the honest worry.** Three instrument-trust near-misses, three caught by
reflex, zero caught by mechanism. Reflex is exactly what the first row proves unreliable.
This class needs a gate and does not have one.

## External-model calibration

Six seats, **~$0.275 total**, 6/6 returned cleanly. Every seat produced at least one finding
that survived verification; **zero findings were disproven.** For doctrine review — as
opposed to code review — this is the best return per dollar recorded so far.

| Seat | Cost | Verdict |
|---|---|---|
| Kimi K3 | $0.1025 | **Best value.** Killed the centerpiece and produced the deserved dissent. Fable-tier source; earns its price on doctrine. |
| GLM 5.3 | $0 | **Best value per dollar.** Best alternative proposal *and* the sharpest single line. Free on subscription. |
| Ox Alpha | $0 | One decisive sentence for $0. Standing seat, justified. Note: prompts retained by an undisclosed provider — doctrine packets only, never client data. |
| Grok 4.6 | $0.1303 | Most expensive; only seat to challenge *sequencing* rather than content. Unique angle, worth it here. |
| DeepSeek V4 Pro | $0.0363 | Cheap corroboration. Its value was **independent convergence**, which is what made the finding credible. |
| HY3 | $0.0059 | Weakest and cheapest. One clean distinction. Watch its 262k context — smaller than the other seats, so a large packet silently reviews a *different, shorter document*. |

**Routing lesson:** for doctrine and design-review work, the free seats (GLM, Ox) were
competitive with the paid ones, and **convergence across cheap seats beat depth from one
expensive seat.** Do not reach for a premium seat first on questions of judgment.
