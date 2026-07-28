# 130 — Fable AI Village Review Packet (Canonical Modes)

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL policy packet — running any paid mode still requires Sean's explicit per-run permission (CLAUDE.md rule 16) and the spend cap (`SWAN_VILLAGE_MAX_USD`)
- **Resolves:** the mode/brain-count drift the 2026-07-03 audit found across older Village docs. Where older docs disagree with this packet, this packet wins; where this packet is silent, `docs/ai-workflow/references/AI-VILLAGE-SYSTEM.md` and rule 46/50 govern.
- **Standing law (unchanged):** Village is the high-stakes review court, never the default builder. Tier-3 (paid Village) output is a deep draft that is ALWAYS ratified by a free triangle pass (Sean's 2026-06-16 rule); the Final Decider chain (Fable → best Claude → Codex) closes every verdict. All inputs are privacy-scrubbed: IDs/roles only, zero PII, zero secrets, no raw transcripts.

---

## 1. Mode registry

| Mode | Cost class | When to use | Output |
|---|---|---|---|
| `AI_VILLAGE_LIGHT` | Free–cheap (triangle + 1–2 extra lenses) | A second opinion stronger than the triangle but not worth full spend; doc sanity passes | Short verdict memo: consensus / contradictions / fused recommendation |
| `AI_VILLAGE_FULL` | Paid (full 13+ brain roster) | Rule 16 triggers: auth/authz, Stripe/billing, multi-tenant scoping, minors' data, legal, irreversible migration, pre-launch hardening | Full report + per-track findings + synthesis + triangle ratification |
| `AI_VILLAGE_HOSTILE` | Paid (adversarial subset) | "Prove this wrong" — a plan/fix that MUST survive attack before shipping | Ranked refutations, each CONFIRMED/REFUTED with evidence demands |
| `AI_VILLAGE_DESIGN` | Paid (design lead + reviewer chain, GLM-lead pattern from 2026-06-20) | Major surface redesigns, new page archetypes, brand-level calls | Design spec + doctrine-compliance check + WCAG findings |
| `AI_VILLAGE_SAFETY_GOVERNANCE` | Paid | Reviews of THIS control layer: operator bridge changes, tier ladder edits, new automation classes, kill-switch/receipt design | Threat model, gap list, "do not ship until" list |
| `AI_VILLAGE_PRODUCT` | Paid | Unproven product bets post-chromie; monetization/roadmap forks | Go / reshape / kill with reasoning + KPI hooks |
| `AI_VILLAGE_IMPLEMENTATION` | Paid | Pre-merge court for a large completed slice when triangle disagreement persists | APPROVE/REVISE/REJECT + blocker list |
| `AI_VILLAGE_AGENTIC_OS` | Paid | Before any Agentic OS capability graduates a tier (e.g., an automation moving from manual → scheduled, a new T2 allowlist entry) | Capability-grant review: abuse paths, receipt adequacy, kill-switch adequacy |
| `AI_VILLAGE_GRAPHIFY_OBSIDIAN` | Light/cheap | Before a bulk knowledge import or promotion wave | Pollution risk check, provenance audit, promote/quarantine/reject per item |
| `AI_VILLAGE_FABLE_WORKFLOW` | Light/cheap | Periodic audit of the Fable control layer itself (spec drift, registry rot, stale tiers) | Drift report + registry rows to update |

## 2. Role list (stable across modes; roster details live in AI-VILLAGE-SYSTEM.md / MODEL_VERSIONS.md)

- **Lens analysts (Phase 1):** UX, architecture, security, performance, competitive, persona, risk, frontend patterns, data safety, API design — the 13-track roster; US-only models for sensitive tracks per the 2026-04-06 privacy audit.
- **Debaters (Phase 2):** specialty pairs (code quality, design, data integrity), max 25 rounds.
- **Synthesis judge:** Fable when available; else best Claude (the Decider chain). Synthesis contract is identical everywhere: *consensus / contradictions / unique insights / blind spots / fused recommendation*.
- **Ratifier:** the free triangle (Claude+Codex+Gemini) — mandatory after every paid run.
- **Human gate:** Sean approves the spend before, and the verdict's consequences after. Village never executes anything; it is T1 (draft/verdict) by definition.

## 3. STORM / Roast principles (apply to every mode)

1. Multiple independent lenses before synthesis — no single-brain verdicts.
2. Contradiction mapping is a required output section, not an accident.
3. Adversarial review: at least one lens is instructed to refute, not improve.
4. Reliability labels on every claim (`[VERIFIED]` / `[LIKELY]` / `[HYPOTHESIS]` / `[UNKNOWN]`, per rule 51).
5. Go / reshape / kill is a legal outcome set — "reshape" must name the reshape.
6. Source/evidence verification where applicable: a Village claim about the repo without file:line evidence is `[HYPOTHESIS]` (rule 30 subagent skepticism applies to Village too).
7. **No "one agent said it, so it must be true."** A finding survives only if it survives the hostile lens and the triangle ratification.

## 4. Mode-specific question banks

**Hostile:** What breaks this in production within 24h? What did the builder assume that the repo doesn't prove? Which sibling caller was missed (rule 20)? What would a tired operator mis-click?
**Design:** Which CLAUDE.md design rule does this violate? Where is the generic-template smell? Does the weakest viewport (414px) survive? Is the signature moment earned or noise? Contrast receipts?
**Governance:** Which T3/T4 action could execute without a receipt? Which approval could be replayed after scope drift? Which kill switch is untested? Where does untrusted channel text touch command routing? What leaks to an external model?
**Implementation:** Does the diff match the spec's acceptance criteria verbatim? What's untested and why? What's the rollback? Is the claim tier (slice-clean vs baseline-clean, rule 56) honest?
**Product:** Who pays, why now, what dies if this wins? Which Core-Loop stage does it strengthen? What's the cheapest falsification test before building more?

## 5. Approval requirements per mode

- Light/cheap modes: no spend approval needed, but the run is logged (a receipt like any T1 workflow) and never substitutes for a rule-16 trigger.
- All paid modes: Sean's explicit per-run yes, pre-run cost estimate + hard cap, per-model cost summary after.
- `AI_VILLAGE_SAFETY_GOVERNANCE` and `AI_VILLAGE_AGENTIC_OS` additionally require the packet to include the current bridge + registry versions, so the court reviews reality, not memory.

## 6. Final arbitration format

Every Village run ends with one block, written by the synthesis judge and countersigned by the triangle:

```
VERDICT: APPROVE | REVISE | REJECT | GO | RESHAPE(named) | KILL
CONSENSUS: <2-4 bullets>
CONTRADICTIONS: <who disagreed about what, and how resolved>
BLIND SPOTS: <what no lens covered>
CONDITIONS: <do-not-ship-until list, each with an owner>
DECIDER: <Fable | fallback model> · TRIANGLE RATIFIED: yes/no · SPEND: $X.XX
```

Rule 46 unchanged: CLAUDE.md rules beat any Village suggestion; contradictions get logged, not adopted.
