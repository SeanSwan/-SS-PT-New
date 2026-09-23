---
title: A green build is not a bootable artifact
originating_model: claude-opus-5
tier_basis: Sean's explicit designation 2026-08-10 — Opus 5 is Fable-tier and may write the durable corpus
reviewed_by: 8 local hostile rounds; R1/R2/R4/R5 each found a real defect, R3/R6/R7/R8 dry (CLEAN×3 to close)
date: 2026-08-14
decision: Tests, type-check and build passing say nothing about whether the produced artifact can start; run the built thing, and mutate every redundant layer before believing a security test bites
status: shipped
supersedes: none
models_used:
  - model: claude-opus-5
    role: sole builder, hostile reviewer, packet author
    did: shipped SwanGuard TASK A (single-origin web serving), found and fixed a production bundle that could never boot, mutation-tested its own guards and discovered its traversal test could not discriminate between two redundant layers, re-anchored an existing test that had pinned a defect
    cost: subscription
skills_touched:
  - name: rule-73 / proof-before-done
    change: exercised, and it is the only reason the boot defect was found
    why: the rule forced a live run of the built server rather than accepting three green gates; the artifact died instantly on boot with ERR_UNKNOWN_FILE_EXTENSION. Every automated signal was green and the deploy was impossible.
  - name: test-delta disclosure
    change: exercised, and sharpened
    why: five of twenty added tests pass with or without the fix — they are regression armour, not evidence. Reporting them inside an undifferentiated pass count would have manufactured false confidence. New habit — classify guard tests vs fix-proving tests explicitly.
  - name: mutation testing (informal practice)
    change: amended — single-layer mutation is insufficient
    why: disabling either one of two redundant traversal guards left the suite green. Only disabling both proved the test bites. A one-layer mutation would have supported either of two wrong conclusions.
  - name: feedback_gitbash_pathconv_false_negative
    change: extended
    why: previously recorded for `<rev>:<path>` args. It also mangles URLs passed to curl (`/civic/newsroom` → `C:/Program Files/...`) and Windows flags (`/F` → `F:/`), and it returns a plausible-looking result rather than an error.
privacy: IDs/roles only; no PII, no secrets, no credential values, no absolute paths
---

## The lesson

I was handed a branch whose baseline was **848 tests passing, type-check exit 0,
build exit 0** — verified, documented, and true. The deploy config had a start
command. Nothing in the automated signal was wrong.

The artifact that command produced **could not start.** Not "was slow", not "had a
bug" — the process died on the first line with
`ERR_UNKNOWN_FILE_EXTENSION ".ts"`.

The build bundled with `--packages=external`, which externalizes *every* bare
import. Two of those imports were workspace packages that are TypeScript-source
only: they declare `main: src/index.ts`, set `noEmit: true`, and emit no compiled
output. They are designed to be *bundled*, never resolved by the runtime. So the
bundler dutifully left `import ... from '@scope/domain'` in the output, and Node
tried to load raw TypeScript.

It had never been caught because the service had never been deployed. The defect
lived exactly in the gap between "the build succeeds" and "the thing the build
produced runs" — and **no test in a 848-test suite occupies that gap**, because
tests import source, not the bundle.

I only found it because I refused to claim TASK A was done without watching the
real server serve a real request.

**Green tests, green types, green build, dead artifact. Run the built thing.**

## The second lesson: a redundant guard makes your test untrustworthy

I wrote a path-traversal test for the new static-file surface and, per the
proof-before-done discipline, tried to make it fail.

- Disabled the `..` rejection → **suite still green.**
- Restored it, disabled the resolved-path containment check → **suite still
  green.**

Two mutations, two green runs. Each result, taken alone, licenses a confident and
wrong conclusion: *"my traversal test is worthless"* or *"this guard is dead code,
delete it."*

Only when I disabled **both** did the test fail — and it failed by printing the
planted secret, exactly as intended.

The guards are genuinely redundant: either one blocks the attack alone. That is
good defence-in-depth and bad mutation methodology. **With N redundant layers,
you must disable all N to learn whether the test bites at all — and disabling
each one individually is how you learn the layers are redundant rather than
load-bearing.** Both facts are worth knowing; neither is visible from a single
mutation.

## The third lesson: a test can pin a defect and then defend it

When I fixed the build flag, an existing test failed. It asserted the build
command *as an exact string* — including `--packages=external`, the flag that made
the artifact unbootable.

The test was not protecting correct behaviour. It was **locking in the defect and
would have blocked the fix** for anyone who trusted it. Exact-string assertions on
configuration do this: they convert whatever was true when written into a
requirement, with no notion of whether it was ever right.

I re-anchored it to the property that actually matters (workspace packages must
not be external; real npm deps may be) plus the precondition that makes it a boot
failure (the workspace package's `main` ends in `.ts`). And I disclosed the
rewrite as a re-anchor rather than letting the new pass count absorb it.

## Who did what

Only `claude-opus-5` worked this session — no external model was consulted, and
none was needed: every claim was repo-checkable or runnable locally, so paid
review would have bought opinion where evidence was available. Recording that as
a routing data point, not a virtue.

The **prior** agent on this branch deserves credit for the thing that made this
session cheap: it wrote a handoff with file:line evidence for every claim and an
explicit "do NOT just widen the host allowlist, here is why" section. That
warning was correct and saved me from the obvious wrong fix.

It was also **wrong in one place**, and the wrongness was instructive. Its deploy
config asserted the browser client was "hard-wired to a local backend" and
therefore undeployable. Untrue: with no base-URL env var set, the resolver returns
`undefined` and the URL builder emits a bare relative path — a production build
already talks to its own origin. The client needed **no change at all**; only a
single-origin serving shape was missing.

**A carefully evidenced handoff can still contain a confident misdiagnosis.** I
caught it by writing a five-line throwaway probe against the real functions before
designing anything. Two minutes of execution beat a paragraph of documented
reasoning.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| Trusting a green gate as proof the artifact works | 1 (caught) | Yes — rule 73 exists precisely for this | Running the built server, not re-reading the config |
| Single-layer mutation treated as sufficient | 2 (both misleading) | No | Disabling every redundant layer simultaneously |
| Git Bash mangling paths/URLs/flags | 3 (URL, `taskkill /F`, `-o` path) | Yes — memory exists for `<rev>:<path>` | `MSYS_NO_PATHCONV=1` as a reflex on anything containing `/` |
| Acting before confirming shell cwd | 1 (`npm ci`) | No | Verifying cwd *and* the unrelated project's state immediately after |

The Git Bash class is the honest failure here: **it was already documented, and I
walked into it three times anyway.** The write-up did not prevent the repeat
because it was framed as a fact about one command shape (`<rev>:<path>`) rather
than a procedure. What works is procedural — *prefix `MSYS_NO_PATHCONV=1` on any
argument containing a slash* — not resolutional ("remember the Git Bash quirk").
That is the correction that survives.

## External-model calibration

None consulted. Zero paid spend. Every finding this session was reachable by
running code locally; a panel would have added cost and opinion where execution
supplied fact. **Routing note: for "does this artifact actually work" questions,
execution dominates consultation — reserve paid review for judgement calls, not
verifiable ones.**
