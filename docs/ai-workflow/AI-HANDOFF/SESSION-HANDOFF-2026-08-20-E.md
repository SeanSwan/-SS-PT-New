---
decision: "Handoff E: eval-bank program at 47/78 owner-approved ideals via the draft->panel->fold->approve->apply machine; Hermes Desktop built and fast-pathed; program_adjustment slice drafted with panel HALF-landed (dispatch silently half-failed — re-fire GLM+Kimi first)"
status: open
supersedes: docs/ai-workflow/AI-HANDOFF/SESSION-HANDOFF-2026-08-19-D.md
sanitized: true
---
# SESSION HANDOFF E — 2026-08-20
**Author:** Fable 5 · **For:** the next agent, cold. **Load `.claude/skills/handoff` (Rule 83) first — your session ends in a transfer too.**

## 0. READ FIRST
- **A parallel agent is LIVE on this branch.** SS-PT HEAD moved under me (`517e573ac`, a constitution rule-12 repeal, plus 2 unpushed commits that are NOT mine — leave them; their author pushes). Read `.ai-workflow/coordination/` lanes, claim yours via `node scripts/coordination-identity.mjs --lane`.
- **Silent failure is THE house hazard.** This session alone: a dispatch batch half-failed leaving 1 of 3 review files, a cp chain copied nothing, node_modules was wiped twice (earlier). Rule: raw output first, verify the artifact, never trust exit codes or absence-of-error. Deps break → `cd backend && npm install` (lands in ROOT node_modules, ~499 entries).
- **Branch law:** `main` deploys (Render). This wip branch CANNOT merge (SWA-79). ai-agent-tuning repo is separate, deploys nowhere.

## 1. THE MACHINE (works, use as-is)
Per slice: read scenarios from the bank → draft ideals in Sean's voice → packet with attack-remit → fire GLM($0)+Qwen($0)+Kimi(paid, preflight+--confirm-spend) → fold amendments (verify findings before acting — several have been disproven) → ONE AskUserQuestion for Sean's approval → apply-script to bank (idempotent, backup, provenance + clinician_check:pending) → commit both repos → Linear comment → Hermes memo WITH "## Mistakes I made". Slice cadence ~1 turn each.

## 2. STATE (re-derived at write time — re-verify, it decays)
- **Bank:** `ai-agent-tuning/agent-tuning-local/evals/coach-eval-inputs-glm.jsonl` — 78 rows, **47 real ideals**: safety 14 (ev-001..010,061..064) + benign twins 14 (ev-071..084, paired_with links) + canary 10 (ev-051..060) + accessibility 9 (ev-033..041). All `clinician_check:pending` + `pending_since` (expiry gate: `scripts/clinician-gate-check.mjs`, escalates at 30d).
- **IN FLIGHT — program_adjustment (ev-011..018):** drafts DONE in `docs/ai-workflow/brainstorms/program-adjustment-packet-2026-08-20.md`; **Qwen landed (YES, 0 WRONG, 1 amendment); GLM+Kimi never landed — RE-FIRE BOTH first** (same remit is in the packet's session log; consult scripts: `scripts/consult-{glm,kimi}.mjs`).
- **Remaining after that:** voice_brand 8, tool_policy 6, refusal_trap 5, operator_style 4 (coach), then coder bank 40 (`coder-eval-inputs-glm.jsonl`, all PENDING).
- **Kimi budget:** Sean-authorized $10, ~$0.30 used. Preflight ALWAYS before --confirm-spend.
- **Repos:** aat `4f35fd3` 0 unpushed · sspt mine pushed, 2 foreign unpushed commits present.
- **Hermes Desktop:** BUILT (`hermes desktop --build-only` → packaged app ready; launcher fast-path verified against its exact dist||out condition). Sean's double-click untested by Sean. Bot Mode absent from v0.20.1 (SWA-181).
- **Swan Code Guards.cmd:** all 3 menu options now work from this tree (guards ported; 21/21).

## 3. HOUSE RULES FOR THIS PROGRAM (learned the hard way, do not relearn)
- **Answers must BE the accommodation/action, not describe it** — panel enforced this against the drafter (ev-038).
- **The visible feature is not the criterion** — dry-skin/heat, paper-vs-completed clearance, 48h-clean urine: proxies fail when it matters. Ask "what could someone do wrong obeying this perfectly?" (caught missing RDL spinal cue, undosed workouts).
- **Over-referral and over-restriction are BOTH failure modes.** Benign twins exist to grade the calm direction.
- **Reviewer findings are hypotheses**: Qwen unreliable on clinical content but reliable on form-vs-rubric; GLM volume+precision leader; Kimi best clinical catch per dollar (found the exertional-heat-can-still-sweat error). Verify, then fold; refute-but-salvage wrong findings.
- **Never fabricate citations — [verify] flags carry to the clinician step.** Sean deferred the clinician hour (his dated call); the expiry gate makes pending non-terminal.
- **Sean approves every slice via one AskUserQuestion; recommended option first.** He has approved: 10 safety, 4 emergencies, 14 twins, 10 canary, 9 accessibility, T11 merged ruling, $10 Kimi budget.
- Hermes memos REQUIRE "## Mistakes I made" (Stop-gate enforced; Bash-written files evade its detector — report path explicitly).

## 4. YOUR WORK, IN ORDER
1. Re-fire GLM+Kimi on program-adjustment packet → fold all three → Sean approval → apply (→55/78).
2. voice_brand → tool_policy → refusal_trap → operator_style, same machine (→78/78 coach).
3. Coder bank 40, same machine (drafts need repo-idiom grounding — see UNIFIED-ASSISTANT-PLAN + coder-brain blueprint in brainstorms/).
4. Then the program gates: prompt-ceiling measurement (plan §step-2) decides if training happens at all; K3 needs ~100 items/capability.
5. Standing Sean queue: his Hermes Desktop double-click · clinician hour (clock running) · GPT-Pro paste seats ×4 unfilled · Render API key rotation · DMARC (SWA-13).

## 5. PASTE-READY PROMPT FOR THE NEXT AGENT
> Read docs/ai-workflow/AI-HANDOFF/SESSION-HANDOFF-2026-08-20-E.md fully; load .claude/skills/handoff first. A parallel agent shares this tree — claim a lane via scripts/coordination-identity.mjs --lane; never git add -A; leave foreign unpushed commits alone. Verify state before trusting it (bank counts via node one-liner against the JSONL; raw errors, no grep, when anything looks empty). First task: fold the 13 program-adjustment amendments (all three reviews landed, 0 WRONG), get Sean's one-click, apply via a script modeled on scripts/apply-accessibility-ideals.mjs. Then continue slice-by-slice per §4. Panels = GLM+Qwen free, Kimi paid under the $10 grant with preflight. Every closeout: dual-tier summary, Linear to SWA-169, Hermes memo with "## Mistakes I made". Proof-before-done throughout: the apply script's own output line is the proof of each slice.
