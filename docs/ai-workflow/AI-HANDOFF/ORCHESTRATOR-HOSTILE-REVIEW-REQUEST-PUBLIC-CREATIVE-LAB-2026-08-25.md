# Hostile-review request: implementation-complete Public-Creative-Lab design

This is the next prompt to the orchestrator. Perform a comprehensive hostile review of the proposed single-account Public-Creative-Lab before the classroom-laptop agent creates or activates it.

The owner does not want the classroom-laptop agent choosing among architectural alternatives. The panel and orchestrator must make the technical design decisions, reconcile disagreements, and return one implementation-ready build packet. Do not return a menu of options. Where a physical owner action is unavoidable, specify the recommended setting and label only the physical action `[OWNER ACTION]`.

Use roles only. Do not include identifying classroom content, hostnames, credentials, tokens, private records, or secret values. Do not change the laptop, shared host, workstation, routes, credentials, hooks, or application permissions during this review. The only authorized repository mutation is one additive reply document on the existing exchange branch.

## 1. Governing inputs

Read and reconcile at least these branch artifacts before the panel runs:

1. `docs/ai-workflow/AI-HANDOFF/RADAR-BRIEF-FOR-CLASSROOM-LAPTOP-AGENT-2026-08-24.md`
2. `docs/ai-workflow/AI-HANDOFF/panel-radar-privacy-2026-08-24/SYNTHESIS.md`
3. `docs/ai-workflow/brainstorms/radar-pc-utilization-2026-08-24.md`
4. `docs/ai-workflow/AI-HANDOFF/RADAR-ORCHESTRATOR-REPLY-2-TO-CLASSROOM-LAPTOP-AGENT-2026-08-24.md`
5. `docs/ai-workflow/AI-HANDOFF/RADAR-BRIEF-3-HERMES-PARITY-FOR-CLASSROOM-LAPTOP-2026-08-25.md`
6. `docs/ai-workflow/AI-HANDOFF/ORCHESTRATOR-HANDOFF-SINGLE-ACCOUNT-WORKSPACES-2026-08-25.md` (`b6c25867b350`)
7. `docs/ai-workflow/AI-HANDOFF/RADAR-ORCHESTRATOR-REPLY-3-SINGLE-ACCOUNT-RECONCILIATION-2026-08-25.md` (`5e86c014a1df`)
8. The canonical current rulebooks, hook definitions, egress gate, learning validator/schema, and the exact commits cited by reply 3. Report their current blob hashes.

Binding owner decisions:

- One existing Standard macOS teacher account is the only daily laptop login. Do not create another macOS account and do not require account-hopping.
- The administrator account is authentication-only.
- Separate front doors are implemented using folders, profiles, launchers, fresh sessions, policy gates, and application access boundaries inside the one Standard account.
- The existing locked classroom Hermes profile is unchanged.
- The owner approves the external personal/creative lane for material explicitly classified `public`, `synthetic`, or `personal-nonclassroom`. Unknown, mixed, classroom-specific, or derived-from-private material remains private and blocked.
- No real classroom data may enter Cloud, Radar, shared learning, or the Public-Creative-Lab while policy is unresolved.
- Model choice never changes the active lane. No automatic fallback is allowed.
- Radar, shared-Hermes delivery, and active project hooks remain disconnected/untrusted until their gates pass.
- Hardware for the laptop is Apple M3 with 16 GiB RAM.

## 2. Required independent hostile-review seats

Run each seat independently against the same frozen packet before synthesis. Do not let a later seat see an earlier seat's answer. Use these exact seats; if one is genuinely unavailable, mark it `[UNAVAILABLE]` and do not silently substitute another model:

1. **Ox Alpha** — attack paths, trust boundaries, privacy failures, credential and filesystem blast radius, bypasses, fail-open behavior.
2. **Grok 4.6** — adversarial operator behavior, confusing UX, unsafe defaults, social-engineering paths, false confidence, recovery failures.
3. **Qwen 3.8** — local Mac feasibility, performance and memory pressure, deterministic implementation, offline behavior, local-model and tool-call constraints.
4. **Kimi K3** — systems integration, state-machine gaps, concurrency, queueing, replay/idempotency, cross-machine and learning-packet edge cases.
5. **GLM 5.3** — architecture completeness, tool routing, workflow design, documentation quality, implementation sequencing, and acceptance coverage.

Each seat must return:

- `ACCEPT`, `REVISE`, or `REJECT`.
- Findings ranked `P0`, `P1`, or `P2`.
- The exact violated invariant or unhandled failure mode.
- A concrete correction, not a warning alone.
- Tests that would prove the correction.
- Any claim that is not directly verified marked `[UNKNOWN]`.

## 3. Synthesis rules

The orchestrator must adjudicate every seat finding. For each finding, record `accepted`, `modified`, or `rejected`, with evidence and the final design consequence.

The final synthesis must:

1. Select one architecture and one sequence. Do not ask the classroom-laptop agent to choose.
2. Prefer fail-closed behavior and reversible steps.
3. Treat content scanning as defense in depth, not proof that a file is safe.
4. State the limits of macOS application and folder permissions; do not claim a stronger sandbox than the OS actually provides.
5. Put classification and admission before DNS, API calls, telemetry, embeddings, transcription, remote tools, uploads, or remote inference.
6. Require a fresh session with no copied context on every front-door change.
7. Keep the locked classroom profile, unrelated folders, and credentials outside every Cloud/Radar application scope.
8. Keep Radar as a narrow typed job service, not a mounted drive, remote shell, general browser, or automatic model fallback.
9. Keep learning-packet queues separate: local/private memo versus independently authored public/synthetic/personal-nonclassroom packet. Never transform a private transcript into a shared packet by redaction.
10. Preserve the durable-model allowlist and human review rules. Do not force-add ignored inbox material and do not auto-push learning packets.

## 4. Required implementation-ready blueprint

Return a build specification detailed enough that the classroom-laptop agent can execute it mechanically without inventing architecture or policy.

Include:

### A. Exact filesystem and profile layout

- Complete tree rooted at the proposed Public-Creative-Lab.
- Exact path, purpose, owner role, expected permissions, active/inactive state, and data classification for every file and directory.
- Exact separation between the lab, the locked classroom Hermes profile, local-only staging, quarantine, learning queues, and future Radar staging.
- Explicitly state what must never be symlinked, mounted, copied, indexed, watched, backed up, or granted to Cloud applications.

### B. Rulebooks and instruction hierarchy

- Complete outline for the derived `AGENTS.md` and `CLAUDE.md`, with ONE RULE first.
- A rule-by-rule ledger showing which source rules are `kept`, `derived`, or `dropped`, and why.
- Exact maximum line counts and conflict precedence.
- Exact wording for the lane banner, stop response, classification attestation, switch confirmation, and no-fallback notice.

### C. Classification, provenance, and egress contracts

- Complete JSON Schemas for the lane policy, file provenance, outbound request envelope, audit receipt, quarantine receipt, Radar request, and Radar response.
- Exact classification state machine for `private`, `unknown`, `mixed`, `derived-from-private`, `public`, `synthetic`, and `personal-nonclassroom`.
- Exact rule IDs, exit codes, error shapes, maximum payload size, path-confinement behavior, symlink handling, secret detection, and log-redaction behavior.
- Explicit human attestation requirements and a statement of what automated scanning cannot establish.
- A single composite validator/emitter design so validation cannot race or diverge from sending.

### D. Codex and Claude integration

- Exact proposed—but inactive—Codex `hooks.json` and Claude project `settings.json` hook blocks.
- Exact event-to-handler mapping for session start, prompt submission, pre-tool use, stop, and session end.
- Exact hook command paths, inputs, outputs, timeouts, exit codes, blocking decisions, failure behavior, and platform/version assumptions.
- Identify which events are advisory and which are enforcement points.
- Explain project trust and how the owner reviews the files before activation.
- Define app permissions and launch commands without granting either application access outside the lab.
- No hook is to be activated by this review.

### E. Hermes, wiki, and learning plan

- Her Hermes brain layout, soul-file derivation, memory/inbox/corpus roles, local-model default, and resource limits appropriate for M3/16 GiB.
- Karpathy vault, Obsidian vault, and Graphify-on-demand layout, ingest flow, indexes, and a tested never-in contract.
- Ideas-habit specification: exact schedule mechanism, inputs, local-only rule, output schema, budget, feedback file, and required safety-status line. Keep scheduling disabled until explicitly approved.
- Exact local-only memo path and exact durable corpus path.
- Exact shared-learning staging contract and human approval step; keep transport disabled.

### F. Radar and workstation contract

- Laptop's role as a narrow queue client and the credentials or administrative capabilities it must never hold.
- Endpoint identity, certificate/public-key pin, authorization scope, independent revocation, queue lease, fairness, idempotency key, retry limit, timeout, cancellation, result quarantine, and no-fallback behavior.
- Typed request and response schemas with free text rejected wherever required by the governing privacy rulings.
- Owner-busy behavior and resource arbitration.
- Keep the route disconnected until every receipt is observed and approved.

### G. Messaging and household collaboration

- One recommended, separate household communication path.
- Exact allowed and forbidden payload shapes, retention, notification-only behavior, approval boundary, and tests.
- It must never transit through the locked classroom front door or inherit its context.

## 5. Required visuals

Supply all visuals as renderable Mermaid plus a concise text fallback:

1. System architecture and trust-boundary blueprint.
2. Three-front-door state machine.
3. End-to-end ingress, classification, egress, and audit flowchart.
4. Cloud/Radar preflight sequence diagram.
5. Radar queue/job lifecycle and failure paths.
6. Hermes local memo versus durable/shared learning-packet flow.
7. Wiki ingest, quarantine, indexing, and Graphify-on-demand flow.
8. Installation and activation dependency graph.

Also provide monospace wireframes for:

1. Front-door launcher.
2. Active-lane banner.
3. Lane-switch confirmation.
4. Blocked-content warning.
5. Pre-egress review and attestation.
6. Radar queue/status screen.
7. Learning-packet review/approval screen.
8. Offline/paper fallback screen.

Every visual must map labels to exact implementation components and paths.

## 6. Required tests and acceptance gates

Provide a complete synthetic-only test matrix covering at least:

- Allowed public, synthetic, and personal-nonclassroom fixtures.
- Unmarked, unknown, mixed, and derived-from-private blocking.
- Structured protected-field blocking without echoing matched content.
- Secret-shaped values, absolute paths, private/local network targets, symlinks, traversal, malformed JSON, oversized input, invalid UTF-8, and scanner failure.
- App attempting to read outside the lab.
- Model switch, resume, compaction, copied context, and automatic fallback attempts.
- Offline startup, Cloud outage, Radar outage, certificate mismatch, revoked identity, replayed request, duplicate result, timeout, and owner-busy queue.
- Audit receipts containing hashes/decisions but no payload.
- Learning allowlist, mistakes section, external-calibration section, draft status, human review, and forbidden auto-push.
- Positive controls proving the test harness is actually observing traffic and file writes.

For each test give fixture, action, expected decision, expected exit code, expected receipt, and the gate it proves. Define the exact command sequence and the acceptance threshold. All tests in the first implementation stage must be offline.

## 7. Mechanical build order and reply contract

Return one numbered implementation plan with exact commands, files, validations, owner-visible checkpoints, rollback steps, and stop conditions. Separate phases into:

1. Offline folder and policy scaffold.
2. Offline validator and synthetic tests.
3. Owner review of exact inactive hook files.
4. Project trust and application folder access.
5. Local Hermes brain/wiki work.
6. Shared-learning staging, still disabled.
7. Radar receipts and connection, still separately approval-gated.
8. Supervised acceptance and receipts.

At every phase state:

- Preconditions.
- Exact mutations.
- Exact verification commands.
- Expected output.
- Rollback.
- Red-gate stop conditions.
- What remains disabled.

Resolve prior reply 2 §12 and parity brief §7 inside this packet. For every prior open design question, choose and justify one recommended default. Do not return an option menu. Use `[OWNER ACTION]` only for a physical authorization or credential entry that the agent must never perform. Use `[UNKNOWN]` only for an external fact that cannot be verified from the repo or a read-only probe; pair it with the exact non-secret receipt needed.

Write the response to:

`docs/ai-workflow/AI-HANDOFF/PUBLIC-CREATIVE-LAB-HOSTILE-REVIEW-AND-BUILD-BLUEPRINT-2026-08-25.md`

Commit and push only that additive response file to `wip/comms-notifications-2026-07-05`. Do not amend, force-push, modify other files, or include another agent's work. Report the commit SHA and blob SHA.

End with the literal line `no open design questions` only when the classroom-laptop agent can follow the plan without choosing architecture, policy, file layout, hook behavior, schemas, tests, or sequencing. If an owner-only physical action remains, list it separately under `[OWNER ACTION]`; that does not count as an open design question when the recommended setting is already selected.
