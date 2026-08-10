# MCP Lifecycle Hygiene — Exact-Snapshot Kimi K3 Commit-Gate Packet

**Purpose:** Request one hostile Kimi K3 verdict on the audit-first implementation before feature-branch commit and push.  
**Author:** Codex  
**Date:** 2026-08-09  
**Requested model:** `moonshotai/kimi-k3`, high effort, one call, no retry  
**Output ceiling:** 60,000 tokens  
**Hard spend cap:** $1.25  
**Repository state:** uncommitted isolated worktree; nothing from this slice is active on `main`

## 1. Required Verdict

Act as the final hostile systems reviewer. Return exactly one leading verdict:

- `APPROVE` — the audit-first feature branch is honest and safe to commit/push;
- `REVISE` — at least one material defect blocks commit/push; or
- `REJECT` — the architecture is unsafe or counterproductive.

Do not approve future process enforcement. This gate covers the current audit-only
revision. Rank findings P0-P3 and provide a concrete event sequence, violated
invariant, affected contract, and smallest safe correction. Repository tests and
owner approval remain authoritative.

## 2. Exact Snapshot Binding

- Branch: `codex/mcp-lifecycle-hygiene-20260808`
- Base commit: `2bff04487`
- Canonical manifest: sorted `path<TAB>SHA-256` for every modified/untracked file
- Combined manifest SHA-256:
  `f891b5aabb975b70f35e815d43fa9ed36d9a762f6a9c15eb59f0dd8d131e7212`

Critical file hashes:

| File | SHA-256 |
|---|---|
| `scripts/mcp/mcp-lifecycle-manager.mjs` | `a5c9bc59e054ebf07d5f70dfb61802bd9a2158d571e6ff56d3286f39fb33c41a` |
| `scripts/mcp/mcp-lifecycle-runtime.mjs` | `7a5d483dedd66d02f5ad40a3640180c41927cf58c1cec305d7e0c3ec273216ff` |
| `scripts/mcp/mcp-lifecycle-hook.ps1` | `7d4ce963eb32d0c921a34b13e30b93598412718462b3f6b0007f036182a2dc46` |
| `scripts/mcp/mcp-lifecycle-core.mjs` | `fb499ec832776a611ed6747ca024ce135ca7d9ba1f40cf1f7b6d6a087ac2923f` |
| `scripts/mcp/mcp-lifecycle-release.mjs` | `3e43b7a80d0117a4c1492f6d406ed5f4f085a1f9ff8b86ce4b2aa89c23876830` |
| `scripts/mcp/mcp-lifecycle-leases.mjs` | `6fba3f3e4f8145aebf7eaa58995ca3efcb1a324955de7f417091fcf4dd768255` |
| `scripts/mcp/mcp-lifecycle-state.mjs` | `83597960c26bacfad01400eb28732809e6667627db3657426d163b8ed25f1bb3` |
| `.claude/settings.json` | `e48f85c9e9ceffdc567605c3130e550d542a4b503461dd1f2e3412228383afbe` |
| `.agents/skills/mcp-lifecycle-hygiene/SKILL.md` | `9783a0d084b1783d73fa48e3f87c0752899fd84d2713c87b95ecace46b32c247` |
| `CLAUDE.md` | `04afb0d4bdd0d0c3aa5e80042538c8ab4e69bd789a382ffa5ec50d092e67cef8` |

The new packet and eventual review/receipt are audit artifacts and are not part
of the bound implementation hash. Any implementation change after this call
invalidates the verdict and requires a new owner-approved review.

## 3. User Goal and Corrected Product Truth

Sean observed concurrent Claude/Codex tasks leaving local MCP processes open and
requested always-applied hygiene that does not harm another active task.

The implementation keeps three layers separate:

1. `configured`: a client knows the server;
2. `running`: a local process or remote connection exists; and
3. `exposed`: schemas, instructions, resources, or outputs entered model context.

An idle process consumes machine resources but does not continuously spend model
tokens merely by existing. Stopping it cannot reclaim context already loaded.
A skill is not a daemon; deterministic Claude SessionStart/SessionEnd hooks are
the installed lifecycle layer in this branch.

## 4. Current Trailhead — Audit Only

- `.claude/settings.json` invokes the project-root-qualified PowerShell wrapper
  with `-Mode audit`, 45 seconds at SessionStart and 60 seconds at SessionEnd.
- The wrapper parameter accepts only `audit`.
- Runtime exports `ENFORCEMENT_ENABLED = false`; the release predicate requires
  it to be true, so forged mode/confirmation/coordinator input cannot terminate.
- SessionStart publishes an expiring nonce/holder claim, then registers an exact
  Claude-owner lease and at most one uniquely proven post-publication Playwright root.
- SessionEnd audits the claimed plan, emits explicit `mode=audit` and
  `would-release=N`, transactionally tombstones ownership, then removes the lease.
- Manual `release` is preview-only. KEEP and rearm use the wrapper coordinator.
- Codex Desktop, POSIX, unknown shapes, remote servers, standalone children,
  user-launched processes, and ambiguous ownership are audit-only.
- No MCP configuration/authentication is removed or reset.

## 5. Concurrency and Crash Contract

The wrapper owns state mutation with this order:

1. host-global `global-state` Windows named mutex;
2. exact-owner lifecycle mutex; then
3. exact-owner startup mutex.

SessionStart publish uses global → startup, releases both, then registration uses
global → lifecycle → startup. SessionEnd and KEEP use global → lifecycle → startup.
Rearm uses global. The Node worker is assigned to a Windows Job Object configured
kill-on-close before hook JSON reaches stdin, and stdout/stderr drain asynchronously.
Coordinator death therefore releases mutexes and kills only its disposable worker.

Pending claims contain exact holder PID/creation time, publication/expiry times,
and nonce. Quarantine requires the unchanged nonce, expiry, and exact dead holder.
All worktrees share one host namespace. Another same-owner lease/pending claim or
owner-generation tombstone blocks a root claim and any future release boundary.

## 6. Process Ownership Contract

The only classified managed shape is the exact configured Windows Playwright tree:
canonical `cmd /c npx -y @playwright/mcp@latest` wrapper plus its attributable
child. Standalone/orphan children remain unmanaged. Registry data can classify
but cannot grant mutation authority; a private code allowlist contains only
`playwright`.

Owner and process identity require PID plus creation time. Every raw descendant
edge must have temporally valid ancestry. Release planning refuses any unclaimed
same-owner root. The dormant release executor rediscoveries before, immediately
before, and after handle-bound leaf-first termination; any identity change,
unknown creation time, new invalid descendant, survivor, respawn, deadline loss,
or concurrency change is incomplete/refused.

## 7. Persistent State Contract

- Active leases and pending claims are atomic, strict-schema, host-wide, and
  count/byte bounded. Malformed sibling state is ambiguity, never absence.
- The dirty latch is written before dormant enforcement; only a complete release
  plus a validated durable journal can clear it.
- Every prior journal row is parsed and allowlist-validated before append or doctor.
- Tombstones coalesce per exact owner generation, preserve up to 256 exact root
  identities, and prune only when owner and root generations are proven gone.
- Inactive evidence and pending quarantine rotate oldest validated regular files
  at 256. Active authority state never rotates silently.
- Status and doctor emit only fixed-schema counts. Receipts never contain raw
  PIDs, paths, argv, session IDs, environment values, headers, tokens, or credentials.

## 8. Prior Kimi REVISE — Repair Disposition

The first Kimi call returned REVISE. This snapshot repairs its accepted findings:

- audit-first rollout and fail-safe dirty latch;
- crash-safe OS mutex/Job coordinator instead of reclaimable lock files;
- nonce/holder/expiry pending claims;
- monotonic budgets dominated by hook timeouts;
- sanitized status/doctor/journal observability;
- code-owned mutation authority separated from registry data;
- future enforcement requires exact-revision Kimi APPROVE and Sean approval.

Local hostile rounds subsequently repaired stale inventory, PID reuse, invalid
descendants, taskkill tree expansion, standalone-child grammar, malformed leases,
cross-worktree concurrency, false-clean receipts, global-state races, manual lock
domain drift, unbounded inactive state, tombstone self-poisoning, and trailhead drift.

## 9. Verification Evidence

- Full lifecycle suite: 75 passed, 0 failed, 0 skipped.
- Two independent hostile reviewers returned CLEAN on the settled snapshot.
- Every MCP `.mjs` passed syntax; the PowerShell wrapper passed AST parsing.
- Settings JSON, skill registry/frontmatter, skill mirror hashes, CLAUDE/AGENTS
  generated mirror, all new-file 300-line caps, and `git diff --check` passed.
- The crash regression kills only a disposable Job-owned test child.
- No live lifecycle hook, real MCP termination, or production lifecycle state
  mutation occurred during build or verification.

## 10. Disclosed Limits

- Hook JSON and `SWAN_MCP_COORDINATED` are operational routing signals, not
  cryptographic attestation against a deliberate same-user caller.
- This is harmless for process mutation in this revision because two independent
  code gates make enforcement unreachable.
- Audit bookkeeping cannot guarantee cleanup after forced host exit.
- Claude ownership proof is Windows-specific. Codex lacks a task-scoped host
  primitive, so automatic Codex cleanup would be unsafe and is not implemented.
- Exact launch grammar may drift after package/client upgrades; unknown shapes
  remain unmanaged until tests and review are updated.
- Audit mode does not close MCP processes. It creates trustworthy evidence for a
  separately reviewed future enforcement revision.

## 11. Required Hostile Attacks

Try to disprove, at minimum:

1. the mechanical audit seal under direct/forged invocation;
2. global and exact-owner mutex ordering under two owners and two sessions;
3. pending/tombstone ABA, corruption, overflow, and crash recovery;
4. PID/PPID reuse, missing creation time, temporal ancestry, and new descendants;
5. same-owner cross-worktree or resumed-session ownership;
6. journal/evidence rotation, malformed retained state, and false-clean receipts;
7. timeout/clock rollback and coordinator death;
8. metadata/docs claims versus what is actually installed in this branch;
9. test-delta laundering, omitted negative cases, or tests encoding the defect;
10. whether commit/push of audit mode creates unacceptable operator risk.

## 12. Response Shape

1. Leading `APPROVE`, `REVISE`, or `REJECT`.
2. Blocking findings, most severe first, with event sequence and correction.
3. Non-blocking residual risks.
4. Explicit answers:
   - Is this exact audit-only snapshot acceptable to commit and push to a feature branch?
   - Is enforcement still mechanically unreachable?
   - Are Claude/Codex limits and context/token claims honest?
   - Does any finding invalidate the combined snapshot hash gate?

Do not request credentials, private state, raw process inventories, or another
model call. One response is the entire authorized review.
