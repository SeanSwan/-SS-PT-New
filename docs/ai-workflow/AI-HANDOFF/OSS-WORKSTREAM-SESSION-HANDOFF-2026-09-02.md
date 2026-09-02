---
decision: Session handoff — next agent executes the EX-0..EX-6 blueprint verbatim, starting at EX-0
status: open
supersedes: none
---

# HANDOFF — OSS Workstream (SWA-225 / SWA-231) · 2026-09-02

**For:** the next agent (any seat) continuing this work. Read this, then the blueprint, then start EX-0. You should need nothing else and ask nothing.

## 1. Your single source of instructions

**`docs/ai-workflow/AI-HANDOFF/OSS-EXECUTION-BLUEPRINT-V2-2026-09-02.md`** — Fable-authored, zero-decision, self-hostile-passed. It contains, per slice: branch name, exact anchors, exact file contents, full test specs **each naming the mutation/negative control that must FAIL before green counts**, gates, rollback, and the Linear receipt requirement. §0 is the worker contract — obey it literally, especially: *anchor missing → STOP and report, never improvise* and *no test assertion weakened to reach green*.

**Start at EX-0** (backend triage + `test-gate.yml`, issue SWA-231). Order: EX-0 → EX-1 → EX-2 (parallel-ok) → EX-3 → EX-4 → EX-5 → EX-6.

## 2. Where everything is

| Thing | Location |
|---|---|
| Build worktree (ALL slice work happens here) | `C:/tmp/ss-forge-variantrun` — currently on `main` @ `4c2fd507e`, clean. Branch per slice off fresh `origin/main`. |
| Primary tree (docs/ORIENT/lane only — it is **2,300+ commits behind main; never build here**) | the SS-PT checkout this file lives in (the one your session opened) |
| Parent issue + full receipt trail | **SWA-225** (every slice so far has a comment there; keep that up) |
| EX-0's issue | **SWA-231** (the 23 failing backend files are enumerated in its description) |
| Audit + both GLM reviews + review packet | `AI-HANDOFF/OSS-COMPONENT-AUDIT-2026-08-31.md` (+ its §8/§9), `GLM-53-OSS-BLUEPRINT-REVIEW-2026-09-01.md`, `GLM-53-FLASH-OSS-BLUEPRINT-REVIEW-2026-09-01.md` |

## 3. State of the work

**SHIPPED to main and verified live:** multer 1→2 (+ trainer-photo `limits.files` fix), dead-code sweep (10 files + react-big-calendar's 16 packages), workout save-path emitter fix, shard-runner fix (runs ALL batches now), two line-cap extractions. Frontend suite fully green: 322/322 batches, 1606 files, 8169 tests.

**HELD — DO NOT MERGE:** branch `claude/stripe-client-factory-20260901` (commits `24ada896c`, `f2a442af1`). Superseded by EX-1 Phase A (it changes gallery payment behaviour; Phase A is behaviour-identical). After EX-1 merges, delete this branch and note the supersession on SWA-225.

**NOT STARTED:** all of EX-0..EX-6.

## 4. Verdicts you are executing under

GLM-5.3 + GLM-5.3-Flash: REVISE both (blueprint + slice 5). Fable (Final Decider): execution APPROVE, blueprint REVISE → the EX order; slice 5 → Phase A. Every reviewer claim that could be checked was checked: notable disproofs — the webhook does NOT double-grant (fulfilment-keyed idempotency, `stripeWebhook.mjs`), stripe 17.7.0's SDK default really is `2025-02-24.acacia`, no hidden 20th Stripe construction. Confirmed and already fixed: success-only memoisation. Confirmed and folded into the blueprint: quarantine-by-rename for load-failures, ESLint construction ban, glob-derived-guard principle.

## 5. Hard-won environment gotchas (each cost this session real time)

1. **Spend-guard hook** blocks `node -e`, inline heredoc interpreters, and `VAR=x timeout node …`. Write scripts to files, invoke `node <file>` plainly, env set inside the script. Commit messages via `git commit -F <file>` — heredoc bodies get parsed as shell.
2. **ORIENT gate** (primary tree): PROOF field ≤240 chars, must contain a checkable token (`N/M`, `exit 0`, a path WITH a slash, or a sha **on the primary branch** — worktree shas are invisible to it and will be rejected).
3. **Lane ritual** (Rule 67): `node scripts/lane.mjs claim` before edits, `release` after; check who holds locks at session start; another agent ships to main **hourly** — re-fetch + rebase before every push, re-verify anchors after every rebase.
4. **GLM seat** (`scripts/consult-glm.mjs`): $0 (Z.ai coding plan); single-flight lock — if BLOCKED with a pid, check the pid is alive and WAIT, never seize. Output records Requested/Served model — check it.
5. **Backend tests all run inside a global stripe mock** (`tests/setup.mjs:57`) — you cannot assert real-SDK behaviour in vitest; assert what the factory PASSES (constructor spy).
6. **`npm run type-check` OOMs at its hardcoded 8GB** — run tsc with `--max-old-space-size=14000+`. Pre-existing, not yours.
7. **Windows argv limit**: don't pass 100+ file paths to vitest; use patterns. **Empty command output is a failure signal** — check exit codes and run a positive control before believing any "no results".

## 6. The discipline (why this workstream held up)

One failure mode caused every error caught this session, mine and the reviewers': **a measurement believed without checking what it measured**. The standing rule: *name the instrument, prove it can fail, then believe it* — and **verify the scariest claim first; it's usually the cheapest check**. The blueprint operationalises this: no green counts until its named control has been watched to fail.

## 7. Sean-pending (do not block on these; slot them when they arrive)

- **Stripe dashboard webhook endpoint API version** (his 2-minute action, may already be done — ask once): goes into EX-2's doc; gates Phase B.
- Sentry DSN → Render env (EX-4 activates itself when it appears).
- BullMQ flag-on (EX-3): only after the survive-restart proof + 48h flag-off deploy.

## 8. Closeout rituals per substantial turn

ORIENT block (rendered, `--pid oss-audit`), Linear receipt on SWA-225/SWA-231, Hermes inbox memo **with a literal `## Mistakes I made` section**, lane release. Batch-push cadence (Rule 70): commit per slice, push when the slice's gate says MERGE.
