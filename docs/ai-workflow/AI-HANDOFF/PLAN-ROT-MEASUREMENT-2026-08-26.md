---
title: "Plan-rot measurement — are persisted plans ever re-read?"
date: 2026-08-26
author: Claude Opus 5
status: shipped
decision: "Bob's rot claim is CONFIRMED for implementation blueprints (14.4% re-read) and REFUTED for direction docs (38.1%). The values/blueprint line is now measured, not asserted."
supersedes: none
expires_if: "the corpus doubles — re-run scripts/measure-plan-rot.mjs and compare"
---

# Plan-rot measurement

GLM proposed this during the six-seat panel as the cheap decisive test: *grep the session
transcripts for post-implementation re-reads of persisted plans. If the number is near
zero, Bob's rot claim is confirmed locally and the arbitration is short.*

It was run. The answer is more useful than "near zero," because it is **not uniform.**

## Method

- **Corpus:** 793 tracked `.md` files under `AI-HANDOFF/` and `brainstorms/`, each with its
  git creation date from one `--diff-filter=A --name-only` pass. 36 ambiguous basenames
  excluded rather than guessed.
- **Evidence:** 349,729 lines across 187 session transcripts on this machine.
- **Re-read** = a read-shaped mention (Read/Grep tool, or `cat`/`sed -n`/`head`/`grep`/`rg`)
  occurring **>24h after creation**. The 24h window excludes same-session authoring churn,
  which is not a re-read.
- Any line carrying a write-signal is classified WRITE even if it also reads —
  **conservative, so it undercounts reads.** A low re-read rate is therefore not an artifact
  of this choice.

## Headline

| | |
|---|---|
| Docs measured | **793** |
| Re-read >24h after creation | **143 (18.0%)** |
| Mentioned, but no read verb | 245 (30.9%) |
| **Never touched again** | **405 (51.1%)** |
| Total post-creation reads | 513 — mean **0.65** per doc |

**Half of everything we persist is never opened again.**

## The cut that decides the doctrine

| class | n | re-read rate | mean/doc | ex-outlier |
|---|---|---|---|---|
| **direction** (vision / decision / ruling / charter) | 21 | **38.1%** | 1.48 | 0.95 |
| handoff / closeout | 50 | 34.0% | 0.64 | 0.51 |
| other | 369 | 18.4% | 0.86 | 0.36 |
| **blueprint** (plan / spec / slice / phase / roadmap) | 167 | **14.4%** | 0.51 | 0.42 |
| review artifact (audit / panel / debate / consult) | 186 | 14.0% | 0.25 | 0.16 |

**Direction documents are re-read at 2.6× the rate of implementation blueprints.** The
effect holds under two independent classification methods (full-path and basename-only),
which is what makes it worth acting on.

## What this settles

- **Bob's rot claim is CONFIRMED — for blueprints.** ~86% of implementation plans are never
  re-read. Rule 68's persisted verbatim-execution plan is the worst-performing artifact
  class we produce, measured in our own repo rather than borrowed from an outside opinion.
- **It is REFUTED for direction.** Vision, decisions and rulings earn their persistence at
  more than double the rate. **"Persisted docs rot" is too coarse a claim** — what rots is
  the *solution* commitment, not the *problem* definition.
- **This is exactly the line the panel drew independently.** Six seats converged on "keep
  the interview, kill the blueprint" from reasoning alone; the transcripts agree. Two
  independent methods reaching the same boundary is the strongest evidence in this whole
  workstream.
- **Uncomfortable corollary:** review artifacts are the worst class at 14.0% / 0.25 mean.
  The six panel replies committed yesterday are, statistically, unlikely to be read again.
  That is an argument for the synthesis being the durable artifact and the raw replies
  being evidence, not reading material.

## Limits — stated because the conclusion depends on them

- **`direction` is n=21.** Small. The *direction* of the effect is consistent across both
  classification methods; the *magnitude* is not precise.
- **Claude transcripts only.** Reads by Codex, Hermes, Qwen, or Sean in an editor are
  invisible here. True re-read rates are floors, not ceilings.
- Basename matching; 36 ambiguous names dropped.
- The 24h threshold is a judgement call, not a derived constant.

## Reproduce

```
node scripts/measure-plan-rot.mjs
```

Re-run when the corpus materially grows and compare. The script prints a **positive
control** — the most re-read docs — precisely so a broken instrument is visible before its
headline number is believed.
