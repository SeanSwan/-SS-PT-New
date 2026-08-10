# MCP Lifecycle Hygiene — Kimi K3 Hostile-Review Packet

**Purpose:** Give Kimi K3 an exact, sanitized safety and architecture packet for the unlanded MCP lifecycle guard.  
**Author:** Codex  
**Last updated:** 2026-08-08  
**Status:** Paid-review preflight candidate; repository truth remains authoritative.  
**AI Village validated:** Not run; this is a single Kimi K3 consult explicitly requested by Sean.

## 1. Required Reviewer Role

Act as a hostile systems reviewer, not a supportive editor. Try to disprove that
the proposed lifecycle guard is safe, useful, honest, and operable. Rank findings
`P0` through `P3`. A finding is actionable only when it names the violated
invariant, a concrete event sequence, the affected function or contract, and the
smallest safe correction. Separate proven defects from speculative hardening.

Then produce an enhanced implementation plan with independently shippable phases,
acceptance criteria, rollback criteria, tests, observability, and explicit
Claude-versus-Codex limits. It is acceptable to recommend that a mutation path
remain audit-only when ownership cannot be proven.

## 2. User Goal and Product Truth

Sean observed many concurrent Claude and Codex tasks leaving local MCP processes
open. He requested an always-applied skill/rule that keeps only task-needed MCP
servers and closes unnecessary ones without harming another active AI task.

Three truth layers must remain separate:

1. `configured`: an MCP server exists in client configuration;
2. `running`: a local process or remote connection is active;
3. `exposed`: schemas, server instructions, resources, or outputs entered model context.

An idle local process consumes RAM, handles, and possibly network resources. It
does not continuously consume model tokens merely by existing. Stopping a process
does not reclaim context already loaded into the current task.

## 3. Prior State Versus Proposed State

Prior state: individual MCP configuration and authentication existed, but there
was no general task lease, lifecycle skill, SessionStart/SessionEnd cleanup hook,
or cross-worktree concurrency guard.

Proposed state, currently uncommitted and not active on `main`:

- Rule 82 makes task-boundary MCP hygiene mandatory.
- Mirrored Claude/Codex skills require `KEEP: <names | none>` plus a sanitized audit.
- Claude `SessionStart` creates a host-wide validated lease and claims an exact
  managed root only when exactly one proven root is visible.
- Claude `SessionEnd` ignores task KEEP and releases every proven root claimed by
  that ended lease, but only when no sibling lease or pending start exists.
- Manual `release` is preview-only.
- Codex Desktop is process-mutation audit-only because multiple tasks may share
  one host process. Codex context control uses reversible configuration before a
  fresh task.
- Current automatic allowlist: Windows plus the exact configured Playwright MCP
  wrapper only.

## 4. Hard Safety Invariants

1. Never terminate another live agent's server.
2. Never mutate ambiguous, unclaimed, standalone-child, user-launched, remote, or
   unsupported server shapes.
3. PID alone is never identity; process creation time is mandatory.
4. Every raw descendant edge must be temporally attributable.
5. Every root claimed at SessionStart must be proven current or proven exited
   without attributable survivors in every release snapshot.
6. Any unclaimed same-owner root blocks mutation.
7. A pending same-owner SessionStart or sibling lease blocks SessionEnd cleanup
   across repositories and worktrees.
8. The immediate termination boundary binds every expected process handle and
   rechecks its start time before calling `.Kill()`.
9. Receipts contain counts and allowlisted labels only—never PIDs, argv, headers,
   environment values, session IDs, or credentials.
10. Any uncertainty returns an incomplete or refused result, never false-clean.

## 5. Hook Configuration

```json
{
  "SessionStart": [{
    "hooks": [{
      "type": "command",
      "command": "node \"${CLAUDE_PROJECT_DIR}/scripts/mcp/mcp-lifecycle-manager.mjs\" hook-start",
      "timeout": 45
    }]
  }],
  "SessionEnd": [{
    "hooks": [{
      "type": "command",
      "command": "node \"${CLAUDE_PROJECT_DIR}/scripts/mcp/mcp-lifecycle-manager.mjs\" hook-end --confirm",
      "timeout": 60
    }]
  }]
}
```

Hook JSON is an operational routing signal. It is not cryptographically attested
against a deliberate same-user caller who can read local state and forge input.

## 6. Exact Managed Process Grammar

`classifyMcpProcess()` tokenizes argv and recognizes only:

```text
cmd /c npx -y @playwright/mcp@latest
```

The executable and argv positions must match exactly. Standalone
`node .../@playwright/mcp/cli.js`, substring lookalikes, different packages, and
new server shapes remain audit-only.

An agent owner is recognized only when both the process executable basename and
`argv[0]` are exactly `claude[.exe]` or `codex[.exe]`.

## 7. Ownership and Claim Accounting

For every classified root, inventory records:

```js
{
  aliases,
  treeMembers: [{ pid, createdAt, depth }],
  rootPid,
  rootCreatedAt,
  agentKind,
  agentPid,
  agentCreatedAt,
  ownershipProven
}
```

`ownershipProven` requires an exact agent ancestor, finite owner/root creation
times, and a valid creation-time path for every raw descendant.

When `claimedRoots` is supplied, `buildReleasePlan()`:

1. refuses any same-owner group whose ownership is ambiguous;
2. refuses a claimed PID still live with the same or unknown creation time unless
   it remains an exact proven managed root;
3. refuses an attributable surviving descendant after a claimed root exits;
4. refuses any proven same-owner managed root absent from the lease claim set;
5. otherwise plans only exact claimed groups.

## 8. Lease and Concurrency Contract

A lease contains only:

```js
{
  sessionId,
  agentKind: 'claude',
  agentPid,
  agentCreatedAt,
  scopeId,
  keep: ['playwright'] | [],
  roots: [{ pid, createdAt }],
  startedAt
}
```

Lease, pending-start, lifecycle-lock, and startup-gate state use one host-wide temp
namespace across repositories/worktrees. Writes use create-new temporary files
plus atomic rename. Every read validates the entire schema; any malformed sibling
state blocks cleanup.

SessionStart publishes a pending claim under the startup gate before it waits on
the lifecycle lock. SessionEnd acquires lifecycle lock then startup gate, validates
the exact lease, and requires that every same-owner active/pending record belongs
to the ending session.

Default waits are 12 seconds per lock. Hook budgets are 45 seconds at start and
60 seconds at end. Crashes can still leave stale lock state; the current contract
states best-effort cleanup and does not guarantee crash recovery.

## 9. Mutation Boundary

`executeRelease()` performs:

```text
for each planned claimed tree:
  discover + analyze
  validate the complete owner/claim inventory
  find the exact planned group
  recheck lease exclusivity
  discover + analyze again
  validate the complete owner/claim inventory again
  match the exact current group
  open every expected Windows process as a .NET Process
  force Handle acquisition and compare StartTime to expected createdAt
  kill bound handles deepest-first
  discover + validate again
final discover + full claim validation
prove original/current/immediate members disappeared
detect attributable surviving descendants and same-owner respawns
return released/incomplete counts
```

Global inventory ambiguity marks every target incomplete and blocks remaining
mutation. The final validation also converts an initially empty plan into
`incomplete=1` if a new unclaimed root appears.

## 10. Receipts and State Removal

- Successful cleanup reports released, incomplete, protected, evidence, and
  lease-removal counts/status only.
- Incomplete cleanup attempts to archive a sanitized evidence record outside the
  active lease directory, then removes the ended lease when possible.
- Preflight failures before current-lease validation do not race state removal.
  They report `evidence=not-attempted` plus truthful `lease=absent`,
  `lease=retained`, or `lease=unknown`.
- Hook failures return success to avoid breaking Claude shutdown, but release no
  process when proof is incomplete.

## 11. Verification Already Completed

The exact current revision has:

- 41 passing Node tests across lifecycle unit, contract, and hostile race suites;
- two independent local hostile reviewers returning CLEAN after multiple repair rounds;
- syntax, JSON, mirror, skill-registry, skill-validator, diff, and 15-file
  zero-hit secret-scan gates passing;
- a read-only non-root-directory audit proving sanitized output;
- no production lease mutation and no live process termination during testing.

Regression coverage includes exact grammar negatives, agent lookalikes, creation
time ancestry, cross-worktree leases, atomic state, pending-start races, stale
inventory, PID reuse, invalid descendants, arbitrary-depth trees, disappearing
wrappers, orphaned children, immediate-only descendants, post-snapshot children,
unclaimed roots at every snapshot boundary, empty-plan false-clean prevention,
truthful lease receipts, and no PID-only `taskkill` mutation.

## 12. Known Limits Requiring Judgment

1. No automatic Codex process termination.
2. No POSIX mutation path.
3. Only canonical Playwright is registered.
4. No crash-safe stale-lock reclamation.
5. No cryptographic hook-origin attestation.
6. No automatic current-task context reclamation.
7. `KEEP` is explicit agent intent, not continuous tool-usage telemetry.
8. A zero-or-multiple-root SessionStart creates a lease with no root claims;
   safety wins over automatic cleanup.
9. The system controls local process lifecycle, not remote MCP billing/session state.

## 13. Questions Kimi Must Answer

1. Is any destructive boundary still capable of terminating an unrelated process?
2. Can lease, pending-start, lock order, resume, crash, or cross-worktree races
   produce false exclusivity or permanent poisoning?
3. Can claimed-root accounting return false-clean when a wrapper or descendant
   changes classification, ancestry, creation-time evidence, or PID?
4. Are the token/context claims precise enough to avoid misleading users?
5. Does the Claude/Codex split match the ownership proof actually available?
6. Which current limitations are acceptable V1 boundaries versus blockers?
7. What is the smallest enhanced phased plan that improves crash recovery,
   observability, future server registration, and operator usability without
   broadening destructive authority?
8. What explicit go/no-go gates must be satisfied before this reaches `main`?

## 14. Required Response Shape

1. `VERDICT: SHIP | REVISE | AUDIT-ONLY`
2. Ranked findings table: severity, invariant, event sequence, evidence, correction
3. False-positive/rejected-concern section
4. Enhanced phased implementation plan with acceptance and rollback gates
5. Required test matrix
6. Residual-risk register
7. Final landing recommendation
