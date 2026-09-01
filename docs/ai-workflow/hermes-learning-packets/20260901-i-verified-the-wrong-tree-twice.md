---
title: "I verified the wrong tree — a scoped diff that comes back clean is not freshness"
packet: i-verified-the-wrong-tree-twice
date: 2026-09-01
originating_model: claude-fable-5
tier: fable-tier
tier_basis: "claude-fable-5 is the running session model (Fable 5, Final Decider); provenance first-hand"
surface: PLAUD rebuild blueprint; audit methodology; branch-freshness discipline
decision: "Freshness is proven by diffing the FILES YOU WILL CITE against origin/main — not by a name-filtered diff of the feature's own directory. And a 'verified' tag carries the SHA of the tree it was verified on."
privacy: "No secrets, no client data. Paths, SHAs, and rule ids only."
models_used:
  - model: claude-fable-5
    role: v1 blueprint author (the error), v2 adjudicator (the correction), Final Decider
    did: "Wrote v1 with [VERIFIED] F1/F2 findings that were true only on a branch 2,318 commits behind main; built and committed a Slice-1 fix refactoring a function main had deleted; then re-mapped origin/main via worktree, withdrew both diagnoses, corrected the external review's own errors, and produced the unified v2"
    cost: subscription (flat rate)
  - model: gpt (ChatGPT-Pro seat, Sean-driven)
    role: hostile reviewer of v1
    did: "Caught the stale baseline and the two stale headline findings; supplied the canonical-adapter/outbox/4-level-capture corrections. Its own errors: recommended building on BullMQ (dead infrastructure on main — zero init callers), called a public-preview model GA, and its quoted main SHA was itself stale within hours"
    cost: subscription (Sean's seat)
skills_touched:
  - id: verify-branch-freshness-before-audit (existing memory)
    change: REPEATED after write-up — sharpened with an executable form
    failure: "The lesson existed in the memory index AND the drift-check hook fired at session start ('2,311 commits behind — verify against origin/main before auditing'). I still audited the working tree, because my freshness check was a diff filtered to plaud-NAMED files, which came back 9 lines. The controller and service I then cited live outside that name filter."
  - id: rule-54 (sibling-sweep grep evidence)
    change: extended to freshness checks
    failure: "Sweeps fail by under-scope. So do freshness diffs. The check that matters: git diff origin/main -- <every file you are about to cite>, not <the feature's naming pattern>."
  - id: rule-51 (confidence tags)
    change: sharpened
    failure: "[VERIFIED] without a tree SHA is a claim about an unstated universe. v2 tags are [MAIN-VERIFIED @ SHA] and the builder must re-pin."
---

# I verified the wrong tree — a scoped diff that comes back clean is not freshness

The v1 blueprint's two CRITICAL findings — a guaranteed FK violation and an unhandled source
string — were re-verified by my own file reads, probed read-only against the production DB, fixed
with failing-first tests, and committed. Every step of the discipline ran. And both diagnoses were
wrong about the system being rebuilt, because every step ran against a tree 2,318 commits behind
origin/main. Main had already replaced the write service (`submitAiWorkoutLogAsDailyForm`, real
`formId`) and normalized the source string. My Slice-1 fix refactored a function main had deleted.

## The mechanism of the miss

I did check freshness. That is the point of this packet. The check was:

    git diff --stat origin/main...HEAD -- backend/controllers/plaud backend/services ... | grep -iE 'plaud'

Nine changed lines in plaud-*named* files → "PLAUD backend verified byte-identical to origin/main."
But the approval seam lives in `adminWorkoutLoggerController.mjs` and `workoutLogService.mjs` —
inside the diffed directories, OUTSIDE the name filter. The 454-file, 35k-line divergence was in the
output and the grep threw it away. A freshness check that filters by the feature's naming convention
answers "did the plaud-named files move?" — not "is what I am about to cite current?"

Two independent warnings were live and ignored: the memory index line "Verify branch freshness
first," and the session-start drift-check hook stating the exact commit gap with the exact
instruction. A warning that fires every session becomes wallpaper; only an executable step survives.

## The executable correction (what stopped it)

Before citing any file in an audit: `git fetch && git diff --stat origin/main -- <each file you
will cite>` — the cite list, not the feature glob. Any nonzero diff → map that file from a worktree
of origin/main (cheap: `git worktree add <scratch> origin/main --detach`), and stamp every verified
claim with the SHA of the tree it was read from. v2 encodes this as builder rule #1 (re-pin +
re-verify at build SHA).

## Who did what

The external GPT seat caught what my process missed — and was itself wrong three ways (BullMQ is
dead infrastructure on main with zero init call sites; "GA" for a public-preview model; its own
"current main" SHA superseded within hours). Verification cut both directions in the same pass:
both prior plans also missed six stranded side-effect classes in the compensating deletes, the
missing DB uniqueness behind both one-per-day guards, and a canonical-writer path that can destroy a
client's self-logged workout. No seat gets trusted; every seat gets diffed against the tree.

## Skills created or changed

Rule-51 practice: `[VERIFIED]` is now `[<TREE>-VERIFIED @ <SHA>]` in blueprint work. Rule-54
extended: freshness diffs are sweeps and fail the same way — scope them to the cite list.

## Mistakes I made
- Repeated the branch-freshness lesson AFTER it was written up and AFTER a deterministic hook restated it this very session — the single highest-signal entry here. The fix that survives is procedural (diff the cite list), not resolutional ("heed warnings").
- Under-scoped the freshness diff to plaud-named files (rule-54 class) and promoted its clean result into a byte-identical claim covering files it never examined.
- Committed a production fix (branch Slice 1) before the freshness question was settled; the work is sound engineering against a deleted function. Marked DO-NOT-MERGE in v2 §1.4.

## Error → fix → repeat ledger
- Stale-baseline audit: recurred 1× this session against a pre-existing written-up lesson + a live hook warning (repeat count is the signal). Stopped by: external review naming it + worktree re-map. Surviving fix: cite-list diff + SHA-stamped verification tags + v2 builder rule #1.
- Name-filtered sweep under-scope: second occurrence of the rule-54 class in this project's corpus. Same surviving fix.

## External-model calibration
- **ChatGPT-Pro seat:** ~16 findings adopted (stale baseline, canonical adapter, H4 catch/rollback, receipts, 4-level capture, plan pins, idempotent replay, evidence spans, shadow attribution, consent multi-speaker hole, devicePrincipal, R2 correction, append 3-case, dedupe-by-duration ban, retirement discipline, branch protection). 3 disproven/corrected on verification (BullMQ recommendation vs dead infra; GA vs public preview; its stale main SHA). Routing lesson: this seat is strong on architecture-level review of a written plan against a repo it can browse; verify its infrastructure recommendations against runtime reality (an installed dependency is not a running system).
