# 🚀 AI VILLAGE QUICK REFERENCE CARD
**SwanStudios Development - Keep This Open While Working**

---

## 📋 DAILY WORKFLOW (30-Second Overview)

```
1. Morning Setup (5 min)
   → Open: Claude Desktop, VS Code (Roo/Gemini/Codex), ChatGPT-5
   → Pick task from backlog

2. Planning (15 min)
   → Claude Desktop: Share feature request → Get PLAN.md
   → Claude Desktop: Get technical design (openapi.yaml, db schema)

3. Code (45 min)
   → Backend: Roo Code (Grok Code Fast) - $0.003/feature
   → Frontend: Gemini Code Assist (free) or v0.dev screenshot upload

4. Pipeline (35 min) - ALL 7 CHECKPOINTS MANDATORY
   → Roo Code: Code quality
   → Gemini: Logic review
   → Claude Desktop: Security
   → ChatGPT-5: Testing
   → Codex: Performance
   → Claude Code: Integration
   → You: Human review

5. Git Push (10 min)
   → Only if all 7 checkpoints = ✅ PASS
```

**Total Time Per Feature: ~2 hours**
**Total Cost Per Feature: ~$0.01**

---

## 🎯 AI ROLE ASSIGNMENTS (Who Does What)

| AI Tool | Role | Cost | Primary Tasks |
|---------|------|------|---------------|
| **Claude Desktop** (4.5 Sonnet) | Orchestrator, Architect, AppSec | $20/mo (paid) | Planning, tech design, security review |
| **Roo Code** → Grok Code Fast | Backend Coder, QA Gate #1 | ~$0.28/mo | Implement Node.js APIs, code quality check |
| **Gemini Code Assist** | Frontend Coder, QA Gate #2 | FREE | Implement React UIs, logic review |
| **ChatGPT-5** | QA Engineer, Gate #4 | $20/mo (paid) | Test generation, coverage analysis |
| **Codex** (GPT-4) | Performance Engineer, Gate #5 | FREE (in VS Code) | Performance review, optimization |
| **Claude Code** (4.5 Sonnet) | SRE, Gate #6 | $20/mo (paid) | Integration review, deployment |

**Total Monthly Cost: $60** (3 subscriptions already paid for)

---

## ✅ 7-CHECKPOINT PIPELINE (Copy-Paste Prompts)

### Checkpoint #1: Code Quality (Roo Code - 3 min)
```
Review this code for quality:
[PASTE CODE]

Check: conventions, smells, error handling, TypeScript types, readability
Output: ✅ PASS or ❌ FAIL with issues
```

### Checkpoint #2: Logic Review (Gemini - 4 min)
```
Review this code for logic errors:
[PASTE CODE]

Check: edge cases, null safety, business logic correctness, data validation
Output: ✅ PASS or ❌ FAIL with issues
```

### Checkpoint #3: Security (Claude Desktop - 6 min)
```
Security audit (OWASP ASVS L2):
[PASTE CODE]

Check: input validation, SQL injection, XSS, auth/authz, secrets, RLS (tenant_id)
Output: ✅ PASS or ❌ FAIL with vulnerabilities
```

### Checkpoint #4: Testing (ChatGPT-5 - 7 min)
```
Review tests for this code:
CODE: [PASTE]
TESTS: [PASTE or "None provided"]

Check: coverage ≥85%, edge cases, integration tests, mocking
Output: ✅ PASS or ❌ FAIL with missing tests (generate them)
```

### Checkpoint #5: Performance (Codex - 4 min)
```
Performance review:
[PASTE CODE]

Check: algorithms (O(n) ok?), DB queries (N+1?), caching, bundle size
Output: ✅ PASS or ❌ FAIL with bottlenecks
```

### Checkpoint #6: Integration (Claude Code - 5 min)
```
Integration review for SwanStudios:
[PASTE CODE]

Check: fits existing patterns, breaking changes?, migration needed?, docs updated?
Output: ✅ PASS or ❌ FAIL with integration issues
```

### Checkpoint #7: Human Review (You - 8 min)
```
Checklist:
□ Code makes sense to me
□ Matches original feature request
□ All 6 AI checkpoints passed
□ No obvious bugs
□ Ready for production

Decision: APPROVE or REQUEST CHANGES
```

---

## 🚨 WHEN TO USE FAST TRACK vs FULL PIPELINE

### FULL PIPELINE (All 7 checkpoints - 35 min)
- ✅ New features
- ✅ Security-related code
- ✅ Database schema changes
- ✅ Payment/Stripe integration
- ✅ Authentication/authorization

### FAST TRACK (Checkpoints 1, 2, 4, 7 only - 20 min)
- ✅ UI polish / styling
- ✅ Bug fixes (non-security)
- ✅ Copy/text changes
- ✅ Minor refactors

### CRITICAL PATH (1, 2, 3, 4, 6, 7 - 30 min)
- ✅ Security patches
- ✅ Data privacy changes
- ✅ RLS policy updates

---

## 💬 STARTING A NEW FEATURE (Template for Claude Desktop)

```markdown
You are the Orchestrator for SwanStudios.

FEATURE REQUEST:
[2-3 sentence description]

USER STORY:
As a [Client/Trainer/Admin]
I want to [action]
So that [benefit]

ACCEPTANCE CRITERIA:
Given [context]
When [action]
Then [expected outcome]

CONSTRAINTS:
- Time: [estimate]
- Dependencies: [list]
- Must work with: [existing features]

Create PLAN.md with:
1. Work breakdown
2. Dependencies
3. Risk assessment
4. Effort estimates
5. AI assignments
```

**Expected output:** Complete PLAN.md you review and approve

---

## 🛠️ IMPLEMENTATION TEMPLATES

### Backend (Share with Roo Code)
```
Implement this backend API for SwanStudios:

TECH STACK: Node.js + Express + TypeScript + Sequelize (PostgreSQL)
PATTERNS: See /backend/controllers/, /backend/routes/, /backend/models/

TASK:
[PASTE openapi.yaml spec from Architect]

Requirements:
- Use existing Sequelize models
- Add requireAuth middleware
- Validate with Zod
- Handle errors
- Follow existing patterns

Provide: Complete controller + route + queries
```

### Frontend (Share with Gemini OR v0.dev)

**Gemini Approach:**
```
Implement this React component for SwanStudios:

TECH: React 18 + TypeScript + Styled-Components + React Query
PATTERNS: See /frontend/src/components/

TASK:
[PASTE component spec from Architect]

Requirements:
- Mobile-responsive
- Uses existing theme
- Accessible (WCAG 2.1 AA)
- Error boundaries
- Loading states

Provide: Complete .tsx component
```

**v0.dev Approach:**
1. Screenshot Figma design
2. Upload to https://v0.dev
3. Prompt: "Convert to React + styled-components + lucide-react icons"
4. Copy code → ask Gemini to integrate with existing patterns

---

## 📊 COST TRACKING

| Activity | Tool | Cost | Frequency | Monthly Cost |
|----------|------|------|-----------|--------------|
| Planning | Claude Desktop | $0 | 20 features | $0 |
| Backend coding | Grok Code Fast | $0.003 | 20 features | $0.06 |
| Frontend coding | Gemini | $0 | 20 features | $0 |
| Pipeline (all gates) | All AIs | $0.01 | 20 features | $0.20 |
| **TOTAL USAGE** | | | | **~$0.26** |
| **SUBSCRIPTIONS** | Claude, ChatGPT-5, Roo | $60 | Fixed | **$60** |
| **GRAND TOTAL** | | | | **~$60.26/mo** |

**ROI Calculation:**
- Month 2 Revenue Target: $500-2000
- AI Cost: $60
- ROI: 733% - 3233% 🚀

---

## ⚡ KEYBOARD SHORTCUTS (Save Time)

**VS Code:**
- `Ctrl+Shift+P` → "Roo Code: Chat" (open Roo Code)
- `Ctrl+Shift+L` → Select all occurrences (multi-cursor edit)
- `Alt+Click` → Add cursor
- `Ctrl+/` → Toggle comment

**Claude Desktop:**
- Copy feature request → Paste in Claude Desktop → "You are Orchestrator..."

**ChatGPT-5:**
- `Ctrl+V` (paste code) → Type "Checkpoint 4 testing review" → Enter

**Workflow Hack:** Keep 7 checkpoint prompts in a text file. Copy-paste-go.

---

## 🎯 SUCCESS METRICS (Track Weekly)

```
Week [Number] - [Date Range]
Features Shipped: ____ (target: 5-10/week)
Pipeline Compliance: ____% (target: 100%)
Bugs Found in Production: ____ (target: 0)
Bugs Caught by Pipeline: ____ (celebrate this!)
Time Per Feature: ____ hrs (target: <2hrs)
Total AI Spend: $____ (target: <$65)

Most Helpful AI: ____________
Bottleneck Checkpoint: ______ (optimize this)
```

---

## 🚨 EMERGENCY PROTOCOLS

### If Pipeline Fails (Checkpoint Won't Pass)
1. Read the AI's feedback carefully
2. Fix the specific issue mentioned
3. Re-run from THAT checkpoint (not from #1)
4. If stuck after 3 attempts → Ask Claude Desktop for architectural guidance

### If Roo Code / OpenRouter Down
- **Fallback:** Use Codex (GPT-4 in VS Code panel) for backend coding
- **Cost:** $0 (free in VS Code)
- **Limitation:** Slower, but works

### If Production Bug Slips Through
1. **DON'T PANIC** - AI Village isn't perfect, you'll still catch 95%+ of bugs
2. Create hotfix branch
3. Run FULL pipeline (all 7 checkpoints) even for small fix
4. Document in post-mortem: "Which checkpoint should have caught this?"
5. Update that checkpoint's prompt to catch similar issues

---

## 📚 FULL DOCUMENTATION REFERENCE

| Document | Use Case | Read Time |
|----------|----------|-----------|
| **YOUR-DAILY-WORKFLOW-CHECKLIST.md** | Complete step-by-step workflow | 15 min |
| **CODE-APPROVAL-PIPELINE.md** | Deep dive on 7 checkpoints | 20 min |
| **ROO-CODE-OPENROUTER-MODEL-STRATEGY.md** | Roo Code setup & cost optimization | 10 min |
| **WEEK-1-LAUNCH-CHECKLIST.md** | 7-day rapid launch plan | 12 min |
| **FIGMA-AI-SETUP-GUIDE.md** | Figma + v0.dev workflow | 8 min |
| **AI-VILLAGE-ADAPTED-FOR-SWANSTUDIOS.md** | Phased AI Village adoption | 15 min |
| **MASTER-AI-WORKFLOW-GUIDE.md** | Strategic reference | 25 min |

---

## 🎉 FINAL REMINDER

```
✅ You have 5 AIs working for you 24/7
✅ Each feature costs ~$0.01 and takes ~2 hours
✅ The 7-checkpoint pipeline catches 95%+ of bugs before production
✅ You're spending $60/month to build a $500-2000/month business
✅ SwanStudios is 80-90% complete - just needs polish and pipeline discipline

NEVER push code without all 7 checkpoints passing.
30 minutes in the pipeline saves 2-4 hours debugging production.
```

---

**Last Updated:** 2025-10-20
**Version:** 1.0
**For:** SwanStudios AI Village Workflow

**Print this page and keep it next to your monitor. Reference it every single day.** 🚀
