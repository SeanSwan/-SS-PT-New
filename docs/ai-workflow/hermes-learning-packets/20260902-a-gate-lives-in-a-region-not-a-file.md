---
name: a-gate-lives-in-a-region-not-a-file
date: 2026-09-02
originating_model: claude-fable-5-1
tier_gate: PASS
models_used:
  - model: claude-fable-5 / builder / built Phase 0.0-0.4 (30 commits, all gates green) and placed the boot gate in the wrong region / subscription
  - model: claude-fable-5-1 / hostile reviewer + spec author / found 3 defects in the 5.0 work cold; wrote blueprint v2 / subscription
skills_touched:
  - id: startupApprovalGatesPreListen.test.mjs / created / a boot gate that was decorative for a full session
  - id: destructiveScopeLawRegistry.test.mjs / created / a scope law hand-typed from memory of five commands
---

# A gate lives in a region, not a file

## The lesson
Fable 5.0 added a boot gate — "refuse to listen without OPERATION_SIGNING_KEY" — to
`core/startup.mjs`, next to a sibling guard, ran the suite green, and wrote in the
closeout that a keyless deploy "fails before listen". It did not. That file has two
regions: a critical pre-listen section whose throws exit the process, and a
non-critical background block that runs AFTER "Server is LISTENING" inside a catch
that logs "Server continues running". The gate was placed in the second region. It
threw, was logged, and the server served requests anyway. Nothing red appeared,
because no test asked WHERE the gate lived. **A gate's guarantee is a property of
its enclosing catch, not of its file. Before claiming any boot/startup property, read
the catch that wraps the call — and pin the placement with a source-order test, so
the next refactor that moves it cannot move the guarantee silently.**

## Who did what
5.0 built correctly-behaving code in the wrong region and then claimed the property
in prose. 5.1, reading the same file cold with the question "what wraps this?",
found it in one `awk` over the try/catch lines. Same tier, different question. The
second finding (the scope law hand-typed from memory of five commands, refusing
three real ones) has the same shape: a law about a registry that was never derived
from the registry.

## Skills created or changed
Two structural tests: source-order for the gates; registry-derived for the scope
law (it unwraps ZodEffects, because a naive shape probe read `lock_client` as empty).

## Mistakes I made
- (5.0) Claimed "fails before listen" without reading the enclosing catch. The claim
  stood a whole session and went into a Linear closeout.
- (5.0) Hardcoded five scope keys; my own verification probe misread transform-wrapped
  schemas as keyless and I nearly trusted it.
- (5.1) A 140-line bash heredoc failed on quoting; write-then-run is the shape for
  anything past ~40 lines.

## Error → fix → repeat ledger
- claim-without-reading-the-wrapper: 1 occurrence (5.0), caught by 5.1 cold read.
  The corpus already holds "exists ≠ renders/works" — this is its boot-time twin:
  "called ≠ enforced". Fix that survives: region-naming in every gate card + the
  source-order test.
- law-from-memory-not-registry: 1 occurrence, caught by a registry-derived test on
  its first run. Fix that survives: any allowlist about a registry is generated or
  tested against it, never typed.

## External-model calibration
None consulted. The relevant calibration is intra-family: a second Fable-tier pass
over 30 green commits found 3 real defects (1 P0-class). Green is not a review.
