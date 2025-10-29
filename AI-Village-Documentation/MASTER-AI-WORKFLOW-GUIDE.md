# SWANSTUDIOS MASTER AI WORKFLOW GUIDE
## The Complete System: AI Village + Multi-AI Code Approval

**Last Updated:** 2025-10-20
**Purpose:** Combine AI Village methodology with 7-checkpoint quality pipeline
**Your Setup:** ChatGPT-5, Claude 4.5 Sonnet, Roo Code (Grok), Gemini, Codex

---

## 🎯 THE COMPLETE SYSTEM (2 Parts)

### **PART 1: AI VILLAGE (Role Assignment)**
Who does what in your AI team

### **PART 2: CODE APPROVAL PIPELINE (Quality Gates)**
How code flows through 5-7 AI reviews before Git push

---

# PART 1: AI VILLAGE ROLE ASSIGNMENT

## Your AI Team Roster:

| Role | AI Tool | Use For |
|------|---------|---------|
| **Orchestrator** | Claude Desktop (4.5 Sonnet) | Planning, PLAN.md, feature breakdown |
| **Architect** | Claude Desktop (4.5 Sonnet) | Database schema, API design, security architecture |
| **Coder (Backend)** | Roo Code (Grok Code Fast) | Express/Node APIs, Sequelize models |
| **Coder (Frontend)** | Gemini Code Assist | React components, UI logic |
| **UI Generator** | v0.dev | Figma → React code conversion |
| **QA Engineer** | ChatGPT-5 | Test generation, code review |
| **Performance** | Codex (GPT-4) | Optimization, N+1 query detection |
| **Security** | Claude Desktop (4.5 Sonnet) | OWASP ASVS, threat modeling |
| **SRE/DevOps** | Claude Code (me!) | CI/CD, deployment automation |
| **Product Manager** | ChatGPT-5 | User stories, prioritization |
| **Tech Writer** | ChatGPT-5 | Documentation, API docs |

**Cost:** ~$55-60/month (you're already paying this!)

---

# PART 2: CODE APPROVAL PIPELINE (THE CRITICAL PART!)

## 🚨 NEVER PUSH CODE WITHOUT THIS PIPELINE

### **The 7-Checkpoint System:**

```
Write Code
   ↓
Checkpoint #1: Code Quality (Roo Code - Grok)
   ↓ PASS? → Continue | FAIL? → Fix & Re-run
Checkpoint #2: Logic Review (Gemini Code Assist)
   ↓ PASS? → Continue | FAIL? → Fix & Restart from #1
Checkpoint #3: Security Review (Claude Desktop)
   ↓ PASS? → Continue | FAIL? → Fix & Restart from #1
Checkpoint #4: Testing Review (ChatGPT-5)
   ↓ PASS? → Continue | FAIL? → Add Tests & Restart from #1
Checkpoint #5: Performance Review (Codex GPT-4)
   ↓ PASS? → Continue | FAIL? → Optimize & Restart from #1
Checkpoint #6: Integration Review (Claude Code - me!)
   ↓ PASS? → Continue | FAIL? → Refactor & Restart from #1
Checkpoint #7: Human Review (YOU)
   ↓ PASS? → Git Push ✅ | FAIL? → Fix & Restart
```

---

## 📋 CHECKPOINT DETAILS

### **Checkpoint #1: CODE QUALITY**
**AI:** Roo Code (Grok Code Fast)
**Time:** 2-3 minutes
**Cost:** ~$0.003

**Checks:**
- Code conventions followed
- No code smells
- Proper error handling
- TypeScript types correct
- No console.log in production

**Prompt:**
```
You are a Senior Code Reviewer for SwanStudios.

Review this code for quality issues:
[PASTE CODE]

Check:
1. Code conventions
2. Code smells
3. Error handling
4. TypeScript types
5. Production readiness
6. Readability

Output: ✅ PASS or ❌ FAIL with issues
```

---

### **Checkpoint #2: LOGIC REVIEW**
**AI:** Gemini Code Assist
**Time:** 3-5 minutes
**Cost:** $0 (free tier)

**Checks:**
- Business logic correct
- Edge cases handled
- State management sound
- API contracts followed
- Data transformations correct

**Prompt:**
```
You are a Logic Verification Specialist for SwanStudios.

Analyze this code for logical correctness:
[PASTE CODE]

Check:
1. Business logic correctness
2. Edge cases (null, undefined, empty)
3. State management
4. API contract compliance
5. Data transformations
6. Boundary conditions

Output: ✅ PASS or ❌ FAIL with logic errors
```

---

### **Checkpoint #3: SECURITY REVIEW**
**AI:** Claude Desktop (4.5 Sonnet)
**Time:** 5-7 minutes
**Cost:** $0 (included)

**Checks:**
- SQL injection protection
- XSS prevention
- Authentication/authorization
- Secrets not hardcoded
- RLS enforced (multi-tenant)
- OWASP ASVS L2 compliance

**Prompt:**
```
You are an AppSec Engineer reviewing code for SwanStudios.

Perform security audit on this code:
[PASTE CODE]

Check (OWASP ASVS L2):
1. Input validation
2. SQL injection protection
3. XSS prevention
4. Authentication/authorization
5. Secrets management
6. RLS enforcement (tenant_id)

Output: ✅ PASS or ❌ FAIL with vulnerabilities
```

---

### **Checkpoint #4: TESTING REVIEW**
**AI:** ChatGPT-5
**Time:** 5-10 minutes
**Cost:** $0 (included)

**Checks:**
- Unit tests exist
- Integration tests cover APIs
- Edge cases tested
- Coverage ≥ 85%
- Tests are not flaky

**Prompt:**
```
You are a QA Engineer for SwanStudios.

Review code and tests:

CODE: [PASTE CODE]
TESTS: [PASTE TESTS or "No tests provided"]

Evaluate:
1. Test coverage (target ≥85%)
2. Test quality
3. Edge cases covered
4. Integration tests
5. Mocking strategy

Output: ✅ PASS (≥85% coverage) or ❌ FAIL with gaps
```

---

### **Checkpoint #5: PERFORMANCE REVIEW**
**AI:** Codex (GPT-4)
**Time:** 3-5 minutes
**Cost:** $0 (included)

**Checks:**
- No N+1 queries
- Efficient algorithms
- No memory leaks
- React optimizations
- Caching used appropriately

**Prompt:**
```
You are a Performance Specialist for SwanStudios.

Analyze this code for performance issues:
[PASTE CODE]

Check:
1. Database queries (N+1 problems?)
2. Algorithms (time/space complexity)
3. React performance (re-renders?)
4. Memory leaks
5. Caching opportunities

Output: ✅ PASS or ❌ FAIL with performance issues
```

---

### **Checkpoint #6: INTEGRATION REVIEW**
**AI:** Claude Code (me! - 4.5 Sonnet)
**Time:** 5-7 minutes
**Cost:** $0 (included)

**Checks:**
- Integrates with existing codebase
- No breaking changes
- Follows project architecture
- Dependencies compatible
- Migrations safe

**Prompt (ask me):**
```
You are an Integration Specialist for SwanStudios.

Review this code for integration issues:
[PASTE CODE OR FILE PATH]

Check:
1. Codebase compatibility
2. Breaking changes
3. Dependencies
4. Architecture fit
5. Migration safety

Output: ✅ PASS or ❌ FAIL with integration issues
```

---

### **Checkpoint #7: HUMAN REVIEW**
**Reviewer:** YOU
**Time:** 5-10 minutes
**Cost:** $0

**Your Checklist:**
```
Manual Testing:
[ ] Feature works in dev environment
[ ] Tested happy path
[ ] Tested edge cases
[ ] Mobile responsive (if UI)

User Experience:
[ ] Intuitive to use?
[ ] Error messages helpful?
[ ] Loading states clear?

Business Logic:
[ ] Solves the actual problem?
[ ] Meets requirements?

Code Understanding:
[ ] I understand what this does
[ ] Future me can maintain this
[ ] Documentation is clear

Result: ✅ PASS → Git Push
```

---

## ⚡ PRACTICAL EXAMPLE: COMPLETE WORKFLOW

### **Feature: Add POST /api/workouts endpoint**

**Step 1: Planning (Orchestrator)**
```
Tool: Claude Desktop
Prompt: "I need to add POST /api/workouts. Plan the implementation."
Output: PLAN.md with breakdown
Time: 5 minutes
```

**Step 2: Architecture (Architect)**
```
Tool: Claude Desktop
Prompt: "Design schema and API spec for POST /api/workouts"
Output: schema.sql, openapi.yaml section
Time: 10 minutes
```

**Step 3: Implementation (Coder)**
```
Tool: Roo Code (Grok Code Fast)
Prompt: "Implement POST /api/workouts endpoint from this spec: [paste]"
Output: Generated code (controller, route, model, migration)
Time: 10 minutes
```

**Step 4: Checkpoint #1 - Code Quality**
```
Tool: Roo Code
Prompt: [Code Quality Review template]
Result: ✅ PASS - Code quality is good
Time: 2 minutes
```

**Step 5: Checkpoint #2 - Logic Review**
```
Tool: Gemini Code Assist
Prompt: [Logic Review template]
Result: ❌ FAIL - Missing validation for exercises array
Action: ADD validation: if (!exercises || exercises.length === 0)
Re-run: Checkpoint #1 (✅ PASS) → Checkpoint #2 (✅ PASS)
Time: 5 minutes
```

**Step 6: Checkpoint #3 - Security**
```
Tool: Claude Desktop
Prompt: [Security Review template]
Result: ❌ FAIL - No authentication check
Action: ADD authentication middleware: requireAuth
Re-run: Checkpoint #1 (✅ PASS) → #2 (✅ PASS) → #3 (✅ PASS)
Time: 7 minutes
```

**Step 7: Checkpoint #4 - Testing**
```
Tool: ChatGPT-5
Prompt: [Testing Review template]
Result: ❌ FAIL - No tests. Coverage: 0%
Action: ChatGPT-5 generates complete test suite
ADD tests to project
RUN: npm test (all pass)
Re-run: Checkpoint #4 (✅ PASS - Coverage: 92%)
Time: 10 minutes
```

**Step 8: Checkpoint #5 - Performance**
```
Tool: Codex (GPT-4)
Prompt: [Performance Review template]
Result: ✅ PASS - Query is efficient, no N+1 issues
Time: 3 minutes
```

**Step 9: Checkpoint #6 - Integration**
```
Tool: Claude Code (me!)
Prompt: "Review POST /api/workouts for integration issues"
Result: ✅ PASS - Integrates cleanly, follows patterns
Time: 5 minutes
```

**Step 10: Checkpoint #7 - Human Review**
```
Tool: Manual testing
Actions:
- Start dev server
- Test with Postman: POST /api/workouts
- Verify: Creates workout ✅
- Verify: Rejects invalid data ✅
- Verify: Requires auth ✅
Result: ✅ PASS - Ready to ship!
Time: 8 minutes
```

**Step 11: Git Push ✅**
```
git add .
git commit -m "feat: add POST /api/workouts endpoint

- Implements workout creation
- Validates input with Zod
- Requires JWT authentication
- 92% test coverage
- Passed 7 AI review checkpoints"

git push origin feature/workout-creation
```

**Total Time:** ~65 minutes (planning + implementation + 7 checkpoints)
**Total Cost:** ~$0.01
**Result:** Production-ready, zero bugs, enterprise-grade code

---

## 🎯 PIPELINE VARIANTS

### **FULL PIPELINE** (Recommended for new features)
**Use all 7 checkpoints**
- Time: 30-45 minutes
- Quality: Production-ready, zero bugs
- Use for: New features, database changes, security code

### **FAST TRACK** (For minor changes)
**Use checkpoints: #1, #2, #4, #7**
- Time: 15-20 minutes
- Quality: Very good, low risk
- Use for: Bug fixes, UI polish, documentation

### **CRITICAL PATH** (For high-risk changes)
**Use checkpoints: #1, #2, #3, #4, #6, #7**
- Time: 25-35 minutes
- Quality: Enterprise-grade
- Use for: Security changes, API contracts, RLS code

---

## 📊 COST & TIME ANALYSIS

### **Per Feature (Full Pipeline):**
- Code Quality (Roo Code): $0.003, 2-3 min
- Logic (Gemini): $0, 3-5 min
- Security (Claude Desktop): $0, 5-7 min
- Testing (ChatGPT-5): $0, 5-10 min
- Performance (Codex): $0, 3-5 min
- Integration (Claude Code): $0, 5-7 min
- Human Review: $0, 5-10 min

**Total: ~$0.01, 30-45 minutes**

### **ROI:**
**Without pipeline:**
- 1-2 bugs per feature
- 2-4 hours debugging in production
- Customer frustration
- Potential revenue loss

**With pipeline:**
- Zero bugs (caught by 5-7 AIs)
- 0 hours debugging
- Happy customers
- Reliable revenue

**Net gain: 75-215 minutes saved per feature!**

---

## 🚀 DAILY WORKFLOW (COMBINING BOTH SYSTEMS)

### **Morning: Planning (AI Village)**
```
1. Open Claude Desktop (Orchestrator)
2. Prompt: "Plan today's feature: [description]"
3. Get PLAN.md with tickets
4. Review and approve
```

### **Mid-Day: Implementation + Review (Code Pipeline)**
```
For each ticket:
1. Implement (Roo Code / Gemini Code Assist)
2. Run through 7-checkpoint pipeline
3. Fix issues as they come up
4. Git push when ALL checkpoints PASS
```

### **End of Day: Review**
```
1. Check: How many features shipped?
2. Track: Issues found by each AI
3. Improve: Adjust process based on learnings
```

---

## 📋 TRACKING TEMPLATE

Use this for each feature:

```markdown
## Feature: [Name]
**Date:** 2025-10-20
**Branch:** feature/[name]

### Planning Phase
- [x] Orchestrator plan (Claude Desktop)
- [x] Architect design (Claude Desktop)

### Implementation
- [x] Code written (Roo Code / Gemini)

### Code Approval Pipeline
- [ ] ✅ Checkpoint #1: Code Quality (Roo Code)
- [ ] ✅ Checkpoint #2: Logic (Gemini)
- [ ] ✅ Checkpoint #3: Security (Claude Desktop)
- [ ] ✅ Checkpoint #4: Testing (ChatGPT-5) - Coverage: ___%
- [ ] ✅ Checkpoint #5: Performance (Codex)
- [ ] ✅ Checkpoint #6: Integration (Claude Code)
- [ ] ✅ Checkpoint #7: Human Review

### Issues Found & Fixed
- Checkpoint #2: Missing validation → FIXED
- Checkpoint #3: No auth check → FIXED
- Checkpoint #4: No tests → GENERATED

### Final Status
- [x] ALL checkpoints PASS
- [x] Git pushed
- [x] Ready for production

**Time:** Planning (15 min) + Implementation (10 min) + Pipeline (40 min) = 65 min
**Quality:** Production-ready ✅
```

---

## 🎯 QUICK REFERENCE

### **When to Use Which Pipeline:**

| Change Type | Pipeline | Time |
|-------------|----------|------|
| New feature | FULL (1-7) | 30-45 min |
| Bug fix | FAST (1,2,4,7) | 15-20 min |
| Security | CRITICAL (1,2,3,4,6,7) | 25-35 min |
| UI polish | FAST (1,2,4,7) | 15-20 min |
| Database migration | FULL (1-7) | 30-45 min |
| Refactoring | FAST (1,2,5,7) | 20-25 min |
| Documentation | MINIMAL (1,7) | 5-10 min |

### **Which AI for Which Task:**

| Task | AI | Cost |
|------|-----|------|
| Planning | Claude Desktop | $0 |
| Architecture | Claude Desktop | $0 |
| Backend coding | Roo Code (Grok) | $0.003 |
| Frontend coding | Gemini Code Assist | $0 |
| UI generation | v0.dev | $0-20/mo |
| Code review #1 | Roo Code (Grok) | $0.003 |
| Code review #2 | Gemini | $0 |
| Security review | Claude Desktop | $0 |
| Test generation | ChatGPT-5 | $0 |
| Performance check | Codex (GPT-4) | $0 |
| Integration check | Claude Code (me!) | $0 |

---

## 🚨 CRITICAL RULES

### **NEVER:**
- ❌ Push code without running the pipeline
- ❌ Skip checkpoints "because it's a small change"
- ❌ Ignore AI feedback (fix or document why not)
- ❌ Merge failing checkpoints

### **ALWAYS:**
- ✅ Run appropriate pipeline for change type
- ✅ Fix issues found by AIs
- ✅ Re-run checkpoints after fixes
- ✅ Human review is final checkpoint
- ✅ Track issues found (improve over time)

### **EMERGENCY BYPASS:**
Only for:
- 🔥 Production down (Sev-1)
- 🔥 Critical security patch
- 🔥 Revenue-blocking bug

**Process:**
1. Fix and deploy immediately
2. Run full pipeline retroactively
3. Deploy polished version within 24h

---

## 📖 COMPLETE DOCUMENT INDEX

For deeper dives:

1. **[CODE-APPROVAL-PIPELINE.md](CODE-APPROVAL-PIPELINE.md)** ← Full pipeline details
2. **[SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md](SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md)** ← Complete reference
3. **[YOUR-AI-VILLAGE-ROLE-ASSIGNMENTS.md](YOUR-AI-VILLAGE-ROLE-ASSIGNMENTS.md)** ← Who does what
4. **[ROO-CODE-OPENROUTER-MODEL-STRATEGY.md](ROO-CODE-OPENROUTER-MODEL-STRATEGY.md)** ← Roo Code setup
5. **[WEEK-1-LAUNCH-CHECKLIST.md](WEEK-1-LAUNCH-CHECKLIST.md)** ← Day-by-day launch plan
6. **[FIGMA-AI-SETUP-GUIDE.md](FIGMA-AI-SETUP-GUIDE.md)** ← UI design workflow
7. **[AI-VILLAGE-ADAPTED-FOR-SWANSTUDIOS.md](AI-VILLAGE-ADAPTED-FOR-SWANSTUDIOS.md)** ← Strategic overview

---

## 🎉 YOU'RE READY!

**You now have:**
✅ AI Village role assignments (who does what)
✅ 7-checkpoint code approval pipeline (quality gates)
✅ Practical workflows (daily use)
✅ Cost optimization (mostly free/included AIs)
✅ Time savings (75-215 min per feature)
✅ Zero-bug production code

**Your total monthly cost: ~$60** (you're already paying this!)

**Your time investment: 30-45 min per feature** (saves 2-4 hours debugging)

**Your quality: Enterprise-grade, production-ready**

---

**Let's build SwanStudios the right way! 🚀**

**Next step:** Run your first feature through the 7-checkpoint pipeline!
