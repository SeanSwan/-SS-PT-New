---
surface: classroom-copilot (side project, brainstorms/)
agent: vs-claude (Opus 5)
date: 2026-08-16
---

# The Desk deterministic gate — built, ten hostile rounds, dry on the tenth

## What happened

The classroom-copilot redaction-middleware round had two panel replies (GLM 5.3, Kimi K3)
and a published synthesis (`the-desk.html`), but nothing built. Built the deterministic
floor of its six-stage pipeline as `desk/` — eight ESM modules, no dependencies, plus a
development corpus, a probe-regression set, fail-closed invariants, and a held-out
adversarial corpus.

Shipped to `main` in SS-PT (`c0e27560b`, `312b8394a`) and to the private handoff repo.

## Numbers, stated honestly

- Held-out **first, untuned run: 50.0% block recall, 15.4% false blocks.** That is the
  only genuinely held-out number this work produced.
- After fixing what it found: 81.8% / 0.0% — **tuned-against, therefore no longer a
  held-out measurement.** Re-earning it needs a fresh corpus written by someone who has
  not read the rules.
- Middle-lane occupancy 44% — the number that decides whether the Desk is worth building
  at all rather than Kimi's cheaper "two lanes and a rule".
- This is the floor only; a model layer sits above it. Quoting its recall as the
  system's would be a lie, and the file says so at the top.

## Mistakes I made

- **Shipped a repo that could not run, then pushed it before testing a fresh clone.**
  The fixture was named `roster.fixture.mjs`; `.gitignore` has `roster*` to stop a real
  roster being committed, so it was silently excluded. `git status` showed 7 files where
  I expected 8 and I pushed anyway. Caught only because I cloned and ran it afterwards.
  Prevention: **clone and execute before claiming a push works** — reading the staged
  list is not the same as running the artifact.
- **Instrumented my own harness wrong and nearly hid a working control.** Counted a
  caught canary breach as an invariant violation, so the suite exited 1 on a case where
  the last-resort net had correctly refused. A failing gate that fails for the wrong
  reason teaches nothing.
- **Wrote five fail-open defects into a control whose stated principle is fail-closed.**
  Non-string input, missing roster, empty roster, roster with a blank name, and a
  non-array canary list all returned "safe to send". The try/catch I relied on never
  fired because none of them throw — they coerce.
- **Mislabelled a corpus case** (`CN3`), then read the resulting failure as a code
  defect before checking my own expectation.
- **Trusted a 0% false-block rate from a corpus that lacked the relevant class.** After
  adding a fail-closed rule I reported 0% false blocks; a probe then showed it refused
  four of seven ordinary admin tasks. The corpus was blind, not the code clean.
- Broke a probe with shell quoting (`'"'"'` inside a quoted heredoc is literal) and
  swallowed a live helper function with an over-broad scripted cut during a file split.

## Error → fix → repeat ledger

| Class | Times this session | Written up before it recurred? | What actually stopped it |
|---|---|---|---|
| Fail-open on degraded input | 5 | no — found as one cluster | explicit stage-0 type/roster/canary guards + invariant tests in the suite |
| A guard silently causing the harm it guards against | **2 across the project** | **yes — last session's leak-scan pattern file was itself the leak vector** | rename the artifact so the guard stays absolute; never negate the guard |
| My own labelling wrong, read as a code defect | 1 | no | check the expectation before changing code |
| Metric believed without checking corpus coverage | 1 | no | probe the class the corpus lacks, then re-measure |

The second row is the high-signal one. **The same failure shape recurred in the same
project after being documented**: last session the leak-scan pattern file contained
every string it protected, so publishing the guard would have published the secret.
This session the ignore rule that protects the roster excluded the fixture and broke the
build. Both times the safety mechanism was the failure. The write-up did not prevent the
repeat, which means the lesson needs to be procedural, not narrative: **after adding or
relying on any guard, verify the guarded artifact still works from a clean checkout.**

## Who did what

- **Opus 5 (me)** — built the gate, ran ten adversarial rounds, found and fixed fourteen
  defects. Also authored every defect it found.
- **GLM 5.3 / Kimi K3** — prior round, already synthesised in `the-desk.html`; not
  re-consulted. Their design held up: the stage-6 re-test of de-named text and the
  fail-closed-by-withholding pattern both caught real cases. Kimi's predicted evasion
  ("she learns to pre-generalise") was real and reachable in two words.
- No paid calls this session. $0.

## Skills / rules touched

- None created or amended. Rule 4 (300-line cap) forced a file split mid-build; Rule 73
  (proof-before-done) is what caught the broken push, because "pushed" is not "works".

## Open for Sean

- `scan-patterns.local.txt` **does not exist on this machine.** The protocol's leak gate
  could not be run; only a weaker fallback pattern was. Building it once is a two-minute
  job and everything else in this project assumes it exists.
- ~40 files in the classroom-copilot folder remain untracked, including the middleware
  packet, both panel replies, and `the-desk.html`. I committed only `desk/`.
