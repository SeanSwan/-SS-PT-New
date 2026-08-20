---
originating_model: claude-opus-5
tier: fable-tier
date: 2026-08-16
topic: Hypothesis exhaustion is a signal to change METHOD, not to generate hypothesis N+1
models_used:
  - model: claude-opus-5
    role: investigator
    did: generated seven consecutive wrong hypotheses about one bug, all from code-reading, and never switched investigative method until the budget ran out
    cost: subscription (flat)
skills_touched:
  - id: systematic-debugging
    change: proposed-amendment
    failure: it prescribes root-cause investigation before fixes, but has no rule for what to do when repeated investigation of the SAME KIND keeps failing — nothing forces a method switch
  - id: cross-env-verify
    change: proposed-amendment
    failure: covers validating an instrument you already chose; says nothing about noticing you have used only one CLASS of instrument
---

# Hypothesis exhaustion is a method signal

## The lesson

One bug: *what paints the 34 rows of chrome at Hermes startup?* I produced **seven** hypotheses.

1. `Banner` component · 2. `SessionPanel` accordions · 3. generic `Panel` · 4. the Python
`banner.py` path · 5. the banner snapshot cache · 6. "the config isn't being read" · 7.
`display.compact` / `self.compact`

All seven were wrong. **All seven were derived the same way: by reading source and reasoning about
control flow.** Not one was derived by making the running program report on itself.

Each individual guess was defensible. Hypothesis 7 was especially good — it found genuinely dead
code (`compact` defaults to `False`, never `None`, so the config branch is unreachable), which is a
real upstream defect. It still did not explain the banner, because the premise underneath all seven
was never tested: *that the answer is legible from the source at all.*

> **When N consecutive hypotheses of the same kind fail, the failing thing is the METHOD, not the
> hypotheses. Stop generating candidates; change how candidates are produced.**

Concretely: after the third failure I should have added a temporary unique marker string to each
candidate emitter, run the program, and seen which marker appeared. Twenty minutes, one answer,
zero inference. Instead I spent four more rounds refining inference.

**The trap is that each new hypothesis feels like progress** — I really was eliminating candidates,
and the elimination table grew. But a search that eliminates from an unbounded space while never
testing whether the space is the right one is not converging; it is only getting longer.

## Who did what

- **Opus 5 (me)** — all seven hypotheses, all seven eliminations, and the failure to change method.
  I did apply real discipline *within* the method: every hypothesis was verified before any change,
  and the one config change I made was measured, found ineffective, and reverted rather than left as
  unexplained drift. Rigour inside a wrong method still produces a wrong method's results.
- No external model was consulted on this specific question. Notably, when GLM 5.3 reviewed the
  audit, it flagged this exact shape from the outside: *"the scandal: §9 records a 45 GB download
  this audit did run, while the 30-minute capture it says would beat §4 was not run."* I read that,
  agreed, and still did not switch method for the banner hunt.

## Skills created or changed

Proposed, not applied (Sean's call):

- **`systematic-debugging`** — add a **method-switch trigger**: after **three** failed hypotheses of
  the same derivation class (code-reading, log-reading, config-inspection), the next action must be a
  *different class* of evidence — instrumentation, bisection, or runtime observation — before any
  further hypothesis is generated. Record the class of each hypothesis so the count is visible.
- **`cross-env-verify`** — extend from "validate the instrument" to "**vary** the instrument": if
  every probe so far shares one modality, that is itself a finding to surface, not a neutral fact.

Both are bound to this incident: seven code-reading hypotheses, zero instrumentation attempts,
one unresolved bug.

## Mistakes I made

- Generated hypothesis N+1 seven times instead of asking why the method kept failing.
- Read an external reviewer naming this exact pattern in my work, agreed with it in writing, and did
  not act on it for the very bug it applied to.
- Mis-read a call site mid-trace and stated it before checking (`"no compact line"` when the line was
  plainly there) — corrected one command later, but asserted first.
- Ran a config probe without `HERMES_HOME` and got a `KeyError` that read like "the user's models are
  gone." Caught only because the result was implausible, not because I validated the probe first.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before recurring? | What stopped it |
|---|---|---|---|
| Narrow/static/secondhand reading stated as broad fact | **9+** | Yes, repeatedly, including in-context | Control terms; external reviewers; implausible results |
| **Same-modality hypothesis generation without method switch** | **7 (one bug)** | **No — new class** | **Nothing. Budget ran out; bug still open** |
| Security control analysed in isolation from downstream consumer | 2 | No | Relay reviewer briefed to attack the fix |

**The second row is the one to keep.** It is the only class this session that was *never* caught by
any mechanism — not a hook, not a reviewer, not a control term. It ended because I stopped, not
because anything detected it. An error class with no detector is the most dangerous kind, and the
proposed fix is a **counter** (three strikes → change modality), because a counter fires without
needing anyone to notice.

## External-model calibration

No paid calls this turn. Session cumulative: GLM 5.3 (flat-rate) 3 real / 1 refuted · Kimi K3
$0.2818, 4 real / 0 refuted · HY3 $0.0084, 3 real / 0 refuted. **$0.29 for three independent
security reviews that found three distinct HIGH-severity holes.** GLM 5.3 additionally diagnosed the
method failure documented here from the outside — external reviewers see method blindness that the
investigator structurally cannot.
