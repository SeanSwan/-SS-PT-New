# Recursive Planning Protocol — MANDATORY Before Building

> **Status:** ACTIVE | **Authority:** Sean (Owner) + Opus CEO | **Created:** 2026-04-04

## Core Rule

**NO implementation begins without recursive planning.** Every feature, fix, or system change MUST go through a planning phase before any code is written. This is non-negotiable.

## The Standard

**Plan until there is NOTHING left to add.** The plan must be so exhaustive that implementation is just "typing out the plan." If you can think of one more thing to enhance, improve, or consider — the plan isn't done. Keep recursing.

When the plan is presented to Sean, he should be able to say "I can't think of anything else." Only then is it ready.

## What "Recursive Planning" Means

1. **Research** — Audit what exists, read the code, understand dependencies
2. **Web Research** — Search online for best practices, competitor analysis, API docs (use Gemini with search grounding for critical decisions — ask permission for Village-level web research)
3. **Plan** — Draft the approach, identify files to change, anticipate side effects
4. **Validate** — Get the plan reviewed (by Opus internal reasoning, Gemini CTO consultation, or AI Village)
5. **Refine** — Incorporate feedback, adjust the plan
6. **Re-examine** — Ask "what am I missing? what could go wrong? what would make this better?" Loop back to step 1-5 until the answer is "nothing"
7. **Document** — Save the plan to memory/docs so future sessions can reference it
8. **THEN build** — Only after steps 1-7 are complete and the plan is exhaustive

## The Recursive Planning Loop (Full Lifecycle)

```
┌─────────────────────────────────────────────────────────┐
│  PHASE A: Internal Recursive Planning (FREE)            │
│  Opus + Gemini CTO — recurse until plan is exhaustive   │
│  ↓                                                      │
│  Is the plan FINAL? Can you think of ANYTHING to add?   │
│  NO → Loop back to Phase A                              │
│  YES ↓                                                  │
├─────────────────────────────────────────────────────────┤
│  CHECKPOINT: Ask Sean — "Plan is final. Run 14-brain?"  │
│  Sean says NO → Build from plan                         │
│  Sean says YES ↓                                        │
├─────────────────────────────────────────────────────────┤
│  PHASE B: AI Village 14-Brain Validation (~$0.33)       │
│  Run the FINAL plan through Village — not drafts        │
│  ↓                                                      │
│  Village returns findings                               │
│  ↓                                                      │
├─────────────────────────────────────────────────────────┤
│  PHASE C: Post-Village Recursive Refinement (FREE)      │
│  Incorporate Village findings into plan                  │
│  Opus + Gemini CTO — recurse until NOTHING left to add  │
│  ↓                                                      │
│  Is the refined plan FINAL?                             │
│  NO → Loop back to Phase C                              │
│  YES ↓                                                  │
├─────────────────────────────────────────────────────────┤
│  CHECKPOINT: Ask Sean — "Need another Village run?"     │
│  Sean says NO → Build from refined plan                 │
│  Sean says YES → Go to Phase B (rare — only if major    │
│                   changes were made during refinement)   │
├─────────────────────────────────────────────────────────┤
│  BUILD — Plan is locked. Execute.                       │
└─────────────────────────────────────────────────────────┘
```

**Key principle:** The AI Village sees the FINAL plan, not drafts. All the cheap/free recursive planning happens BEFORE the Village run. After the Village returns findings, another round of free recursive planning incorporates them. A second Village run only happens if Sean approves AND the plan changed significantly.

**Typical flow:** Phase A (free, 3-10 loops) → Village (1 run, ~$0.33) → Phase C (free, 1-3 loops) → Build. Total Village cost: $0.33. Rarely $0.66 if a second run is needed.

## Planning Tiers

### Tier 1: Opus Internal Planning (FREE — default for most tasks)
- **When:** Bug fixes, small features, config changes, styling tweaks, file cleanup
- **How:** Opus CEO reasons through the plan internally, documents approach, proceeds
- **Cost:** $0 (no external API calls)
- **Token budget:** Only Opus context tokens (already being used)

### Tier 2: Gemini CTO Consultation ($0.01-$0.05 per consult)
- **When:** Design decisions, UI/UX work, architecture questions, feature scoping
- **How:** `node scripts/consult-gemini.mjs --plan|--design|--review`
- **Cost:** Minimal (Gemini Flash pricing)
- **Use freely for:** Design specs, plan reviews, competitive analysis
- **Token budget:** ~2K in / ~2K out per consultation

### Tier 3: 14-Brain AI Village ($0.20-$0.50 per run)
- **When:** CRITICAL decisions only — major features, architecture changes, security reviews, revenue-impacting work
- **How:** `node scripts/validation-orchestrator.mjs --plan|--files|--staged`
- **Cost:** ~$0.33 per run (12 validators + 3 debates + escalation)
- **REQUIRES EXPLICIT PERMISSION FROM SEAN BEFORE RUNNING**
- **Never run casually or "just to be safe"**

## When to Use Each Tier

| Scenario | Planning Tier | Ask Permission? |
|----------|--------------|-----------------|
| Fix a CSS bug | Tier 1 (Opus) | No |
| Add a new component | Tier 1 (Opus) | No |
| Redesign a page | Tier 2 (Gemini CTO) | No |
| New feature design | Tier 2 (Gemini CTO) | No |
| Subscription/payment system | Tier 3 (14-Brain) | **YES — ask Sean** |
| Security-critical changes | Tier 3 (14-Brain) | **YES — ask Sean** |
| Architecture rewrite | Tier 3 (14-Brain) | **YES — ask Sean** |
| Revenue-impacting decisions | Tier 3 (14-Brain) | **YES — ask Sean** |
| "Should we use the Village?" | Ask Sean first | **Always** |

## Token Cost Management

### Rules
1. **Never run AI Village without Sean's explicit approval**
2. **Gemini consultations are cheap** — use freely for design/planning
3. **Opus internal reasoning is free** — use extensively
4. **Batch Village runs** — if multiple decisions are pending, combine into one run
5. **Don't re-run Village** on the same topic unless something materially changed
6. **Save Village outputs** — future sessions reference them instead of re-running

### Monthly Budget Awareness
- Sean pays ~$20/mo for Gemini API (personal + platform use)
- OpenRouter free models for platform users = $0
- AI Village runs ~$0.33 each — budget ~10 runs/month max ($3.30)
- Gemini consultations ~$0.03 each — budget ~50/month ($1.50)
- **Total AI workflow budget: ~$5/month** (leaves $15 for Sean's personal use)

## Documentation Requirements

After planning, the plan MUST be saved:
- **Small tasks:** Note the approach in the commit message or PR description
- **Medium tasks:** Save to a memory file with the plan details
- **Large tasks:** Save to `docs/ai-workflow/` as a reference doc AND memory file
- **Village-validated plans:** Always save Village output + summary to memory

## Anti-Patterns (DO NOT)

- ❌ Start coding without a plan
- ❌ Run AI Village for trivial decisions
- ❌ Run AI Village without asking Sean first
- ❌ Re-run Village on the same topic within the same week
- ❌ Skip Gemini CTO consultation for design work and go straight to Village
- ❌ Treat Village validation as a rubber stamp — actually read and incorporate findings
- ❌ Build first, plan later
- ❌ "Let me just quickly add this" without thinking through side effects

## Web Research During Planning

Online research is part of exhaustive planning. Use it to find best practices, API docs, competitor pricing, library options, etc.

### Research Tiers (Same cost discipline as planning)

| Method | Cost | When to Use |
|--------|------|-------------|
| **Opus WebFetch/WebSearch** | Free (built-in tool) | API docs, library READMEs, quick lookups |
| **Gemini CTO with `--research` flag** | ~$0.03 | Competitive analysis, design patterns, market research |
| **AI Village with web-grounding** | ~$0.33+ | Only for CRITICAL planning — ask Sean first |

### Rules
- Opus can freely search the web for technical docs, API references, pricing pages
- Gemini CTO consultations with `--research` flag enable Google Search Grounding (3 brains have it)
- AI Village web research is expensive — only for critical planning with Sean's permission
- Always save research findings to memory so future sessions don't re-search
- Don't search for things you can find in the codebase — read the code first

## Examples

### Good: "I need to add a donation slider to the paywall"
1. Opus reads FrostedPaywall.tsx, understands current structure (Tier 1)
2. Opus drafts plan: add slider component, wire to handleSubscribe, Gemini has CSS specs
3. Consult Gemini CTO for slider design specs (Tier 2 — cheap, design-focused)
4. Build per plan + Gemini specs

### Good: "We need to build the entire subscription store"
1. Opus audits existing code (Tier 1 — free)
2. Consult Gemini CTO for design direction (Tier 2 — cheap)
3. Ask Sean: "This is a major revenue feature. Should I run it through the 14-brain Village?"
4. Sean says yes → Run Village in planning mode (Tier 3 — ~$0.33)
5. Save plan to memory + docs
6. Build per validated plan

### Bad: "Let me run the Village to check if this button color is right"
- This wastes $0.33 for a decision that Gemini CTO ($0.03) or Opus (free) can handle.
