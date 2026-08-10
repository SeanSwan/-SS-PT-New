# SwanStudios Kimi K3 Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/MCP-LIFECYCLE-HYGIENE-KIMI-REVIEW-PACKET-2026-08-08.md
**Seed:** (none)
**Tokens:** 2584 in / 9137 out · **Cost:** ~$0.1448 · **Wall:** 107.6s

---

# Kimi K3 Hostile Review — MCP Lifecycle Hygiene Guard

I read the packet as an attacker, not an advocate. I tried to break every invariant. Most of the mutation boundary held. Three things did not, and two of them are in code paths the packet itself describes as reachable by design.

---

## 1. VERDICT: REVISE

The kill boundary (handle-bound, StartTime-rechecked, deepest-first, fail-closed) is fundamentally sound and should not be reduced to audit-only. But the packet as written contains one ownership-binding gap that can violate Invariant 1, one self-poisoning design with no recovery path, and one budget mismatch that can trigger the poisoning mid-mutation. These are fixable without broadening destructive authority. Do not land on `main` until Phase 0 below closes.

---

## 2. Ranked Findings

| # | Sev | Invariant | Event sequence | Evidence | Smallest safe correction |
|---|-----|-----------|----------------|----------|--------------------------|
| F1 | **P0** | Inv 1 (never kill another live agent's server) | (a) Session A's SessionEnd cleanup returns incomplete (a designed path, §10); lease is removed; the orphaned root's owner `claude.exe(A)` is still alive (lingering process, resume, or any future multi-session-per-process mode). (b) Session B's SessionStart sees exactly one proven root visible — A's orphan — and claims it. (c) B's SessionEnd: no sibling same-owner (B) records exist; A's lease is gone; `buildReleasePlan()` plans the exact claimed group; B kills A's live server. | §3: SessionStart claims "an exact managed root only when exactly one proven root is visible" — proven means owned by *some* exact agent, not necessarily *self*. §7: `buildReleasePlan()` never states a check that `root.agentPid/agentCreatedAt == lease.agentPid/agentCreatedAt`. §10: incomplete cleanup "removes the ended lease when possible," manufacturing the orphan state. | Bind claims to self-ownership at **both** ends: SessionStart may claim a root only if its proven owner identity equals the lease's own `agentPid/agentCreatedAt`; `buildReleasePlan()` re-verifies that equality at every snapshot. On incomplete cleanup, retain a lease **tombstone** (sanitized) so orphans stay attributable and unclaimable until their owner is proven exited. |
| F2 | **P1** | Inv 7, 10; operability | Hook process is killed at timeout or crashes while holding the host-wide lifecycle lock, or after publishing a pending-start but before lease creation. Every subsequent SessionStart/SessionEnd, in every repo and worktree, either stalls 12s or blocks cleanup — permanently, host-wide, with no documented recovery. The feature designed to fix hygiene silently disables itself. | §8: "Crashes can still leave stale lock state; the current contract states best-effort cleanup and does not guarantee crash recovery." §12.4 confirms. Single host-wide namespace makes one crash global. Pending-start records have no stated TTL or holder-liveness check. | Give lock and pending records holder identity (`pid`, `createdAt`) plus an absolute deadline; reclaim stale records using the same creation-time identity discipline already used for processes. Ship a documented break-glass runbook (`doctor` subcommand that explains *what* is stale before clearing). Prefer lease-scoped locks over one global lock where the protocol allows. |
| F3 | **P1** | Inv 8, 10 | Loaded host: 12s lifecycle-lock wait + 12s startup-gate wait + three or more full process inventories (each enumerating all processes and forcing handle acquisition) + kill sequence exceeds the 60s SessionEnd budget. The harness kills the hook mid-kill-sequence: partial tree kill (wrapper dead, children alive) **and** locks held → compounds F2. Partial kill is detected as incomplete on the next run, so this is not false-clean — but it is a self-inflicted poisoning trigger. | §8 waits (12s × 2) + §9 mutation boundary (discover/analyze/validate ×3 minimum) vs. §5 timeouts (45/60s). No internal deadline is described. | Add an internal deadline budget: before entering the mutation phase, check remaining budget against a conservative worst-case estimate; if insufficient, refuse as incomplete *before* any kill. Make the kill loop checkpoint-safe (each tree kill is idempotent and resumable). Reduce redundant inventories where the second snapshot can be reused. |
| F4 | **P2** | Inv 7 (deadlock-freedom of the concurrency contract) | SessionStart takes startup gate, then lifecycle lock. SessionEnd takes lifecycle lock, then startup gate. If the gate is ever held across the lifecycle-lock wait (a refactor, a crash path, a future contributor), this is a textbook ABBA deadlock between two hooks on the same host. | §8 describes opposite acquisition orders and never states that the gate is released before the lock wait, nor a global ordering rule. A concurrency contract that is under-specified is a defect for pre-main code even if the current implementation happens to be safe. | Specify and enforce one global acquisition order (or collapse to a single combined mutex). Add a static check or test that no code path holds gate while awaiting lock. Add a lock-order-inversion regression test. |
| F5 | **P2** | Inv 10 (honesty of results) | Cleanup refuses (correctly, fail-closed) for any of a dozen reasons. The user sees nothing; hook failures return success to the harness. The system can refuse forever while the user believes hygiene is working — the exact problem Sean asked to solve, recreated silently. | §10: receipts are counts-only; hook failures return success; no operator-facing journal or status surface is described. | Append-only sanitized local journal (counts, allowlisted labels, refusal *reason codes* — still no PIDs/argv) plus a `status` subcommand. Surface `protected`/`incomplete` in the session summary line. |
| F6 | **P3** | Usability; KEEP semantics | SessionEnd ignores KEEP. Short-lived or resumed sessions (`claude --resume`) kill a server the user explicitly kept, losing server-side state (e.g., Playwright auth) and paying restart cost on every resume. | §3: "SessionEnd ignores task KEEP." §12.7 acknowledges KEEP is intent, not telemetry. | Optional `keep-on-end` lease flag or a short post-end grace TTL before release. Document the default and the tradeoff. Not a blocker. |
| F7 | **P3** | Inv 3 | `Process.StartTime` comparison semantics are unstated. If implemented with tolerance, local-time `DateTime`, or truncated precision, PID-reuse protection weakens. | §9: "compare StartTime to expected createdAt" — equality mode, kind, and timezone unspecified. | Contract must state: exact equality on UTC FILETIME-derived ticks, no tolerance. Add a test asserting comparison strictness. |
| F8 | **P3** | Inv 5, 6 | "Exactly one proven root is visible" (SessionStart claim rule) does not define visibility scope. If host-wide, two sequential sessions under-claim (B sees A's root + its own → claims none → permanent leak, fail-closed but noisy). If per-owner, F1's sequence gets easier to reach. | §3, §12.8: scope undefined. | Define visibility as host-wide inventory filtered to roots whose proven owner is the starting session's own agent identity (which also implements F1's fix). Test both scopes. |

---

## 3. False-Positive / Rejected Concerns

I attacked these and the design held. Listing them so they are not re-litigated:

- **PID reuse defeating `createdAt`.** Rejected, *conditional on F7*. Windows process creation time is FILETIME-derived (100ns granularity); accidental same-tick reuse with matching ancestry windows is not reachable, and §7's creation-time-path validation closes the parent-exit/reuse ordering attack (a reused parent PID necessarily has `createdAt` after the child's, producing an invalid path → refuse).
- **TOCTOU between StartTime recheck and `.Kill()`.** Rejected. An open process handle pins the kernel process object; the PID cannot be recycled while the handle is held, and `Kill()` on the bound `Process` object acts on that handle. This is the correct Windows idiom.
- **Post-snapshot children / respawns.** Rejected. New children are outside the bound handle set, survive, and are caught by final validation as attributable survivors or same-owner respawns → incomplete, never false-clean. The empty-plan-to-incomplete conversion closes the quietest false-clean path.
- **Token/context claims.** Rejected. §2's three-layer separation (configured/running/exposed) and the explicit statement that stopping a process does not reclaim loaded context are precise and not misleading.
- **Codex audit-only.** Rejected as a concern — it is the correct call. Shared host process means per-task ownership is unprovable; keeping mutation off until ownership is provable is exactly the discipline the packet preaches.
- **Deliberate same-user forgery of hook input / state.** Out of stated threat model (§5), honestly disclosed. Not a finding; retained in the risk register.
- **Remote MCP billing/session state.** Out of scope, honestly disclosed (§12.9).
- **Orphaned children after root exit.** Covered by §7 rule 3 (refuse attributable surviving descendants).

---

## 4. Enhanced Phased Implementation Plan

Each phase is independently shippable behind the existing audit-only capability flag. Mutation authority never widens without its phase gates passing.

### Phase 0 — Blocker fixes (pre-`main`, mandatory)
**Scope:** F1 self-ownership binding + lease tombstones; F2 stale lock/pending reclamation with holder identity + `doctor` break-glass; F3 internal deadline budget with pre-mutation refusal; F4 documented global lock order.
- **Acceptance:** all new hostile tests (§5) pass; 41 existing tests still pass; a killed-at-timeout hook leaves the namespace self-recovering within one subsequent hook run; no code path holds gate across lock wait (statically checked).
- **Rollback:** single config flag returns the entire system to audit-only; hooks become no-ops; no state format migration needed (tombstones are additive).

### Phase 1 — Observability (F5)
**Scope:** sanitized append-only journal with refusal reason codes; `status` subcommand; session-summary surfacing of `protected`/`incomplete`.
- **Acceptance:** every refusal in a seeded-fault run produces a journal entry with a reason code and zero forbidden fields (re-run the 15-file secret-scan gate against journal output).
- **Rollback:** disable journaling; cleanup logic untouched.

### Phase 2 — Crash-recovery hardening + operator runbook
**Scope:** checkpoint-safe kill loop; resumable incomplete cleanups via tombstones; published runbook for stale-state diagnosis.
- **Acceptance:** fault-injection suite (kill hook at each of N instrumentation points) always converges to either released or attributable-incomplete on the next run; never false-clean, never permanently poisoned.
- **Rollback:** revert to Phase 1 behavior; tombstones remain readable.

### Phase 3 — Server registration framework
**Scope:** schema-validated registry for additional servers; each new server ships **audit-only** with its own exact-grammar classifier, ownership proof, and hostile test pack before mutation is enabled for it.
- **Acceptance:** registering a new server requires no changes to the mutation engine; a deliberately malformed registration is rejected at load.
- **Rollback:** remove registry entry; Playwright path unaffected.

### Phase 4 — Platform and agent expansion (judgment call)
**Scope:** POSIX audit path first; POSIX mutation only with an equivalent identity discipline (start-time from `/proc/<pid>/stat` field 22 + handle-equivalent pinning analysis — note: Linux has no exact equivalent of handle pinning, so this phase may legitimately conclude audit-only permanently). Codex stays audit-only unless per-task ownership becomes provable.
- **Acceptance:** written proof obligation per platform/agent before any mutation is enabled.
- **Rollback:** per-platform flag.

---

## 5. Required Test Matrix (additions to the existing 41)

| Test | Finding | Pass condition |
|------|---------|----------------|
| Cross-session orphan claim | F1 | B's SessionStart refuses to claim a root owned by live A; B's SessionEnd plans nothing for it |
| Live-owner claim at release | F1 | `buildReleasePlan()` refuses a claimed root whose owner ≠ lease agent identity, at every snapshot |
| Tombstone retention | F1 | Incomplete cleanup leaves a sanitized tombstone; orphan is unclaimable until owner proven exited |
| Stale lock reclamation | F2 | Lock held by dead PID (createdAt mismatch) is reclaimed; lock held by live PID is honored |
| Stale pending-start TTL | F2 | Pending record older than hook budget + margin with dead holder is reclaimed; live holder blocks |
| Budget-exhaustion refusal | F3 | Injected slow inventory → refusal as incomplete *before* any kill; no partial tree |
| Kill-checkpoint resumption | F3/F2 | Hook killed between tree kills → next run converges to released or attributable-incomplete |
| Lock-order inversion | F4 | Static check + forced-inversion test deadlocks in test harness and is caught by timeout watchdog |
| Journal hygiene | F5 | Seeded-fault run: reason codes present; secret-scan finds zero forbidden fields in journal |
| StartTime strictness | F7 | Comparison rejects ±1-tick and local-time-constructed values |
| Visibility scope | F8 | Two sequential sessions: B claims its own root despite A's root existing (per-owner scope) |
| Resume churn | F6 | KEEP + keep-on-end flag survives a resume cycle without server restart |

---

## 6. Residual-Risk Register

| Risk | Severity | Disposition |
|------|----------|-------------|
| Hook killed *during* the kill loop leaves a partial tree until next run | Low | Detected as incomplete; converges on next run; accepted |
| Deliberate same-user forgery of hook input/state | Medium | Out of threat model; documented; would need crypto attestation (future) |
| Upstream Claude process/session model change (e.g., multiplexed sessions per process) | Medium | Re-validates F1's fix; add a startup sanity check that one process = one session assumption holds, else audit-only |
| KEEP intent drift (user forgets what they kept) | Low | Phase 1 journal + status surface mitigates |
| Windows StartTime resolution edge cases on future OS versions | Low | F7 strictness test; re-verify on OS upgrades |
| Remote MCP state untouched by local lifecycle | Informational | Documented limit; user education only |
| POSIX has no handle-pinning equivalent | Medium | Phase 4 may conclude permanent audit-only; that is an acceptable outcome |

---

## 7. Final Landing Recommendation

**REVISE, then land in phases.** The core insight of this design — treat process identity as (PID, creation-time) pairs, bind kills to open handles, and fail closed on any ambiguity — is correct and unusually well-disciplined for a lifecycle tool. The 41-test hostile suite and the empty-plan false-clean fix show the authors already think like attackers.

But three things bar `main` today:

1. **F1 is a live Invariant 1 gap** reachable through the designed incomplete-cleanup path. The fix (self-ownership binding + tombstones) is small and categorical.
2. **F2 makes the system its own worst availability enemy** — one unlucky crash permanently disables the feature host-wide with no recovery story.
3. **F3 is the most likely trigger of F2** under real-world load.

**Go/no-go gates for `main`:**
- All Phase 0 fixes landed with their test-matrix rows passing;
- Fault-injection proof that no kill-point crash produces false-clean or permanent poisoning;
- Lock-order contract written into the code as an enforceable invariant, not a comment;
- Audit-only rollback flag demonstrated end-to-end;
- Secret-scan and sanitized-output gates re-run against the new journal surface.

Codex mutation should remain audit-only indefinitely — not as a concession, but because the ownership proof genuinely does not exist there. That restraint is the strongest signal in the packet, and Phase 4 should be willing to conclude the same for POSIX.
