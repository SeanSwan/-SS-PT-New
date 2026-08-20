---
title: A dead suite survives every mutation
packet: a-dead-suite-survives-every-mutation
date: 2026-08-19
originating_model: claude-opus-5
tier: fable-tier
tier_basis: authored by claude-opus-5, per Sean's designation 2026-08-10. Provenance is the MODEL,
  not the mode (Rule 71).
decision: Mutation testing has a precondition nobody states — the suite must actually run. Assert
  a positive test COUNT before trusting any mutation result, because a suite reporting zero tests
  produces the identical output mutated and unmutated. And when code that never changed starts
  failing, the question is not "what did I change" but "what changed around it".
status: draft
privacy: file paths, tool names, git config values and counts only. No client PII, no credentials,
  no secrets. Secret-scanned CLEAN before commit.
surface: test infrastructure / verification discipline / security tooling
supersedes: none
extends: 20260815-a-denylist-is-an-inverted-allowlist.md
models_used:
  - model: claude-opus-5 (session main-s2e2f8326)
    role: auditor of its own prior work, and author of the wrong first diagnosis
    did: found 16 of its own security controls silently dead on main two days after shipping
         them; fixed it; then caught its OWN commit message naming half the cause, and corrected
         the record with a two-arm experiment
    cost: subscription, $0 marginal
skills_touched:
  - id: mutation-testing discipline (from 20260815-the-decorative-test-you-find-will-be-your-own)
    change: precondition added
    failure: the discipline says "mutate until the test goes red". It is silent on the case where
             the suite never ran, and in that case mutation returns the same output either way —
             so the strongest verification tool in this repo reports nothing and looks like it
             reported something.
  - id: rule-73 (proof-before-done)
    change: reinforced
    failure: "16/16 passed" was true when I wrote it and false two days later, with no commit in
             between touching either file. A green count has a shelf life.
  - id: audit-idor-surface.mjs
    change: shebang removed
    failure: it was simultaneously a CLI and an import target; the CLI half cost the library half
             its entire test suite.
---

# A dead suite survives every mutation

## The lesson

Mutation testing is the strongest verification discipline in this repo. Its rule: change the
behaviour under test, confirm a test goes red, and only then believe the suite. It has an unstated
precondition, and when the precondition fails the tool gives a confident non-answer.

Measured, on a suite of 16 security controls:

| state | mutation applied? | what the reviewer sees |
|---|---|---|
| suite alive | no | `Tests 16 passed (16)` |
| suite alive | **yes** | `Tests 2 failed \| 14 passed` ← the signal |
| suite **dead** | no | `Test Files 1 failed` · `Tests no tests` |
| suite **dead** | **yes** | `Test Files 1 failed` · `Tests no tests` ← **identical** |

The bottom two rows are the finding. A mutation against a suite that does not run produces exactly
what the unmutated dead suite produces. There is a red "1 failed" on screen in both cases, which is
worse than silence: it looks like the mutation landed.

**The fix is one assertion, and it is cheap: require a positive test COUNT, not just a pass.**
`Tests 16 passed` and `Tests no tests` are both "not failing". Only the first is evidence.

## What actually happened

Two days after shipping 16 controls over a security instrument, I audited my own work against a
branch that had moved ~200 commits. The instrument still ran and still reported 230 files / 211
handlers / 190 clear. **Its entire control suite reported zero tests.**

Nothing had changed. `git show <original-blob>` diffs byte-identical to HEAD ignoring CR. No commit
touched either file. The toolchain moved underneath a file that was already correct.

**Mechanism — two ingredients, and I first reported one.** Vitest's esbuild transform fails to
strip a shebang whose line ends `\r\n`. Isolated:

```
shebang + LF        -> 16 passed
shebang + CRLF      -> no tests
no shebang + CRLF   -> 16 passed
```

`node` strips shebangs correctly, so the CLI never showed a symptom for two days. And the failure is
attributed to the **importing** file, not the guilty module — so the error message points away from
the cause.

**It is a latent class, not one file.** `core.autocrlf=true`; `.gitattributes` pins `eol=lf` for
`scripts/*.sh` only; **172** shebang-bearing `.mjs` files live under `scripts/` and
`backend/scripts/`. Every one is a single `import` away from the same silent death. Mine was simply
the first that a test imported.

## Ask what changed AROUND it

Every instinct on seeing a file fail is "what did I change". Here the answer was *nothing*, and
holding onto that question cost four wrong diagnoses. The productive question is **what changed
around it** — toolchain version, checkout normalisation, config, a sibling's merge.

The tell was available early and I under-weighted it: the file was byte-identical to a version I had
personally watched pass. That should immediately promote the environment to prime suspect, not
demote it.

## Mistakes I made

- **I shipped a commit whose stated mechanism was half right.** It named the shebang; the cause is
  shebang **plus** CRLF. The fix was correct, so nothing was broken by it — but the next agent would
  have read "shebangs break imports", found 171 other shebang'd scripts working fine, and concluded
  the note was wrong. A correct fix with a wrong reason is a trap for the person after you.
- **I ran the right experiment on the wrong file.** I tested the line-endings hypothesis by
  converting the *test* file to LF, saw it still fail, and wrote off line endings entirely. The
  imported *script* was the one that mattered. The hypothesis was correct and I disproved it by
  aiming one file to the left.
- **I built a bisect harness that could not produce a valid answer** — appending `});` to arbitrary
  line-range truncations, so unbalanced braces meant "clean" ranges proved nothing. I read two
  results off it before noticing they were internally inconsistent.
- **I claimed "no non-ASCII characters" from a broken probe.** `grep -P` is unsupported in this
  environment; my `||` fallback silently did nothing; I read the empty output as a negative result.
  The file was full of em-dashes. Third instrument-lies incident of this lane.
- **I asserted a class-wide claim from two samples.** "Other shebang'd scripts are fine, so the
  shebang is not the problem" — those two are only ever `readFileSync`'d by their tests, never
  imported. They were not counter-examples; they were a different case entirely.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before recurring? | What actually stopped it |
|---|---|---|---|
| Believed a negative from an unvalidated probe | 2 (grep -P; the bisect harness) | **Yes — repeatedly, across weeks** | Checking the probe against a known-positive before trusting a null result |
| Confident mechanism from an incomplete experiment | 1 (LF test on the wrong file) | No | Two-arm isolation: vary ONE ingredient, hold the other |
| Sampled 2, concluded about 172 | 1 | No | Asking how the samples DIFFER from the subject before treating them as controls |
| Green count treated as durable | 1 | Partially — the decorative-test packet is adjacent | Re-running the suite as step one of any audit, never quoting a remembered number |

The top row is the one that keeps recurring. Every instance is the same shape: **a tool returned
nothing, and I read "nothing" as "there is nothing there" rather than "this tool did not look".**
The procedural fix that works is a known-positive: point the probe at something you are certain it
should find, and only believe the null result if the positive control lights up.

## External-model calibration

**No external calls this session — correctly.** Every finding here came from running local commands
against a live tree. A paid reviewer reading this code would not have found it, because the code was
correct: the defect existed only in the interaction between a checked-out file and a transform.
**This class is invisible to review and only visible to execution.** Worth remembering when
choosing between "get it reviewed" and "go run it" — they are not substitutes.

Prior-lane calibration stands unchanged: peers find implementation defects, the paid tier finds
category defects, and neither finds environment defects. Only running does.

## Carried forward

- **`*.mjs text eol=lf` in `.gitattributes`** closes this class for all 172 scripts. One line, but
  it renormalizes every one of them — a sweep to run when no other agent is live.
- **18 backend test files currently contribute zero tests** (a separate cause: `node:test` imports
  inside a vitest glob, plus 2 undiagnosed). Same disease, different vector: the file list still
  says they ran.
- The natural guard: a CI assertion that the number of collected tests never DROPS between runs.
  A count that silently falls to zero is the only version of this failure that matters, and it is
  trivially detectable if anyone is watching the count instead of the colour.
