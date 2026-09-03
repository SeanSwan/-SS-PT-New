---
originating_model: claude-opus-5
tier: fable-tier
date: 2026-08-16
topic: "ast.parse says syntax OK for a patch that silently guts a constructor — verify STRUCTURE, and distrust a metric that improves too much"
models_used:
  - model: claude-opus-5
    role: builder, investigator
    did: fixed the terminal-noise root cause by instrumentation after 7 code-reading hypotheses failed; then broke Hermes at startup with a patch that passed every syntax check
    cost: subscription (flat)
  - model: z-ai/glm-5.3
    role: hostile + security reviewer of the four slices
    did: returned 9 ranked findings each with a one-command settling probe; 2 fixed immediately, including one defect in the reviewer-author's own prior fix
    cost: flat-rate Z.ai coding plan
skills_touched:
  - id: verification-before-completion
    change: proposed-amendment
    failure: a patch passed `ast.parse` ("syntax OK"), was reported as applied, and had gutted a constructor — nothing required a STRUCTURAL assertion about where the code landed
  - id: systematic-debugging
    change: proposed-amendment
    failure: a measured metric moved FURTHER than the target (2 -> 0) and was briefly read as success; nothing treats an over-good result as a defect signal
---

# Syntax-valid is not structurally correct

## The lesson

I inserted a method into a Python class by anchoring a text replacement to a line **inside
`__init__`**. The insertion landed as a **nested function definition**.

That is legal Python. `ast.parse` returned clean. My patch script printed `APPLIED`, my syntax check
printed `syntax OK`, and the constructor had been silently truncated — every attribute assigned
after the anchor stopped existing. Hermes crashed at startup:

```
AttributeError: 'HermesCLI' object has no attribute '_active_session_lease'
```

> **A syntax check proves the file parses. It proves nothing about where your code went.**

The correct verification is a **structural assertion** against the parsed tree:

```python
cls = [n for n in ast.walk(tree) if isinstance(n, ast.ClassDef) and n.name == "HermesCLI"][0]
assert "_compact_display" in [m.name for m in cls.body if isinstance(m, ast.FunctionDef)]
init = [m for m in cls.body if isinstance(m, ast.FunctionDef) and m.name == "__init__"][0]
assert not [n for n in init.body if isinstance(n, ast.FunctionDef)]   # no nested defs
assert "_active_session_lease" in ast.get_source_segment(src, init)   # constructor intact
```

Three assertions, all cheap, all of which fail loudly on the exact mistake I made. When a patch
moves code between scopes, **assert the destination**, never just that the result parses.

### The second half: distrust a metric that improves too much

The banner metric I was optimising went **34 → 2** (target), then on the broken patch **2 → 0**.

My first reaction was that 0 was even better. **0 meant the program had crashed and painted
nothing.** The number was perfect because nothing ran.

> **A measurement that overshoots the target is a defect signal, not a win.** When a metric lands
> beyond what the change could plausibly achieve, the instrument or the subject is broken.

I caught it only because I looked at the captured screen instead of the count — the capture held a
traceback. Had I trusted the number, I would have committed a crash and reported success.

## Who did what

- **Opus 5 (me)** — found the real root cause (a config value made unreachable by
  `getattr(args, "compact", False)` with no corresponding CLI flag) **by instrumentation, in one
  run, after seven code-reading hypotheses had failed**. That method switch worked exactly as the
  previous packet predicted. Then broke the constructor, misread 0 as success, and called a
  deterministic environment-gated failure "flaky" before isolating it.
- **GLM 5.3** — reviewed all four slices, returned **9 ranked findings each with a one-command
  settling probe**. Two were fixed immediately: a HIGH where alias expansion could hijack a
  pending-input confirmation route, and a MEDIUM that was a defect **in my own prior fix** (the
  banner and `/clear` path disagreeing about compact). It also declined to inflate its own earlier
  nit, rating it SAFE. Zero findings disproven on verification this round.

## Skills created or changed

Proposed, not applied (Sean's call):

- **`verification-before-completion`** — when a patch inserts or moves a definition, require a
  **structural assertion** (AST membership / absence of unintended nesting / a known sibling still
  present), not merely a successful parse. "syntax OK" must stop being accepted as evidence that a
  patch landed correctly.
- **`systematic-debugging`** — add an **overshoot check**: if a measured metric moves past the
  expected target, treat it as a suspected instrument or subject failure and inspect the raw
  artifact before recording success.

Both bind to this incident: `ast.parse` OK + metric 2→0 + crashed program, all simultaneously true.

## Mistakes I made

- Anchored a class-method insertion to a line inside `__init__`, producing a nested def that gutted
  the constructor; shipped it as far as a live run.
- Accepted "syntax OK" as proof a patch was correctly placed.
- Read a metric overshooting its target (2 → 0) as success rather than as a failure signal.
- Called a failure "flaky" after two disagreeing runs instead of isolating the differing variable —
  it was fully deterministic on whether `HERMES_HOME` was exported.
- Used an unquoted heredoc, letting bash command-substitute backticks inside a Python string and
  silently delete words from comments written into someone else's source file.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before recurring? | What stopped it |
|---|---|---|---|
| Narrow/static/secondhand reading stated as broad fact | **9+** | Yes, repeatedly, in-context | Control terms; external reviewers; implausible results |
| Same-modality hypothesis generation without method switch | 7 (one bug) | Written up **last turn** | **Did not recur — the method switch was applied and solved it in one run** |
| **Accepting a weak check as proof a change landed correctly** | **1 (new)** | No | Reading the raw artifact, not the metric |
| Declaring "flaky" before isolating the differing variable | 1 (new) | No | Running the same test with the variable both ways |

**The most encouraging row is the second:** a lesson written up one turn earlier was *applied* the
next turn and immediately resolved a bug that had resisted seven attempts. That is the first time
this session a documented lesson prevented its own repeat — and it worked because the correction was
**procedural** ("switch evidence class after N failures"), not resolutional ("think harder").

**The most dangerous row is the third:** it is new, and the thing that caught it was luck-adjacent —
I happened to inspect the capture rather than the count. The proposed AST assertion converts that
luck into a mechanism.

## External-model calibration

| Model | Cost | Real | Disproven | Route to it for |
|---|---|---|---|---|
| GLM 5.3 | flat-rate | 9 findings, 2 fixed immediately | 0 this round | Hostile + security review of a *set* of related changes; ships a probe per finding |

**Pattern worth keeping:** every fix this turn began by running the reviewer's own suggested probe.
A review that hands you the command to settle each claim converts review output into work items with
no re-derivation — and makes disproving the reviewer as cheap as agreeing with it.
