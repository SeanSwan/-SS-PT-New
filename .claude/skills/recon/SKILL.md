---
name: recon
description: Pre-audit reconciliation — find work that never reached production before auditing or launching. Answers "what have I written that isn't live, is any of it real, and what should happen to it?" Use before any security/quality audit, before launch, or when Sean says "recon", "what didn't get pushed", "did anything get left behind", "/recon". Read-only; recommends, never merges or deletes.
---

# recon — pre-audit reconciliation

## Why this exists

Audits read `origin/main`. Work that never shipped is invisible to them. So an audit can
(a) describe code that a stranded branch already fixed, and (b) miss a vulnerability that
exists only in unpushed work. Both are silent.

## The two traps — read before trusting any number

Branch "ahead" counts lie in **two distinct ways**. Both measured on this repo 2026-08-15.

**Trap 1 — squash-merge inflation.** `claude/store-inquiry-button` reported `[ahead 68]`;
`git cherry` found **1** genuinely-absent commit. 67 landed via squash-merge.

**Trap 2 — wrong target entirely.** `claude/equipment-p0-safety` reported `[ahead 77]`.
Its merge-base with `origin/main` **is its own tip** — an ancestor, **0 ahead**, fully shipped.
The 77 measured distance from `origin/<branch>`, the branch's own remote copy.

Trap 2 is worse: trap 1 is an overcount, trap 2 is a **category error** — a number measuring a
relationship nobody cares about, while looking exactly like the one they do. Any branch whose
remote copy is stale reports "ahead" forever, shipped or not.

> **Law: `%(upstream:track)` is display-only. Every equivalence question is asked against
> `origin/main` explicitly.** The engine enforces this; do not reintroduce it in analysis.

Live measurement on this repo: git reported **433 "ahead" commits across 32 branches**;
**179** were genuinely absent. **281 of 409 branches were already live.**

## How to run

```bash
git fetch origin                                    # required; engine hard-fails on stale base
node scripts/recon-scan.mjs                         # report to stdout (~17s for 409 refs)
node scripts/recon-scan.mjs --deep 25               # deep-confirm more finalists
node scripts/recon-scan.mjs --json c:/tmp/recon.json
node scripts/recon-scan.mjs --out docs/ai-workflow/AI-HANDOFF/RECON-<date>.md
```

The engine is deterministic and makes **zero model calls**. Judgment happens here, in the
skill, on the engine's finalists only.

## Safety — non-negotiable

- **Read-only.** Never merge, push, rebase, checkout, branch -d, stash push, or reset.
- `git stash create` is permitted (dangling commit; tree and stash list untouched).
  Plain `git stash` is **forbidden** — it disturbs a live session.
- **Never delete.** "Archive" = tag/bundle/pointer. The forbidden phrases from the repo
  constitution apply: no "safe to delete", no "nothing to lose".
- **No verdict from this engine authorises a merge.** `genuine-upgrade` requires the Phase-3
  evidence pass and per-item human approval.

## Reading the report

Verdict markers: `[ARCHIVE]` already live · `[PUSH]` upgrade candidate · `[HUMAN]` needs your
call · `[RISK]` regression suspected · `[PARK]` incomplete/experimental · `[IN-FLIGHT]` active.

**The sensitivity floor.** Any branch with genuinely-absent content touching
auth/admin/payment/cart/checkout/webhook/session/security escalates to `[HUMAN]` and can
**never** receive an archive-class verdict, regardless of age or how far behind it is.

This exists because the first live run labelled `claude/fix-hr007-storefront-special-leak`
— 3 absent commits touching `cartRoutes.mjs` and `v2PaymentRoutes.mjs` — as
`[ARCHIVE] unmergeable-by-cost`. The guard was written and never wired in. A skill that
retires a money-path security fix because it is old is worse than no skill.

## What it does NOT do

- Does not judge whether a change is *correct* — only whether it **shipped**.
- Does not scan reflog orphans (weekly deep pass; reported in NOT EXAMINED every run).
- Does not triage the working tree file-by-file. 400+ dirty files is **one** item with a
  preservation pointer and a "dedicated session required" verdict.
- Does not claim coverage it doesn't have. Every run prints NOT EXAMINED.

## Before an audit

Attach the AUDIT DELTA block to the audit request. It names the files where findings may be
stale and where unaudited risk exists. Without it the audit silently describes partial reality.

## Known limits

- Every equivalence failure mode points toward **false "absent"** — squash-merge defeats
  `git cherry`, context drift defeats reverse-apply. Expect over-reporting, never
  under-reporting. Erring toward human review is the correct direction.
- `git stash create` can fail (index lock held by a parallel agent). The report says
  **SNAPSHOT FAILED** loudly; it must never render a preservation failure as silence.
- Deep confirmation runs on top-N by rank only. Everything else is ranked, not proven.

## Related

`drift-check` is the inverse (am I behind?). `agent-lane` supplies in-flight locks.
`push-blast-radius.mjs` is the only path from a recommendation to an actual push.
Design record: `docs/ai-workflow/AI-HANDOFF/RECONCILE-SKILL-FUSED-SPEC-2026-08-15.md`.
