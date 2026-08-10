---
name: mcp-lifecycle-hygiene
description: Audit MCP server lifecycle, context exposure, and task ownership; preview unused task-owned local MCP processes without affecting another agent. Current hooks are audit-only; future release requires a separately approved gate-bearing revision. Use at the start and close of every SwanStudios coding task, when MCP tools/connectors/browser servers are configured or invoked, when context or token usage is unexpectedly high, when many Claude or Codex sessions are open, or when the user asks to close, disable, clean up, or inventory MCP servers.
---

# MCP Lifecycle Hygiene

Treat MCP access as a task-scoped lease. Keep only the servers required for the
current task, preview task-owned local processes at the boundary, and refuse any
future cleanup whenever another same-host lease may exist.

## Keep the Three Layers Separate

- **Configured:** the server exists in Claude/Codex configuration.
- **Running:** a local stdio server process or remote connection is active.
- **Exposed:** tool definitions, server instructions, resources, or tool output
  have entered model context.

An open process consumes RAM, handles, and possibly network resources; it does
not continuously spend model tokens merely by existing. Tool schemas,
instructions, resource contents, and outputs consume context. Stopping a process
does not remove material already exposed to the current session. Start a fresh
task/session after disabling tools when context reclamation matters.

## Start-of-Task Lease

1. State `KEEP: <server names>` or `KEEP: none` from the actual task.
2. Run the sanitized audit from the repo root:

   ```powershell
   node scripts/mcp/mcp-lifecycle-manager.mjs audit
   ```

3. In Claude, persist the active session's keep set after `SessionStart`:

   ```powershell
   powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File scripts/mcp/mcp-lifecycle-hook.ps1 -Event Keep -Mode audit -Keep playwright
   ```

   Use `-Keep none` when no local server is intended for this active task.
4. Do not run broad `claude mcp list` or equivalent health checks casually;
   listing may connect to or start configured local servers.
5. Invoke only a server in `KEEP`. Record it before first use.
6. Never infer that every configured server is running, or that every running
   server is wasting tokens.

## Context Control

- Keep Claude tool search enabled. When Claude activates tool search for a
  sufficiently large toolset, it defers MCP tools and loads used schemas on
  demand; do not set `ENABLE_TOOL_SEARCH=false`.
- For Codex, prefer `enabled = false`, `enabled_tools`, or `disabled_tools` in
  the applicable config before a fresh task. Do not remove configuration or
  authentication merely to save context.
- Restart or open a fresh task after changing server/tool exposure. Do not claim
  that killing a process shrank the already-created context window.
- Paginate and bound MCP tool output. Large responses, not idle sockets, are the
  usual avoidable token spike.

## Release

Preview the release plan first:

```powershell
node scripts/mcp/mcp-lifecycle-manager.mjs release --keep=playwright
```

Manual `release` is preview-only. KEEP records active-task intent and scopes that preview.
The installed SessionEnd hook also runs in explicit `audit` mode: it records a
tombstone before removing the ended lease, but releases no process. The dormant
enforce implementation is mechanically sealed by code and the wrapper accepts
only audit mode. Opening it requires a separate gate-bearing revision, a matching
exact-revision Kimi APPROVE review, and Sean's explicit approval. Claude hook JSON is not cryptographically
attested against a same-user caller, so this is an operational lifecycle guard,
not a security boundary against a deliberately forged local invocation. The current
Claude project configuration allowlists only the exact Playwright `cmd /c npx
-y @playwright/mcp@latest` tree; new local server shapes remain audit-only until
their canonical configured path and launch grammar receive tests and review.

The manager must refuse process release from a shared Codex Desktop host because
multiple tasks can share one host process. For Codex, audit the process layer and
disable unused servers/tools for the next fresh task through configuration.
Never terminate Codex-host descendants based only on process ancestry.

## Automatic Claude Hooks (Installed Audit Mode)

- `SessionStart` creates or re-enters a session-bound lease from Claude's
  validated `session_id`, exact process ID, and process creation time. Repeated
  starts within the same live lease preserve KEEP; a post-SessionEnd resume is a
  new lease. It claims an exact managed root only when exactly one proven root is
  observed; zero or multiple roots remain unclaimed. An identity mismatch is a refusal.
- `SessionEnd` currently audits and durably tombstones the ended ownership claim
  before lease removal. It does not terminate a process in installed audit mode.
- The PowerShell wrapper starts the budget at entry, acquires a host-global
  state mutex before exact-owner lifecycle → startup mutexes, and owns each Node worker through
  a kill-on-close Job Object so coordinator death cannot leave a worker alive.
- Concurrent leases under one Claude host, missing creation times, stale PIDs,
  unknown command shapes, non-Windows platforms, and shared Codex hosts are
  audit-only. Hooks fail open and release nothing when proof is incomplete.
- Lease, pending-claim, dirty-latch, tombstone, and journal writes are atomic and
  schema-validated. Malformed or oversized state blocks cleanup. Leases and
  pending claims use one host-wide namespace across repos/worktrees; the
  synchronous SessionStart hook publishes its claim before waiting on the owner
  lock and returns before task tool use. Multiple session IDs under one Claude
  process block cleanup.
- If enforcement is separately approved later, the top-level Claude process ID
  plus creation time remains the ownership boundary. The manager must write the
  dirty latch before release, respect one absolute deadline and final-scan
  reserve, validate every raw descendant edge, bind .NET handles by start time,
  prove disappearance/respawn state, journal the result, and only then clear the
  latch. Any interruption, ambiguity, or unclaimed identity remains audit-only.

Read sanitized lifecycle state without process mutation:

```powershell
node scripts/mcp/mcp-lifecycle-manager.mjs status
node scripts/mcp/mcp-lifecycle-manager.mjs doctor
```

Operator recovery is coordinator-routed:

```powershell
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File scripts/mcp/mcp-lifecycle-hook.ps1 -Event Rearm -Mode audit
```

This explicit rearm action succeeds only when dirty state is the sole remaining
condition and writes a durable receipt before clearing the latch.

## Limits

This is installed audit-only Claude lifecycle bookkeeping plus manual,
audit-only Codex process hygiene and next-session Codex configuration guidance.
It does not continuously negotiate with the active AI, guarantee cleanup after
crashes or forced exits, disable Codex tools for the current task, or reclaim
already-loaded context. The AI communicates its Claude keep decision through
the session lease; Codex keeps an explicit task-local `KEEP` declaration only.
The dormant mutation implementation is mechanically sealed, SessionEnd-routed,
and approval-gated. The manager
validates the hook event, session lease, owner identity, and concurrency state,
but hook origin itself is
not cryptographically attested against another process running as the same user.
Incomplete/refused enforcement would preserve a dirty latch and transactionally
tombstone before lease removal. It reports cleanup, evidence, and removal gaps
instead of silently poisoning later work. Expired pending claims are quarantined
only after exact nonce/holder proof; tombstones are pruned only after exact owner
and root generations are gone.

## Configuration Boundary

Require explicit user approval before any persistent `add`, `remove`, `logout`,
authentication reset, or global/project config mutation. Prefer disabling over
deleting so rollback is cheap. Never print MCP command lines, headers, tokens,
environment values, or credentials.

## Receipt

Report only sanitized names and counts:

```text
MCP-LIFECYCLE
KEEP: <names | none>
RUNNING: <sanitized managed group counts>
RELEASED: <task-owned group counts | none>
PROTECTED: <other-agent/shared-host count>
CONTEXT: <fresh-session required | deferred tools active | unchanged>
```

If ownership is ambiguous, release nothing and say what evidence is missing.
Never kill or disable an MCP server merely because another agent has not used it
in the current transcript; another live task may own it. A missing or ambiguous
lease is a refusal condition, not permission to clean up.
