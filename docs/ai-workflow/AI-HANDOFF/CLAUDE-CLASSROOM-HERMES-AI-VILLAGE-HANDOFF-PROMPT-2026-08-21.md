# Claude Handoff Prompt — Classroom Hermes + Radar Five-Model Review

**Date:** 2026-08-21  
**Owner:** Sean  
**Purpose:** Run the approved five-model review on the working Claude/AI Village surface, synthesize the findings, and produce the final pre-Mac implementation plan.  
**Scope:** planning and review only; do not install anything on the Mac in this task.  
**Privacy class:** the model input is the frozen public/synthetic packet only.

---

You are taking over the Classroom Hermes + Radar planning task because the Codex-side Windows panel launcher failed at process spawn. Do not ask Sean to re-explain the project. Read the exact files below and execute the bounded review.

## 1. Sean's authorization

Sean explicitly approved this one-time suite:

- Kimi K3: one call;
- GLM 5.3: one coding-plan call;
- Grok 4.6: one call;
- GPT-5.6 Sol Pro: one call;
- Fable 5: one final synthesis call after reading the first four replies.

Hard rules:

- combined OpenRouter cap: **$2.50**;
- GLM uses one existing plan-credit call;
- no automatic retries;
- no added models or seats without fresh approval;
- if one seat fails, record the failure and continue with the replies that exist;
- do not silently substitute a model;
- show a zero-call dry run and exact worst-case preflight before the first live call;
- before Fable, recalculate the remaining worst-case cap from the actual seed size and actual spend already reported.

## 2. Frozen input

Use only:

`docs/ai-workflow/AI-HANDOFF/CLASSROOM-HERMES-RADAR-PANEL-PACKET-2026-08-21.md`

Required SHA-256:

`FF09857BBDD5D86563AC1FA13CBB4ADA26C1DE04E1B16C43F7F1C31855061AE5`

Recompute the hash before sending. If it differs, stop and report the mismatch. Do not send the raw chat transcript, family/private infrastructure details, student information, client data, credentials, private names, or private SwanStudios context to any reviewer.

## 3. Codex attempt status — do not treat it as review evidence

The Codex panel runner attempted to spawn four opening seats. Windows returned `spawn EPERM` after three child processes appeared. No reviewer artifact was written. The three exact child processes were stopped and confirmed stopped. The output directory existed but contained no files.

OpenRouter `usage_daily` was observed at `0.0865262` and did not change across repeated monitoring or after termination. Because the parent process died before per-call receipts were captured, do not claim the failed attempt incurred zero cost; classify its billing as **UNPROVEN**. Sean has now explicitly directed this handoff to run the suite on Claude's working surface.

Do not reuse or summarize any supposed Codex model output; none exists.

## 4. Existing artifacts to read locally

Read:

1. `docs/ai-workflow/AI-HANDOFF/CLASSROOM-HERMES-RADAR-PANEL-PACKET-2026-08-21.md`
2. `docs/ai-workflow/AI-HANDOFF/CLASSROOM-HERMES-PRIVACY-EGRESS-ASSURANCE-GATE-2026-08-21.md`
3. `docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/CLASSROOM-HERMES-RADAR-MASTER-BLUEPRINT-2026-08-21.md`
4. `docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/AGENT-HANDOFF-PROMPT.md`
5. `docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/h0-setup/SETUP-RUNBOOK.md`

The older H0 materials are evidence and prior decisions, not proof that Hermes is installed on the current Mac. Keep policy/docs presence distinct from runtime installation.

## 5. Repo and coordination safety

This worktree is very dirty and contains unrelated user/agent changes.

- Read `AGENTS.md`/`CLAUDE.md` and the current coordination ledgers first.
- Read `.ai-workflow/coordination/codex.lane.md` before editing.
- Claim exact files in `.ai-workflow/coordination/claude.lane.md`.
- Preserve unrelated changes.
- Do not run `git add -A`.
- Do not commit, push, merge, deploy, or install anything on the Mac without Sean's separate approval.
- The Codex-side safety edits to `scripts/consult-panel.mjs` and `scripts/consult-grok.mjs` are uncommitted: Kimi is pinned to 20,000 output tokens with a $0.40 cap, and Grok's automatic retry was removed. Do not discard them accidentally.

## 6. Review procedure

Run the first four reviewers independently against identical packet bytes. Do not assign narrow roles; every seat must cover the complete brief.

Expected opening output directory:

`docs/ai-workflow/AI-HANDOFF/panel-classroom-hermes-radar-claude-2026-08-21/`

Expected files:

- `KIMI-PANEL-REVIEW.md`
- `GLM-PANEL-REVIEW.md`
- `GROK-PANEL-REVIEW.md`
- `SOL-PANEL-REVIEW.md`
- `FABLE-FINAL-SYNTHESIS.md`
- `INDEX.md`
- `DECISION-LEDGER.md`

Each reply must preserve the exact model ID, input/output/reasoning token usage where available, finish reason, actual cost, wall time, and completion/truncation status. A truncated or empty reply is not complete and must not be retried automatically.

After the four opening replies:

1. Build one bounded synthesis seed containing their replies and a short evidence index.
2. Compute the Fable worst-case cost using the actual seed size and the 16,000-output-token ceiling.
3. Confirm the combined maximum remains at or below $2.50.
4. If the cap would be exceeded, do not call Fable; report the exact new ceiling and ask Sean.
5. Otherwise run Fable exactly once as the final synthesis seat.

## 7. Required synthesis

Classify every material recommendation as:

- **ADOPT** — supported and belongs in the plan now;
- **REJECT** — wrong, unsafe, incompatible, or unsupported;
- **DEFER** — useful later but not part of the first Mac installation;
- **NEEDS PROBE** — changes the design but requires a hardware, school-policy, runtime, legal, or user-workflow fact.

The final synthesis must include:

1. panel coverage and any failed/missing seat;
2. actual and worst-case spend;
3. consensus findings;
4. contradictions and Fable's evidence-based ruling;
5. unique high-value findings;
6. blind spots no reviewer covered;
7. corrected two-year-old teaching doctrine;
8. corrected Fairmont toileting-policy treatment;
9. corrected Radar and marketplace-compliant sourcing plan;
10. corrected teacher daily/weekly workflow;
11. corrected Mac/Hermes/5090/SwanGuard architecture;
12. privacy attack paths and deterministic assurance gates;
13. the smallest first release likely to survive teacher fatigue;
14. explicit Mac prerequisites and acceptance tests;
15. a final verdict: **READY FOR SUPERVISED MAC SETUP**, **REVISE BEFORE MAC**, or **BLOCKED**.

Do not let a model declare the privacy middleware proven. Current status is P0 BLOCKED/UNPROVEN until the universal fail-closed egress broker, network enforcement, deterministic test campaign, and two clean fresh-vantage rounds have real evidence.

## 8. Blueprint update

Update:

`docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/CLASSROOM-HERMES-RADAR-MASTER-BLUEPRINT-2026-08-21.md`

Keep it at or below 300 lines. Preserve its useful Mermaid diagrams and wireframes. Incorporate only ADOPT decisions; record DEFER/REJECT/NEEDS PROBE in the decision ledger rather than bloating the blueprint.

The architecture invariants are:

- she gets her own Hermes profile/brain;
- Sean's personal Hermes memory is not cloned into hers;
- shared skills/research move through a controlled SwanGuard or versioned shared package;
- she has full SwanGuard permissions under a separate revocable identity;
- Qwen 3.8 remains available through the always-on private 5090;
- the Mac must retain a usable local/offline floor;
- no marketplace scraping or autonomous seller contact/purchase;
- no real child-specific content reaches external reviewers;
- AI prepares the adult and does not replace adult-child interaction;
- no Mac installation occurs in this review task.

## 9. Closeout

Run the required hostile dry loop until two consecutive fresh-vantage rounds find nothing fixable. Verify hashes, line limits, secret/PII patterns, model IDs, receipts, output completeness, total cost, and links.

Report to Sean in this order:

1. blockers or missing seats;
2. the panel's actual verdict in plain English;
3. the most important plan changes;
4. spend and evidence;
5. whether the plan is ready for supervised Mac desktop use;
6. the exact next prompt/action for the Mac task.

Do not claim the Mac is configured or the privacy layer is proven. Those require separate implementation and verification.

