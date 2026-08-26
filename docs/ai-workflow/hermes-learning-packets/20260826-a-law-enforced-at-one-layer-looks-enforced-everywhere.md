---
name: a-law-enforced-at-one-layer-looks-enforced-everywhere
title: One licence law, five doors — each fix guarded a field and the material arrived through a different field, or through no field at all
originating_model: claude-opus-5
tier: fable
tier_gate: PASS
tier_basis: Opus 5 designated Fable-tier by Sean 2026-08-10; acting Final Decider in Fable's absence
date: 2026-08-26
decision: When a law is broken once, sweep every LAYER that law touches, not the layer the bug was found in. And write every guard's test as a negative — prove it refuses — because a guard that cannot fire passes every positive test.
status: current
reviewed_by: GLM 5.3, Ox Alpha, Kimi K3, HY3, Qwen 3.8 (four hostile rounds)
supersedes: none
surface: swan-taste-brain (LOCAL repo, no remote — holds a third-party copyrighted corpus)
commit: 8a4038f, 10a84ee, f9a8343, e61773e
board: SWA-186
models_used:
  - model: claude-opus-5
    role: builder, Final Decider, arbiter
    did: built the packets, reproduced every claimed defect before fixing, wrote 66 regression checks, refuted two findings, deferred one product call to Sean, and shipped two of its own defects that the panel then caught
    cost: subscription
  - model: glm-5.3
    role: hostile reviewer (rounds 3, 4)
    did: 11 findings, 2 P0 — the corpus style-code leak in generation and the CORS read channel. Strongest single reply of the four rounds. Every substantive finding verified real
    cost: $0 (Z.ai subscription)
  - model: stealth/ox-alpha
    role: hostile reviewer (rounds 3, 4)
    did: found door 3 and door 5 alone, and BOTH instances of the inert-guard class. Its "what I checked and found sound" sections were the most useful artefact of the whole review — they stopped later rounds re-walking closed doors
    cost: $0
  - model: moonshotai/kimi-k3
    role: hostile reviewer, ONE call by Sean's standing rule
    did: found door 4 (the compiler's output) plus the sref bypass of the fix directly above it. Aimed at the ALREADY-FIXED code rather than the original, which is why it found what four seats had walked past
    cost: $0.157
  - model: tencent/hy3
    role: hostile reviewer
    did: 2 usable server findings; its VERDICT was a scope error — applied SwanStudios React house rules (MUI/Victory/palette/44px) to a standalone local Node tool with no React
    cost: $0.016
  - model: qwen3.8 (local)
    role: hostile reviewer, free seat
    did: 2 findings — one self-refuted inside its own answer, one (arbitrary command execution via execFileSync) refuted on verification: the call passes an argv array, so no shell is involved
    cost: $0 (local 5090)
skills_touched:
  - id: instrument-check
    change: reinforced
    failure: a thin-pool regression test used a fake CDN host that isRenderable() rejects, so it ran on zero candidates and "passed" while proving nothing. Once the host was real it reproduced the defect at 38 of 60 grids
  - id: rule-73 (proof-before-done)
    change: reinforced
    failure: nine suites passed 404/404 both BEFORE and AFTER twenty defects existed. A green suite proved nothing because no test covered any of them; only a regression file that fails on the pre-fix code is evidence
  - id: rule-44/59 (secret and data discipline)
    change: extended
    failure: the repo had a law that tests must never write the real ComfyUI workflow path. The law existed for one file. A new test wrote 10 KB into Sean's real taste/kept.md
---

# A law enforced at one layer looks enforced everywhere

## What happened

A local creative tool learned a second user (the owner's partner). It holds a **third-party
copyrighted corpus** the owner subscribes to, under one law: *the corpus is the owner's alone — never
a partner, a client, a bundle, or a printed brief.*

Two hostile panels had already run during the build. Both ran **before the second half of the code
existed** — the second attacked a contract on *paper*. Four more rounds, aimed at what had never been
read, found **twenty defects**, and **five of them were the same law broken in five different layers**:

| # | Layer | How the corpus arrived |
|---|---|---|
| 1 | generation | `chooseSref()` ran unconditionally; the own-material guard covered subjects and artists but not style codes — **6 of 6** prompts carried one |
| 2 | the read API | `access-control-allow-origin: '*'` made every read cross-origin readable to any page in the owner's browser |
| 3 | the event writer | candidates could declare `provenance: 'midlibrary-reference'` |
| 4 | the compiler's output | `tally()` bumped style codes regardless of witness, so her profile, avoid-list and printed brief carried them |
| 5 | the index join | a candidate declaring **nothing** passed validation, and the compiler back-filled `doc`, `prompt` and `provenance` **from the corpus image index** |

Each fix made the next layer look safe. The author's own headline lesson from the build session had
been *"for any feature serving more than one user, print what it produces for the other user before
believing it works"* — and it was applied to **prose** (subjects, artists) and stopped there. A style
code is corpus material too. So is a tally. So is an index join.

## The transferable rules

**1. When a law is broken once, sweep every layer that law touches.** Not the layer the bug was
found in. List where the material can enter — generate, write, read, compile, export, import, serve
— and check each. Five rounds of review to find five instances of one law being half-enforced is the
cost of not doing this once.

**2. Absence is not innocence.** Every guard was written `if (field !== undefined) refuse(...)`, so
the way through was to send no field at all. A candidate carrying only an `id` passed all of them,
and the join supplied the rest. When validating untrusted input, **require the safe value; do not
refuse the unsafe one.**

**3. A guard needs a test that fails when the guard is removed.** The same `--sref` check shipped
unable to fire **twice**: first with a literal backspace (`0x08`) where `\b` was meant — written
through a heredoc that ate the escape, with the interpreter's `SyntaxWarning` visible in the output
and ignored — and then anchored `\s--sref`, which cannot match a prompt that *starts* with the flag.
Both were caught only because the check was written as a negative ("prove it refuses"), never a
positive. A positive test passes just as happily against a guard that does nothing.

**4. Spend the expensive call on the fixed code, not the original.** Kimi had one call by standing
rule. Aimed at the state *after* four seats' findings were fixed, it found a door all four had walked
past — because it was the only seat looking at what the fixes had left behind. The cheapest finding
in a review is the one the previous reviewer already made.

**5. A containment fix that blocks the legitimate case is not the smaller bug.** Two first cuts were
too broad: banning every style code broke judging her own renders; banning every `--parameter` broke
keeping an ordinary generated prompt. Narrow scope is part of the fix, not a follow-up.

## Mistakes I made

- Shipped an inert guard **twice in the same guard** (backspace, then wrong anchoring). Ignored a
  visible interpreter warning that named the exact cause.
- Made two fixes too broad and broke two working features; the suites caught both.
- Wrote a test that appended 10 KB to the owner's **real** taste file, because the repo's
  "tests never write production" law had been written for one specific file rather than as a class.
- Wrote a regression test that passed on an **empty set** — a fake CDN host meant it ran on zero
  candidates. It only reproduced the defect (38/60 grids) after the instrument was fixed.
- Left throwaway test namespaces on disk twice, both times after a suite aborted mid-run.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before it recurred? | What finally stopped it |
|---|---|---|---|
| A guard that cannot fire | **2** (backspace `\b`; `\s` anchoring) | Yes — the first was documented in a commit message, then the same guard shipped broken again | A **negative test per guard**, plus a repo-wide sweep for stray control characters (51 files, clean). Procedural, not resolutional |
| Fix too broad, breaks a working flow | 2 | No | The existing suites caught both. The durable fix is to run the full suite before believing a containment change |
| Test proves nothing (vacuous / wrong cwd / wrong host) | 3 | Partly — "validate the instrument" was already a standing memory | Stash the fix, re-run the test, and require it to FAIL. Nothing else detects a vacuous test |
| Test writes production data | 1 | The law existed, scoped to one file | Snapshot-and-restore in `finally`, unconditionally |

The repeat that matters is the first row. It was written up in a commit message after the first
occurrence and happened again in the same guard within the hour — which proves the write-up was not
the fix. The correction that survived is procedural: **every guard gets a test asserting refusal,
and escapes never go through a heredoc.**

## Who did what

**Ox Alpha ($0) out-performed both paid seats on depth** — it found two of the five doors alone, and
both inert guards. Its "what I checked and found sound" section is the single most reusable artefact
here: it names the attacks that failed, so later rounds stop re-walking closed doors. **Require that
section from every hostile seat.**

**GLM 5.3 ($0)** gave the strongest single reply — 11 findings, 2 P0, each with a concrete input.

**Kimi K3 ($0.157, one call)** earned its cost by being pointed at the fixed code.

**HY3** was right on details and wrong on scope: it returned REVISE because it could not verify
SwanStudios React house rules against a tool that contains no React. **A reviewer given the wrong
rulebook will return a confident verdict against rules that do not apply.**

**Qwen 3.8 (local, free)** produced one self-refuting finding and one that verification refuted.
Worth keeping in every panel at $0, never as the lead voice — which matches the standing rule.

**Total: ≈$0.17 for twenty defects**, most of it found by seats that cost nothing.
