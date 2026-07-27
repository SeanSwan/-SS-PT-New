# 14-Brain Recursive Consensus System
> Reference doc extracted from CLAUDE.md. Loaded on-demand, not every message.
> Read when: running AI Village validation, model audit

---

## 14-Brain Recursive Consensus System (MANDATORY)
SwanStudios uses a 14-Brain AI validation pipeline for Sean's development work. **Episodic, paid, reserved.** Tier-C escalation only — see "When to invoke" below.

### When to invoke (Tier-C trigger gate)

The Village is the **Tier-C** layer of the QA pipeline. Canonical trigger list lives in `QA-PIPELINE.md` §"Tier C — AI Village (episodic, reserved)". Do **not** duplicate the list here — invoke this doc only after the trigger check has been satisfied per QA-PIPELINE.md.

Triggers, by name only (full binary definitions in QA-PIPELINE.md):

1. Auth or authz code path
2. Stripe payment or webhook code path
3. Multi-tenant data scoping change
4. Sean-declared pre-launch hardening (literal-phrase enumeration in QA-PIPELINE.md)
5. Minor's-data code path
6. Cross-service architectural change (3+ top-level dirs)

**Permission gate:** even when a trigger fires, Village invocation requires Sean's explicit per-run permission (CLAUDE.md rule 16). Trigger means "Sean SHOULD consider Village; surface the qualifying trigger and ask," not "auto-run."

**Anti-pattern:** running this orchestrator for changes outside the trigger list. That is a tier-inflation violation per `QA-PIPELINE.md`. Use Tier-A + Tier-B only for non-trigger work.

```bash
# Run validation on recent changes (only after Tier-C trigger satisfied + Sean's per-run permission)
node scripts/validation-orchestrator.mjs

# Run on specific files
node scripts/validation-orchestrator.mjs --files path/to/file.tsx

# Run on staged changes
node scripts/validation-orchestrator.mjs --staged
```

### Architecture (Sean's Dev AI Village — accepts cost, use sparingly)
- **Phase 1:** 12 parallel validators:
  | # | Model | Track | Cost |
  |---|-------|-------|------|
  | 1 | Gemini 2.5 Flash | UX & Accessibility | FREE |
  | 2 | Step 3.5 Flash:free | Security Scan #1 | FREE |
  | 3 | Gemini 3 Flash | Performance Review | FREE |
  | 4 | MiniMax M2.5:free | Architecture & Bugs | FREE |
  | 5 | MiniMax M2.1 | Competitive Intelligence | ~$0.01 |
  | 6 | Nvidia Nemotron 3 Super:free | Security Deep-Dive | FREE |
  | 7 | Qwen 3.6 Plus:free | Code Architecture | FREE |
  | 8 | Nvidia Nemotron 3 Super:free | Data Safety Audit | FREE |
  | 9 | Step 3.5 Flash:free | Bug Hunter II | FREE |
  | 10 | Claude Sonnet 4.6 | Code Quality (premium) | ~$0.05-$0.10 |
  | 11 | Claude Sonnet 4.6 | Data Integrity (premium) | ~$0.05-$0.10 |
  | 12 | Gemini 3.1 Flash Lite | Frontend UX & Patterns | ~$0.01 |
  | — | DeepSeek V3.2 | User Research | ~$0.01 |
- **Phase 2:** Specialty recursive debates (max 5 rounds each):
  - **Security Debate:** Step 3.5 Flash:free ↔ Nvidia Nemotron 3 Super:free (FREE)
  - **Code Quality Debate:** Claude Sonnet 4.6 ↔ Qwen 3.6 Plus:free (~$0.05)
  - **UX/UI Design Debate:** GLM 5.2 (Lead Designer, final say) ↔ Gemini 3.1 Pro (Reviewer) — design slot only; GLM on-test from 2026-06-20
    > ⚠ The Phase-1/2/3 model names elsewhere in this doc (Step 3.5 Flash, Qwen 3.6, MiniMax M2.5/M2.1, Mercury 2) are STALE vs the live `validation-orchestrator.mjs` (post-2026-04 privacy audit + drift-fix). Treat the orchestrator's `MODELS` map + `config/MODEL_VERSIONS.md` as source of truth. Full doc reconciliation is a separate hygiene pass.
- **Phase 3: CEO Review + Smart Escalation:**
  - Gemini 3.1 Pro reviews ALL Phase 2 debate conclusions
  - **Smart Gate:** IF any debate has CRITICAL findings OR no consensus → Mercury 2 ($0.25/$0.75/M) and MiniMax M2.7 ($0.30/$1.20/M) enter as cross-validators
  - **Smart Gate:** IF all debates reached consensus with no CRITICAL → Mercury 2 and M2.7 SKIP entirely (save tokens)
  - Gemini 3.1 Pro makes the call; Opus 4.6 CEO override via CLAUDE.md still applies
- **Phase 4 (MANDATORY): Opus CEO Review** — Claude Opus 4.6 reviews Phase 2+3 consensus, then debates Gemini 3.1 Pro directly for max 5 rounds. **Opus 4.6 = FINAL authority on ALL decisions.**
  - Opus reads the Phase 2 debate logs + fix-instructions.md + design-recommendations.md
  - Opus reviews what the specialty debates agreed to, identifies gaps, corrects errors
  - Opus engages Gemini CTO directly via `node scripts/consult-gemini.mjs --ask`
  - Max 5 rounds. Opus has FINAL SAY on severity ratings, launch blockers, deferrals, and implementation
  - Opus must verify Gemini's recommendations against CLAUDE.md (theme tokens, conventions, etc.)
  - If Gemini references RETIRED theme tokens (Galaxy-Swan: #0a0a1a, #00FFFF, #7851A9), Opus REJECTS and corrects
  - Output: Final CEO ruling saved to `AI-Village-Documentation/validation-prompts/latest/opus-ceo-ruling.md`
- **Output:** `AI-Village-Documentation/validation-prompts/latest/` (summary, per-track reports, debate logs, fix instructions, opus-ceo-ruling)
- **Setup:** `OPENROUTER_API_KEY` in .env (required). `GEMINI_API_KEY` in .env (enables Phase 2+3+4 debates).
- **Cost:** ~$0.10-$0.25/run typical, ~$0.15-$0.35 with escalation. Use sparingly.
- **Full docs:** `AI-Village-Documentation/AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V5.md`
- **BANNED MODELS:** No Grok (any version). No X-AI models. Hard no, never suggest.

### Chain of Command (MANDATORY)
The AI Village has a strict hierarchy for decision-making:
1. **Claude Opus 4.6 (CEO)** — FINAL authority on ALL decisions. Overrides everyone.
2. **Gemini 3.1 Pro (CTO / Creative Director) — CONTEXT ONLY (amended 2026-07-25).** ⚠ **No longer the design authority.** Design arbitration now belongs to **Kimi K3 + Opus 5**. Gemini may supply context, research, and options *into* a design decision; it does not arbitrate, set direction, or hold veto.
3. **Claude Sonnet 4.6 (VP Engineering)** — Premium code quality analysis. Used in Phase 1 + Code Quality debate.
4. **Mercury 2 + MiniMax M2.7 (Specialist Consultants)** — Only called in for CRITICAL findings or stalled debates. Smart-gated to avoid token waste.
5. **Phase 1 free validators (Staff Engineers)** — Surface findings from diverse training perspectives. No decision authority.

This hierarchy applies to:
- Severity ratings (CRITICAL/HIGH/MEDIUM/LOW)
- Launch blocker decisions
- Deferral decisions (what ships now vs post-launch)
- Theme token enforcement (Opus enforces CLAUDE.md as source of truth)
- Any disagreement between debate participants

### When to Run
- **MANDATORY:** Before pushing to main (production deploys)
- **MANDATORY:** Before merging PRs with >100 lines changed
- **RECOMMENDED:** After major refactors or new features

### Planning Mode with Web Research (--mode plan)
The AI Village supports a planning mode that analyzes feature plans before implementation:
```bash
node scripts/validation-orchestrator.mjs --mode plan --document docs/ai-workflow/blueprints/PLAN.md
```
- **13 planning brains** analyze the plan from 13 different angles (UX, architecture, security, performance, competitive intel, user personas, risk, frontend patterns, data safety, API design, module architecture, mobile/edge cases, strategic research)
- **3 grounded research brains** (Brain #1, #5, #13) use **Google Search Grounding** (FREE) for real-time web research:
  - Brain #1 (UX Research): Searches for competitor features, UI/UX trends, onboarding patterns
  - Brain #5 (Competitive Intel): Searches for competitor pricing, market sizing, fitness tech trends
  - Brain #13 (Strategic Research & Gap Analysis): Deep research on technology gaps, regulatory compliance, industry trends, monetization strategies, future-proofing opportunities
- Grounding is FREE — uses Google's built-in search via Gemini direct API, no SerpAPI credits consumed
- Report output includes **Web Research Sources** section with all cited URLs
- **Gap Finding (MANDATORY):** Every planning run MUST include Brain #13 which identifies what the plan is MISSING, not just what it already covers. This ensures no blind spots.

### Gemini CTO Consult with Research
```bash
node scripts/consult-gemini.mjs --plan --file plan.md --research   # Plan review with web search
node scripts/consult-gemini.mjs --ask "question" --research         # Question with web search
```
- `--research` flag enables Google Search Grounding on Gemini 3.1 Pro consultations
- Use for competitive analysis, market research, technology trend evaluation

### Gap Finding & Strategic Enhancement (MANDATORY for Planning)
When running `--mode plan`, the AI Village MUST:
1. **Identify missing features** — What competitors have that the plan doesn't address
2. **Surface regulatory risks** — Health data laws, AI guidance, accessibility requirements
3. **Find technology gaps** — New APIs, SDKs, or patterns the plan should leverage
4. **Recommend future-proofing** — Platform trends, emerging standards, cross-platform considerations
5. **Cite sources** — Every claim must be backed by a real URL from web research
This requirement ensures the AI Village adds strategic value beyond code review.

### Model Audit Protocol (Weekly)
OpenRouter model rankings shift weekly. Run `node scripts/openrouter-model-audit.mjs` (or check manually at https://openrouter.ai/rankings) every Monday to:
- Check if any current free models lost free status
- Identify new free models that outperform current ones
- Compare benchmark scores against current Phase 1 lineup
- Output: `AI-Village-Documentation/model-audits/latest.md`
