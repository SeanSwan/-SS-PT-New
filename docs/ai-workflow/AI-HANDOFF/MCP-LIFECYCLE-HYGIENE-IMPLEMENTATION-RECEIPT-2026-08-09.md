# MCP Lifecycle Hygiene — Audit-First Implementation Receipt

**Purpose:** Record the exact implementation boundary, safety posture, test delta, and future enforcement gate.  
**Author:** Codex  
**Last updated:** 2026-08-09  
**Status:** Audit-first build verified in isolated worktree; two independent hostile reviews CLEAN.  
**Branch:** `codex/mcp-lifecycle-hygiene-20260808`  
**Base:** `2bff04487`  

## Plain-English Summary

The project now has an MCP lifecycle hygiene system that is installed in audit
mode. It can inventory managed processes, record which Claude session claimed a
canonical Playwright tree, diagnose stale or ambiguous state, and clean its own
bookkeeping safely. It cannot terminate an MCP process in the installed mode.

This addresses the original concern without pretending that an idle MCP process
continuously spends tokens. Processes consume machine resources; tool schemas,
instructions, resources, and outputs consume context. Disabling unused tools
before a fresh task is still required to reduce future context exposure.

## Technical Summary

- `.claude/settings.json` invokes `mcp-lifecycle-hook.ps1` with `-Mode audit` for
  both SessionStart and SessionEnd.
- The Windows wrapper takes a host-global state mutex before exact-owner mutexes
  for every state mutation and places each Node worker in a kill-on-close Job
  Object. A regression kills the coordinator and proves its disposable worker exits.
- SessionStart uses a split publish/register protocol. Pending claims carry an
  exact holder PID/creation time, expiry, and nonce; stale claims are quarantined
  only after same-generation and dead-holder proof.
- Active leases, pending claims, dirty latch, journal, and tombstones are stored
  separately with atomic writes, strict schemas, count/byte bounds, and PID-scoped
  test roots. Inactive evidence and pending quarantine rotate at a strict bound.
- SessionEnd audit writes and reads back an owner-generation tombstone before
  removing the ended lease. Same-owner sessions coalesce root evidence, and the
  record is pruned only after exact owner and root generations are proven gone.
- The mechanically sealed enforcement implementation would write the dirty latch before release,
  uses one absolute deadline with a final-verification reserve, and clears the
  latch only after a complete release result and durable journal receipt.
- `status` and `doctor` return sanitized counts only. Coordinator-routed rearm
  requires dirty state to be the sole remaining condition and journals before clearing.
- The declarative registry can classify exact launch shapes but cannot grant
  mutation authority. A private code allowlist contains only `playwright`.
- Manual `release` remains preview-only. Codex and POSIX remain audit-only.
- The wrapper accepts only audit mode and the runtime enforcement constant is
  false, so forged coordinator input cannot reach process mutation in this revision.

## Test Delta Disclosure

| File | Change | Classification | Reason |
|---|---|---|---|
| `mcp-lifecycle-runtime.test.mjs` | Added mode, coordinator, dirty, and deadline gates | behavior-hardening | Proves audit default and absolute budget semantics. |
| `mcp-lifecycle-state.test.mjs` | Added transaction, tombstone, pruning, and rearm cases | behavior-hardening | Proves failure-state ordering and recovery. |
| `mcp-lifecycle-claims.test.mjs` | Added publication-time and concurrency claim cases | behavior-hardening | Prevents pre-existing or quarantined roots from being adopted. |
| `mcp-lifecycle-doctor.test.mjs` | Added dirty, stale, ambiguous, and rearm classifications | behavior-hardening | Proves sanitized fail-closed diagnosis. |
| `mcp-lifecycle-evidence.test.mjs` | Added bounded inactive-evidence rotation | behavior-hardening | Prevents evidence and quarantine storage growth. |
| `mcp-lifecycle-receipts.test.mjs` | Added explicit audit/would-release receipt case | behavior-hardening | Prevents a false-clean cleanup claim. |
| `mcp-lifecycle-pending.test.mjs` | Added nonce/holder/expiry cases | behavior-hardening | Proves stale pending quarantine is race-aware. |
| `mcp-lifecycle-locks.test.mjs` | Added live safe-worker and crash-fencing probes | behavior-hardening | Proves coordinator death cannot orphan its worker. |
| `mcp-lifecycle-registry.test.mjs` | Added exact grammar and authority separation | behavior-hardening | Prevents data-driven mutation expansion. |
| `mcp-lifecycle-storage.test.mjs` | Added file count-bound probes | behavior-hardening | Oversized state fails closed. |
| Existing manager/race/contract tests | Extended assertions; no skips or deletions | behavior-hardening | Locks integration and hostile process races. |

No production assertion was deleted, skipped, widened, or re-anchored to make a
failure disappear.

## Verification Evidence

- `node --test scripts/mcp/*.test.mjs`: 75 passed, 0 failed, 0 skipped.
- Every MCP `.mjs` passed `node --check`; the PowerShell wrapper passed AST parsing.
- Claude settings JSON, skill registry/frontmatter, skill mirror hashes, and the
  generated AGENTS/CLAUDE mirror passed deterministic validation.
- All new runtime, test, skill, plan, and index files are at or below 300 lines;
  `git diff --check` passed.
- Two independent hostile reviewers returned CLEAN on the settled snapshot. One
  reran 75/75 including the disposable Job-child crash test; the other ran 72/72
  non-terminating tests and reviewed the three wrapper tests/source contract.
- No live hook, MCP termination, or production lifecycle-state mutation occurred.

`DRY-LOOP: CLEAN×2`  
`PROOF: 75/75 lifecycle tests; deterministic gates pass; hostile CLEAN×2.`

## Enforcement Gate

Audit-to-enforce is a separate code and configuration change. It requires all of the following:

1. Full deterministic verification on the exact revision.
2. Two independent CLEAN hostile reviews.
3. A fresh, separately approved paid Kimi review that returns APPROVE for the
   exact revision and binds its packet/output receipt.
4. Sean's explicit approval to change the wrapper/runtime seal and installed hooks.

Until then, `-Mode audit` is the hard installed rollback barrier. No commit,
push, merge, or deployment is authorized by this receipt.

## Hygiene

The build created only scoped source, test, skill, plan, review, receipt, and
Hermes handoff artifacts. Disposable crash-test directories are removed by test
cleanup. No screenshot, root temp log, credential, live lease probe, or process
termination artifact was added.
