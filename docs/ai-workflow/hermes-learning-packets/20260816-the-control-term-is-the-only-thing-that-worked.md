---
originating_model: claude-opus-5
tier: fable-tier
date: 2026-08-16
topic: Probe-instrument validation — why writing the rule down failed seven times and a control term worked
models_used:
  - model: claude-opus-5
    role: auditor, builder, Final Decider (Fable absent)
    did: ran the Hermes/Qwen upgrade, wrote the terminal audit, arbitrated the panel, and committed all seven instances of the error class documented here
    cost: subscription (flat)
  - model: z-ai/glm-5.3
    role: hostile reviewer (2 passes — verdict doc, then audit doc)
    did: overturned the Decider's verdict twice and the audit's headline claim once; supplied the exact probe command that disproved it
    cost: flat-rate Z.ai coding plan (~$0 marginal)
  - model: moonshotai/kimi-k3
    role: hostile reviewer (1 pass, blueprint)
    did: caught the no-fork contradiction, a void slice, and two factual errors in the auditor's own work
    cost: $0.2179
  - model: z-ai/glm-5.2
    role: blueprint author
    did: produced Mermaid diagrams, ASCII wireframes, 9 slices, 36-component keep/cut table
    cost: ~$0.04
skills_touched:
  - id: cross-env-verify
    change: proposed-amendment
    failure: its remit covers "validate before believing a negative" but nothing forces a CONTROL TERM inside the probe; the rule was in context, was read, and was violated anyway
  - id: stale-check
    change: proposed-amendment
    failure: a 17-day-old .git/shallow.lock silently invalidated every fetch; no check treats a stale lock as an instrument fault
  - id: Rule 54 (sibling-sweep grep evidence)
    change: proposed-amendment
    failure: requires the literal search command for POSITIVE enumeration; says nothing about ABSENCE claims or about the probe surface being wrong for the question
---

# The control term is the only thing that worked

## The lesson

Across one session I made **seven** claims of the same class: **a narrow, static, or secondhand reading reported as a broad fact.**

1. Grep scoped to 2 directories → "feature MISSING from the product" (3 of 5 wrong)
2. Pipeline exit code 0 → "the pulls succeeded" (both had failed)
3. `ollama ps` VRAM split → "slightly slower" (actually 3.7× slower, 17s cold load)
4. OpenRouter catalog → "GLM 5.3 does not exist" (it does)
5. PAYG endpoint 402s → "the paid plan is not attached" (wrong endpoint; plan fine)
6. Upstream release notes → "the missing options arrive by updating" (delta is 2 commands)
7. `git grep <rev>` returning 0 → "absent upstream" (instrument was dead; returned 0 for everything)

**After each one I wrote a rule against it. The next instance happened anyway — six consecutive times.** By #7 the governing rule was not merely written, it was *in my context window*, in a memory file titled "validate the probe before believing an absence claim," citing six prior false-missing claims.

I read it. I violated it.

## What actually stopped it

Not the rule. **A control term.**

On instance #7 I ran the probe against a value whose answer I already knew (`model`, a command I had personally enumerated in the local registry minutes earlier). The control came back **empty** — same as the four unknowns. That single empty result is what exposed the instrument as dead, and it did so *before* the claim reached Sean.

The control worked where six written rules failed because of **where the failure surfaces**. A rule fails silently, in my judgment, at the moment I am least likely to apply it — when the result looks clean and points where I want. A control fails **loudly, inside the probe output**, where I cannot miss it and cannot rationalise it.

> **A probe that returns the same answer for a known-present control as for the unknowns is broken, not informative.**

This is the generalisable form: **do not validate the claim, validate the instrument — and validate it with something the instrument must get right.**

## Who did what

- **Opus 5 (me)** — committed all seven instances. Ran the upgrade, wrote the audit, ran the panel, and arbitrated it. Also caught #7 via the control. Every other instance was caught externally.
- **GLM 5.3** — the strongest reviewer in the session, by a distance. It overturned the Decider's verdict *twice* and the audit's headline *once*, and it did not merely object: it supplied the executable probe that settled the question. It also caught the document crediting GLM 5.3 for evidence while a different section denied GLM 5.3 existed — *"I am comfortable with my existence; the document's provenance for its own key evidence is not."* Findings verified real: 4 of 4 checked. Disproven: 0.
- **Kimi K3** ($0.22) — caught the decisive no-fork contradiction and two of my factual errors. One of its own headline findings (that a component was not mounted) was refuted by evidence — it asserted an evidentiary gap without checking, the same sin it charged others with. Strong reviewer; still requires verification.
- **GLM 5.2** (~$0.04) — good artifact generator (diagrams, wireframes, slice plans). Fabricated a load-bearing number (a closed-source competitor's LOC count) and its own summary table did not match its own rows. Never trust its figures.
- **Sean** — caught #5 and #6 personally, and forced the review that produced the rest. His instinct to demand an outside reviewer is what kept a wrong conclusion out of the plan.

## Skills created or changed

No skill was written this session. Three amendments are **proposed, not applied** (Sean's call):

- **`cross-env-verify`** — add a hard requirement: any absence claim must include a **control term with a known-present answer**, and the control's result must be shown alongside the finding. The skill currently says "validate before believing a negative," which is advice; this makes it a visible artifact.
- **`stale-check`** — add stale VCS lock files (`.git/*.lock` older than ~1h) to the instrument-fault checklist. A 17-day-old `shallow.lock` invalidated every fetch in this session and would have blocked the real update.
- **Rule 54** — extend the literal-search-command requirement from positive enumeration to **absence claims**, and require naming the **surface** probed (registry vs grep vs release notes) plus why that surface can answer the question.

Recording a skill without the failure that motivated it becomes cargo-cult within a month; each amendment above is bound to its incident.

## Mistakes I made

- Built a document's most important claim on marketing copy while probing everything less important rigorously. The load-bearing sentence got the weakest evidence *because* it pointed in the convenient direction.
- Reported a confident negative from a dead instrument, twice in a row, on the same question.
- Misdiagnosed a working paid subscription as broken and advised the user to go argue with the vendor — from the wrong API endpoint, with a free-tier model's success making the wrong conclusion look confirmed.
- Contradicted a reference document written the same day, on the branch I was already checked out on, without reading it.
- Ran a 45 GB model download while never spending 30 minutes capturing the terminal whose appearance was the actual complaint.
- Told the user a model was "max quality that runs" without measuring throughput; the build I called a lesser backup was 3.7× faster.

## Error → fix → repeat ledger

| Error class | Times this session | Already written up before recurring? | What finally stopped it |
|---|---|---|---|
| Narrow/static/secondhand reading → broad fact | **7** | **Yes — from instance #2 onward, and by #7 the rule was in-context in a memory file citing six priors** | **A control term inside the probe.** Not the rule, not the memory, not the write-up. |
| Trusting wrapper exit code over inner output | 1 | No | Reading the log |
| Absence claimed from unvalidated instrument | 2 (same question) | Yes — `feedback_validate_probe_before_absence_claim.md` was in context | Control term |
| Reviewing a visual complaint without looking at it | 1 (whole session) | No | GLM 5.3 pointed out a 45 GB download ran but a 30-min capture did not |

**The highest-signal row is the first.** Seven recurrences, with the preventing rule present in context for the last one. This is decisive evidence that **documenting an error class does not prevent it**. The correction that survives is *procedural and self-announcing* — a step whose failure is visible in the output — never *resolutional* ("check more carefully next time").

Corollary for Hermes: when a lesson recurs after being written up, do not re-write the lesson harder. **Convert it into a mechanism that fails loudly.**

## External-model calibration

| Model | Cost | Real | Disproven | Route to it for |
|---|---|---|---|---|
| GLM 5.3 | flat-rate | 4/4 verified | 0 | **Default hostile reviewer for decision records.** Overturned verified conclusions 3× in one session. Requires the Z.ai **coding** endpoint + streaming (84% of its output is invisible reasoning; wall >300s kills a plain fetch). |
| Kimi K3 | $0.22 | 6 | 1 | Second opinion on plans; strong ROI; verify its claims |
| GLM 5.2 | $0.04 | structure | numbers | Artifact generation only — diagrams, tables, wireframes |

**Routing rule learned:** the cheapest reviewer in the session was also the best. Flat-rate GLM 5.3 out-performed a paid Kimi pass and the Decider itself. Cost is not a proxy for review quality.
