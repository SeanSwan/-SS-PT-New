# Sean Human-AI Task Operating System

- **Date:** 2026-07-14
- **Owner:** Sean
- **Status:** CANONICAL WORKFLOW CONTRACT - Linear phase 1 live; Hermes read-only OAuth pending
- **Purpose:** Turn Sean's ideas into scoped, visible, asynchronously executed, verified work without making chat threads the project manager.
- **Load after:** `AGENTS.md` or `CLAUDE.md`, then `ACTIVE-INDEX.md`.
- **Companions:** `./agentic-os-principles.md`, `./workflow-audit.md`, `./approval-gates.md`, `./audit-receipts.md`, `./loop-engineering.md`, `./channels-and-brokers.md`, and `../references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md`.
- **Boundary:** This file governs work state and human/AI handoff. It grants no new command authority. T0-T4, approval, privacy, receipt, kill-switch, and repo rules still win.

---

## 1. Outcome

Sean operates as the portfolio owner and final taste/quality gate. Agents do the bounded execution. One persistent board holds the state of work; chat threads, lane ledgers, continuity logs, approvals, Git, tests, and production each keep their narrower truths.

The target loop is:

`capture -> triage -> make agent-ready -> execute -> evaluate -> needs Sean -> decide -> done or revise`

**Phase 1 implementation (2026-07-14):** Linear workspace `SwanStudios` is the persistent board. The first projects are `SwanStudios - Product & Engineering`, `AI Operations - Human + Agent Workflow`, `AI Agent Tuning`, and `Family First Intelligence Command Center`; the board links to repo evidence instead of replacing it.

## 2. Audit of the supplied workflow video

| Video principle | Current Swan coverage | Gap found | Upgrade decision |
|---|---|---|---|
| Shared human/AI workspace | Active priorities, Codex/Claude tasks, coordination files, continuity logs | State is fragmented; no single work board | Add one canonical task board contract |
| Persistent states | Coordination and approval queues have narrow states | No end-to-end work lifecycle | Use the state machine in section 4 |
| Agent-ready dispatch | Prompts and repo gates are strong | No standard card-level readiness gate | Add the Agent-Ready Contract in section 6 |
| Knowledge/context | Strong routers, vault rules, repo docs, memory boundaries | Context can be over-loaded or copied into tasks | Link evidence; do not duplicate bulky context |
| Low-friction capture | Telegram content-idea capture is contemplated | No universal desktop/mobile inbox | Manual capture now; one-click channels are rollout phase 2 |
| Agent evaluation | Tests, hostile review, closeout evidence, design QA | Quality gates vary by task and occur late | Add a universal pre-human scorecard |
| Human final gate | Strong T3/T4 approvals and Sean decisions | Routine review is not batched | Add fixed review windows and a `NEEDS_SEAN` queue |
| Persistent visibility | Receipts, Git, and continuity preserve evidence | A completed thread can still disappear from daily work view | Board card keeps artifact and evidence pointers |
| Token/cost awareness | Fable compression protocol and permission gates | No per-task budget/stop rule | Every agent-ready card names a budget class and stop condition |
| Continuous improvement | Receipt review, skill-harvest, loop engineering | Corrections are not tied back to task cards consistently | Weekly correction-pattern review |

### Audit verdict

The repo is already stronger than the video on security, evidence, approvals, and failure handling. It is weaker on the video's most practical idea: everyday work orchestration. The upgrade is therefore a task layer above the existing Agentic OS, not a replacement for it.

## 3. Source-of-truth boundaries

| Surface | Truth it owns | It must not become |
|---|---|---|
| Task board | Work status, priority, owner, due/next review, blocker, output pointer | Code documentation or an approval ledger |
| Task thread | Execution conversation and working context | The only record that a task exists |
| `.ai-workflow/coordination/` | Live file locks and peer-review requests | A backlog or product roadmap |
| Continuity bridge | Cross-session outcomes and promotion markers | A task board |
| Approval queue | Permission for a named T3/T4 effect | General work status |
| Repo docs | Project rules, architecture, contracts | Changing business data |
| Git/tests/runtime | Technical implementation and verification truth | Product/business record |
| SwanStudios Postgres/API | Current client and business data | Agent memory |

Board state is written once. Other surfaces link to the card ID; they do not copy its status.

## 4. Canonical state machine

| State | Meaning | Exit condition |
|---|---|---|
| `INBOX` | Captured, not yet trusted as a task | Triage supplies outcome, project, owner, and next action |
| `READY` | Scoped and prioritized; may still be human-owned | Agent-owned work also passes section 6 |
| `DOING` | One named owner is actively working | Output enters evaluation, or a specific blocker appears |
| `REVIEW` | Work is complete enough for automated/deterministic evaluation | All hard gates pass and scorecard passes, or return to `DOING` |
| `NEEDS_SEAN` | The smallest decision, approval, or taste choice is ready | Sean approves, revises, rejects, splits, or defers |
| `BLOCKED` | External dependency prevents meaningful progress | Dependency clears, scope changes, or task is closed honestly |
| `DONE` | Accepted outcome plus evidence and remaining-risk note exist | Reopen only with a new fact or explicit revision |

Allowed flow:

`INBOX -> READY -> DOING -> REVIEW -> NEEDS_SEAN -> DONE`

Linear maps these to `Backlog`; `Todo` + `Agent Ready`; `In Progress`; `In Review`; `In Review` + `Human Approval`; and `Done`. `BLOCKED` uses the current status plus the `Blocked` label and a named dependency/owner.

`REVIEW -> DOING` on eval failure. `DOING -> BLOCKED -> READY|DOING` when a dependency changes. `NEEDS_SEAN -> READY|DOING` when Sean revises or splits the work.

"Waiting" is not used by itself. A card waits either on Sean (`NEEDS_SEAN`) or on a named external dependency (`BLOCKED`).

## 5. Task card contract

Every substantial task uses these fields. A board may render them as properties, labels, or a template, but the meanings stay stable.

```yaml
id: stable board identifier
title: verb plus concrete outcome
project: repo or business domain
why_now: value, risk, or dependency
status: INBOX | READY | DOING | REVIEW | NEEDS_SEAN | BLOCKED | DONE
priority: P0 | P1 | P2 | P3
owner: Sean | named person | named agent
agent_ready: false
effect_tier: T0 | T1 | T2 | T3 | T4
outcome: what exists or behaves differently when accepted
scope: exact surfaces, files, systems, or research boundary
non_goals: tempting adjacent work that is excluded
context_links: canonical docs, issues, routes, evidence; links instead of pasted bulk
acceptance: observable pass/fail criteria
eval_profile: default plus domain gates
budget: small | standard | deep, with stop condition
approval: none | Sean decision needed before named effect
evidence: tests, artifact, receipt, route, source, deploy, or observation pointers
blocker: named dependency and owner, or blank
next_review: timestamp or review window
```

No secrets, client PII, raw transcripts, credentials, or private infrastructure identifiers enter a card.

## 6. Agent-Ready Contract

A task may set `agent_ready: true` only when all are true:

1. The outcome is concrete and can be accepted or rejected.
2. The active project/repo and authoritative instructions are named.
3. Scope and non-goals prevent accidental expansion.
4. The effect tier and approval boundary are explicit.
5. Context links point to source-of-truth material; no secret or PII is embedded.
6. Acceptance criteria and the eval profile are present.
7. A budget class and stop condition are present.
8. Concurrent-write risk is resolved: isolated worktree or live lane claim.
9. The agent can make progress without inventing a product decision that belongs to Sean.

If any item fails, the card stays `INBOX` or `READY` with `agent_ready: false`. "Use your judgment" never supplies missing authorization.

## 7. Universal eval before Sean sees the work

Score each dimension `0`, `1`, or `2`:

| Dimension | 0 | 1 | 2 |
|---|---|---|---|
| First principles | Pattern-matched or assumed | Mixed reasoning | Mechanics and evidence drive the result |
| Expected value | Low-value work or major lever missed | Useful but not best lever | Highest-value bounded move |
| Sean time minimized | Leaves avoidable work for Sean | Some cleanup remains | Only the irreducible decision remains |
| Verified, not plausible | Assertion only | Partial evidence | Exact acceptance evidence is attached |
| Leverage and context | Ignored available tools/docs | Used some | Used the best existing skill, pattern, and source |

Pass requires:

- total score at least `8/10`;
- no dimension scored `0`;
- every task-specific hard gate passed;
- no unresolved security, billing, auth, PII, data-loss, or production ambiguity.

An agent gets at most two self-revision cycles after a failed scorecard. After that it moves to `NEEDS_SEAN` with the failed dimensions, best current artifact, and one precise decision request. This prevents infinite token burn disguised as persistence.

Domain hard gates remain additive:

- **Code:** caller path, targeted regression evidence, sibling sweep where required, secret scan, honest remaining risk.
- **UI/design:** canonical mount, mobile/desktop checks, accessibility, visual evidence, reduced motion where relevant.
- **Research:** primary sources, dates, uncertainty, and inference labels.
- **Operations:** exact target, dry-run/recovery path, effect tier, approval, and receipt.
- **Content:** source trail, voice/tone contract, factual check, and publish approval.

## 8. Sean's operating cadence

### Capture continuously

Every idea goes to `INBOX` in under 30 seconds. Capture the thought, not a perfect brief. Voice, mobile, desktop, or Telegram are channels; all must create the same card shape eventually.

### Morning portfolio pass - 10 minutes

1. Empty or intentionally defer `INBOX`.
2. Pick the five highest-value outcomes for the day.
3. Mark human-owned versus agent-owned.
4. Make agent-owned cards agent-ready.
5. Start only as much work as the review queue can absorb.

WIP limits:

- shared SS-PT working tree: at most the coordinated writers the live ledger safely supports, with disjoint file claims;
- isolated worktrees: parallelism is allowed, but default to 3-5 high-value active outcomes, not dozens of low-context tasks;
- any `NEEDS_SEAN` backlog older than one review window pauses new low-priority dispatch.

### Work asynchronously

Agents update status and leave evidence on the card. They interrupt Sean only for:

- `NEEDS_SEAN`;
- a real `BLOCKED` dependency;
- a safety/authority boundary;
- repeated eval failure;
- a changed assumption that invalidates the task.

Routine progress stays on the board.

### Batch review 2-4 times per day

For each `NEEDS_SEAN` card, Sean chooses one:

- **Accept:** move to `DONE`.
- **Revise:** give one concrete correction; return to `DOING`.
- **Split:** accept the proven portion and create a new card for the rest.
- **Reject:** close with the reason so the eval system can learn.
- **Defer:** return to `READY` with a date or trigger.

T3/T4 approval remains a separate exact approval. Accepting an artifact is not authorization for an external or irreversible effect.

### End of day - 10 minutes

- No anonymous `DOING` cards.
- Every blocked card names the dependency and owner.
- Every done card has evidence.
- Record repeated corrections for the weekly loop.
- Choose tomorrow's likely top three without prematurely dispatching them.

### Weekly - 30 minutes

- Review throughput, age in state, eval failures, rejected outputs, and token/cost outliers.
- Turn three repeated identical corrections into a skill/prompt improvement proposal.
- Demote noisy or low-value automations.
- Archive stale tasks; do not let `INBOX` become a guilt warehouse.
- Check that Sean's review time, not agent count, is the actual constraint.

## 9. Concurrency and budget rules

The video's "20 or 50 agents" is a capability claim, not a default operating target. SwanStudios is a shared production repo, so useful parallelism is bounded by review capacity and collision risk.

- One owner per card.
- One writing agent per file at a time.
- Prefer isolated worktrees for parallel implementation.
- Research/read-only tasks may run broadly if their outputs stay evidence-backed and scoped.
- Default budget classes:
  - `small`: one narrow task, focused verification, stop on first material ambiguity;
  - `standard`: one implementation slice plus hostile review;
  - `deep`: architecture/research/critical review, explicitly justified.
- A task that exhausts budget without passing eval becomes `NEEDS_SEAN`; it does not quietly consume another budget class.
- Paid Village/Fable/model escalation still follows its existing permission policy.

## 10. Tailscale supporting lane - corrected policy

The supplied Tailscale video has a sound strategic idea: private, identity-aware connectivity reduces the need for public inbound services. It also uses language that is too broad for production policy.

Adopt these rules:

1. **Tailscale carries network reach, not command authority.** The command registry, T0-T4 tier, app auth, approval gate, and receipt still apply after a connection succeeds.
2. **Use explicit least-privilege grants for new policy.** Do not keep the default broad-connectivity shape. Tag operator, runner, lab, and production nodes separately; permit only required source/destination/port pairs; add policy tests.
3. **"No SSH keys" is true only for Tailscale SSH.** Traditional SSH over a Tailscale address still uses its normal authentication. Choose deliberately; do not describe generic Tailscale connectivity as keyless SSH.
4. **Never ask an agent to "disable all ports" as an unscoped instruction.** Firewall/SSH changes are T4 infrastructure work: exact plan, provider-console break-glass path, current-session preservation, second verified login, rollback, then public exposure reduction.
5. **Most Tailscale deployments need no inbound firewall opening, but egress and relays still matter.** Verify the actual path and performance rather than promising every connection is peer-to-peer.
6. **Choose device approval or Tailnet Lock deliberately.** Official docs say they are mutually exclusive. Start with the simpler recoverable control unless the stronger trust model and recovery ceremony are justified.
7. **Keep key expiry/recovery realistic for remote-only nodes.** A tailnet-only server without a break-glass route can become unreachable during re-authentication.
8. **Aperture is beta.** Treat it as an optional, isolated pilot. Review its base-URL/proxy behavior, data path, logs, provider support, rollback, and secret migration before any agent uses it. No production-wide cutover from a video.
9. **Secrets stay out of cards, prompts, docs, and logs.** Presence-only checks and the existing secret rules remain mandatory.
10. **Remote fleet changes are staged.** Lab node first, verification, one production node, verification, then batch.

Official references: [access controls](https://tailscale.com/docs/features/access-control/acls), [Grants](https://tailscale.com/docs/features/access-control/grants), [Tailscale SSH](https://tailscale.com/docs/features/tailscale-ssh), [firewall ports](https://tailscale.com/docs/reference/faq/firewall-ports), [device approval](https://tailscale.com/docs/features/access-control/device-management/device-approval), [Tailnet Lock](https://tailscale.com/docs/features/tailnet-lock), [key expiry](https://tailscale.com/docs/features/access-control/key-expiry), and [Aperture](https://tailscale.com/docs/aperture/what-is-aperture).

## 11. Rollout plan

| Phase | Deliverable | State after this change | Exit gate |
|---|---|---|---|
| 0 | Audit, state model, task contract, eval, root routing | COMPLETE - canonical contract and root routing exist | CLAUDE/AGENTS parity and links verified |
| 1 | Choose one board and create fields/views/templates | LIVE - Linear projects, effect/owner/gate labels, workflow document, and seed issues exist | Sean can capture, triage, dispatch, review, and close one task without chat-only state |
| 2 | Desktop/mobile/Telegram one-action capture | NOT BUILT | New item reaches `INBOX` in under 30 seconds with no secret exposure |
| 3 | Agent-ready dispatcher and status callbacks | PARTIAL - Hermes Linear T0 read OAuth is in progress; dispatcher/callback writes are not built | One low-risk T0/T1 task completes end to end with full trail |
| 4 | Eval runner and `NEEDS_SEAN` notifications | NOT BUILT | Failed eval retries twice; passing result notifies once; no spam |
| 5 | Command-center board view | NOT BUILT | Board, queue, receipts, and switches are visible without adding a second write path |
| 6 | Tailscale fleet hardening and optional Aperture lab pilot | NOT AUTHORIZED/NOT VERIFIED HERE | Separate security plan, break-glass test, grants tests, rollback, Sean approval |
| 7 | Promote proven manual flows to buttons/schedules | NOT BUILT | N clean runs, registry row, receipt, switch, and Sean's specific approval |

Linear is the selected shared board. Its canonical workflow document lives in the `AI Operations - Human + Agent Workflow` project; Git and repo docs retain code and architecture truth.

Codex, Claude Code, and KiloCode have write-capable official Linear MCP connections. Hermes is restricted to an explicit T0 read allowlist until a hard per-write approval proxy exists.

## 12. Audit record

### Files intended by this slice

- `docs/ai-workflow/hermes-agentic-os/task-operating-system.md`
- `docs/ai-workflow/hermes-agentic-os/index.md`
- `CLAUDE.md`
- `AGENTS.md`
- `ACTIVE-INDEX.md`

### Security posture

- No credentials, private IDs, client data, or raw transcript content are included.
- Tailscale is explicitly separated from authorization.
- External-visible, credential, firewall, destructive, billing, and production effects remain gated.
- Aperture remains an optional beta pilot, not a mandated secret migration.

### Known limitations

- The Linear board and seed structure exist; one-action capture, dispatcher callbacks, eval notifications, and Tailscale changes do not.
- Hermes Linear OAuth still needs the user authorization flow to finish; current Tailscale live state remains unprobed.
- GitHub integration, default issue-template UI setup, and priority backfill remain tracked follow-ups in Linear.

### Re-review hooks

A future hostile review should ask:

1. Did the chosen board become another duplicate source of truth?
2. Can an agent mark its own work done without passing eval and human gates?
3. Can a captured card smuggle secrets, PII, or executable instructions?
4. Can status callbacks spoof another agent or card?
5. Does notification volume make Sean ignore `NEEDS_SEAN`?
6. Does the dispatcher exceed the card's effect tier or scope?
7. Can a tailnet compromise reach more nodes than the grants intend?
8. Is the workflow saving Sean time in measured review minutes, or only increasing agent output?


