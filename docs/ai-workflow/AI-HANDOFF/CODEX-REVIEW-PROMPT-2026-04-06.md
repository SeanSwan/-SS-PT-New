# Codex Review Task: SwanStudios Master Fix Plan

## Your Role
You are reviewing a comprehensive fix plan for SwanStudios (SS-PT), a production personal training SaaS. Your job is to:

1. Read ALL files listed below
2. Analyze the fix plan for correctness, completeness, and risk
3. Identify anything missing, wrong, or dangerous
4. Provide your own recommendations and corrections
5. Flag any fixes that could break production

**CRITICAL**: You must read and follow the project's CLAUDE.md before making ANY suggestions. This project has strict rules (no Material-UI, no hardcoded colors, dark-first design, 44px touch targets, Victory only for charts, no yoga/meditation language, no Grok). Violating these rules has broken production before.

---

## Files to Read (IN THIS ORDER)

### 1. Project Protocols (READ FIRST — These Override Everything)
```
CLAUDE.md                                          # Project rules, palette, stack, mandatory protocols
```

### 2. Memory Index (Project Context)
```
<HOME>\.claude\projects\<SCRATCH-KEY>\memory\MEMORY.md
```

### 3. The Fix Plan Under Review
```
docs/ai-workflow/AI-HANDOFF/MASTER-FIX-PLAN-2026-04-06.md
```

### 4. AI Village Consensus Documents (What 14 AI Brains Agreed On)
```
AI-Village-Documentation/validation-prompts/latest/fix-instructions.md
AI-Village-Documentation/validation-prompts/latest/security-plan.md
AI-Village-Documentation/validation-prompts/latest/architecture-plan.md
AI-Village-Documentation/validation-prompts/latest/design-specification.md
AI-Village-Documentation/validation-prompts/latest/summary.md
```

### 5. Original Strategy Briefs (What We're Fixing)
```
docs/ai-workflow/AI-HANDOFF/P0-BLOCKERS-BRIEF-2026-04-06.md
docs/ai-workflow/AI-HANDOFF/UX-MOBILE-REFACTOR-BRIEF-2026-04-06.md
docs/ai-workflow/AI-HANDOFF/AI-PRODUCT-STRATEGY-BRIEF-2026-04-06.md
docs/ai-workflow/AI-HANDOFF/PLAYWRIGHT-QA-SPEC-2026-04-06.md
docs/ai-workflow/AI-HANDOFF/COMPREHENSIVE-SITE-REFRACTOR-BRIEF-2026-04-06.md
```

### 6. Backend Code (Verify Root Causes)
```
backend/models/index.mjs                           # Check: MovementAnalysis export missing?
backend/models/associations.mjs                    # Check: FK constraints, users vs "Users"
backend/routes/workoutPlanRoutes.mjs               # Check: POST / handler at line 157
backend/routes/movementAnalysisRoutes.mjs          # Check: POST / handler
backend/routes/equipmentRoutes.mjs                 # Check: POST /:id/scan at line 473
backend/routes/sessions.mjs                        # Check: /upcoming and /history routes exist?
backend/routes/storeFrontRoutes.mjs                # Check: GET / handler at line 84
backend/core/routes.mjs                            # Check: All routes registered
```

### 7. Frontend Code (Verify UX Issues)
```
frontend/src/components/DashBoard/Pages/content-studio/RemotionTemplateGallery.tsx
frontend/src/components/WorkoutManagement/WorkoutPlanBuilderStyles.ts
frontend/src/components/WorkoutManagement/ExerciseSelectionStep.tsx
frontend/src/components/WorkoutManagement/ExerciseLibrary.tsx
frontend/src/pages/shop/OptimizedGalaxyStoreFront.tsx
```

---

## What We Need From You

### A. Root Cause Verification
For each P0 blocker in the fix plan, verify:
- Is the stated root cause correct?
- Is the proposed fix sufficient?
- Could the fix introduce new bugs?
- Are there other files affected that the plan missed?

### B. Risk Assessment
For each phase (0-5), assess:
- What could go wrong during implementation?
- What's the rollback strategy if a fix breaks something?
- Are there dependency chains between fixes (must fix X before Y)?

### C. Missing Items
- Are there P0 issues in the original briefs that the fix plan missed?
- Are there backend routes or models the plan didn't account for?
- Are there frontend components with the same issues that weren't listed?

### D. Code Corrections
If any proposed code snippets in the fix plan are wrong:
- Show the correct implementation
- Explain why the proposed version would fail

### E. Production Safety
Flag any fix that:
- Could cause data loss
- Could break authentication
- Could cause downtime
- Needs a database migration
- Should be behind a feature flag
- Needs to be deployed in a specific order

### F. Codex-Specific Scope
When you (Codex) are later tasked with implementing fixes:
- Which fixes are safe for you to handle autonomously?
- Which fixes need human review before merge?
- Which fixes are outside your safe scope?

---

## Rules You MUST Follow

1. **No Material-UI** — styled-components only
2. **No hardcoded colors** — use `var(--token, #fallback)` pattern
3. **Dark-first design** — default theme is `crystalline-dark`
4. **44px min touch targets** on all interactive elements
5. **No yoga/meditation language** — use "stretching"/"flexibility"
6. **Victory only** for charts (no Recharts)
7. **No Grok/X-AI** models anywhere
8. **Commit style**: `type(scope): description`
9. **Max 300 lines per file** — extract when approaching limit
10. **FK constraints must reference `"Users"`** (quoted), not `users`
11. **DO NOT add README content to the production site** — this has broken production before
12. **DO NOT use retired Galaxy-Swan theme** colors (`#0a0a1a`, `#00FFFF`, `#7851A9`)
13. **Test locally before committing** — `npm run dev` from root

---

## Output Format

Structure your response as:

```markdown
## Root Cause Verification
[For each P0, confirm or correct the root cause]

## Risk Assessment
[For each phase, list risks and mitigations]

## Missing Items
[Anything the plan missed]

## Code Corrections
[Any wrong code in the plan, with fixes]

## Production Safety Flags
[Anything dangerous, with safe deployment order]

## Codex Scope Assessment
[What Codex can safely handle vs needs human review]

## Final Recommendations
[Your top 5 recommendations for the fix sprint]
```

---

*This review will be fed into the AI Village 14-Brain system for final validation before implementation begins.*
