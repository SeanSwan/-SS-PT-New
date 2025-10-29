# Next Steps: Homepage Hero Enhancement Phase 0 Review

**Status:** 🟡 AWAITING 4 AI REVIEWS

**Completed:** ✅ Claude Code Integration Review (APPROVED)

**Pending Reviews:**
1. Claude Desktop (Orchestrator & Security)
2. Gemini Code Assist (Frontend Expert)
3. Roo Code/Grok (Backend Expert)
4. ChatGPT-5 (QA Engineer)

---

## Step-by-Step Guide

### Step 1: Review What's Already Done

Open `docs/ai-workflow/BRAINSTORM-CONSENSUS.md` and scroll to the "Homepage Hero Enhancement – Design Review" section. You'll see:
- Complete design specifications
- Wireframes
- API contracts
- Database schema
- Component structure
- My (Claude Code) integration review with ✅ APPROVED verdict

### Step 2: Get Claude Desktop Review

**Open Claude Desktop and paste this:**

```
You are Claude Desktop, serving as the Orchestrator and Security Expert for SwanStudios.

PROJECT CONTEXT:
- Platform: Personal training + social media SaaS
- Tech Stack: React + TypeScript frontend, Node.js/Express + PostgreSQL backend
- Architecture: Multi-tenant with Row-Level Security (RLS)
- Current State: Post-MUI elimination, custom UI Kit with styled-components
- Security: OWASP ASVS L2 compliance required

YOUR ROLE:
1. Orchestrator: Ensure design fits overall system architecture
2. Security Expert: Identify authentication, authorization, and data protection concerns

DESIGN TO REVIEW:
---
[OPEN BRAINSTORM-CONSENSUS.md AND COPY THE ENTIRE "Homepage Hero Enhancement – Design Review" SECTION HERE - FROM LINE ~80 TO ~400]
---

Please provide your review in this format:

### 🤖 Claude Desktop Review
Date: [Today's date]
Verdict: ✅ APPROVED / ⚠️ CONCERNS / ❌ BLOCKED

**Orchestrator Feedback:**
- [Architecture fit assessment]
- [Integration concerns]

**Security Feedback:**
- [Authentication/Authorization concerns]
- [Data protection concerns]
- [XSS/CSRF/SQL injection risks]
- [Multi-tenant isolation concerns]

**Questions:**
- [Any clarifying questions]

**Recommendations:**
- [Specific actionable improvements]
```

**After getting the review:**
1. Copy Claude Desktop's entire response
2. Open `docs/ai-workflow/BRAINSTORM-CONSENSUS.md`
3. Find the section "### 🤖 Claude Desktop (Orchestrator & Security) – [Pending]"
4. Replace `[Pending]` with the review
5. Save the file

---

### Step 3: Get Gemini Code Assist Review

**Open Gemini Code Assist and paste this:**

```
You are Gemini Code Assist, serving as the Frontend Expert for SwanStudios.

PROJECT CONTEXT:
- Platform: Personal training + social media SaaS
- Frontend Stack: React 18 + TypeScript + Vite
- Styling: styled-components (NO Material-UI)
- Design System: Galaxy-Swan theme with custom UI Kit
- Component Pattern: Compound components following "Golden Standard"
- Current State: Post-MUI elimination, all custom components

YOUR ROLE:
1. Ensure component structure follows React best practices
2. Validate accessibility (WCAG AA compliance)
3. Check performance optimization (lazy loading, memoization)
4. Verify responsive design and mobile-first approach
5. Ensure styled-components patterns are correct

DESIGN TO REVIEW:
---
[OPEN BRAINSTORM-CONSENSUS.md AND COPY THE ENTIRE "Homepage Hero Enhancement – Design Review" SECTION HERE]
---

Please provide your review in this format:

### 🤖 Gemini Code Assist Review
Date: [Today's date]
Verdict: ✅ APPROVED / ⚠️ CONCERNS / ❌ BLOCKED

**Component Structure:**
- [Assessment of proposed component hierarchy]
- [Compound component pattern validation]

**Accessibility:**
- [WCAG compliance concerns]
- [Keyboard navigation]
- [Screen reader support]

**Performance:**
- [Lazy loading strategy]
- [Re-render optimization]
- [Bundle size concerns]

**Styling:**
- [styled-components patterns]
- [Theme integration]
- [Responsive design]

**Questions:**
- [Any clarifying questions]

**Recommendations:**
- [Specific actionable improvements]
```

**After getting the review:**
1. Copy Gemini's entire response
2. Open `docs/ai-workflow/BRAINSTORM-CONSENSUS.md`
3. Find the section "### 🤖 Gemini Code Assist (Frontend) – [Pending]"
4. Replace `[Pending]` with the review
5. Save the file

---

### Step 4: Get Roo Code (Grok) Review

**Open Roo Code and paste this:**

```
You are Roo Code (Grok), serving as the Backend Expert for SwanStudios.

PROJECT CONTEXT:
- Platform: Personal training + social media SaaS
- Backend Stack: Node.js + Express + PostgreSQL + Sequelize
- Architecture: Multi-tenant with Row-Level Security (RLS)
- Authentication: JWT with role-based access control (Admin/Trainer/Client)
- Current State: 4 MCP servers (Workout, Financial Events, Gamification, YOLO)

YOUR ROLE:
1. Validate API endpoint design and contracts
2. Ensure database schema follows RLS and multi-tenant patterns
3. Check query performance and indexing strategy
4. Verify data validation and error handling
5. Ensure proper authentication/authorization middleware

DESIGN TO REVIEW:
---
[OPEN BRAINSTORM-CONSENSUS.md AND COPY THE ENTIRE "Homepage Hero Enhancement – Design Review" SECTION HERE]
---

Please provide your review in this format:

### 🤖 Roo Code (Backend) Review
Date: [Today's date]
Verdict: ✅ APPROVED / ⚠️ CONCERNS / ❌ BLOCKED

**API Design:**
- [Endpoint structure assessment]
- [Request/response contract validation]
- [Error handling]

**Database Schema:**
- [Table structure validation]
- [Indexing strategy]
- [RLS enforcement]
- [Data integrity constraints]

**Performance:**
- [Query optimization]
- [N+1 query risks]
- [Caching strategy]

**Security:**
- [SQL injection protection]
- [Input validation]
- [Authorization checks]

**Questions:**
- [Any clarifying questions]

**Recommendations:**
- [Specific actionable improvements]
```

**After getting the review:**
1. Copy Roo Code's entire response
2. Open `docs/ai-workflow/BRAINSTORM-CONSENSUS.md`
3. Find the section "### 🤖 Roo Code (Backend) – [Pending]"
4. Replace `[Pending]` with the review
5. Save the file

---

### Step 5: Get ChatGPT-5 Review

**Open ChatGPT-5 and paste this:**

```
You are ChatGPT-5, serving as the QA Engineer for SwanStudios.

PROJECT CONTEXT:
- Platform: Personal training + social media SaaS
- Tech Stack: React + TypeScript + Node.js + PostgreSQL
- Testing: Jest + React Testing Library + Supertest
- Target: ≥85% test coverage
- Current State: Post-MUI elimination, custom components

YOUR ROLE:
1. Ensure design is testable
2. Identify edge cases and error scenarios
3. Validate acceptance criteria are measurable
4. Check for race conditions and timing issues
5. Ensure proper error handling and user feedback

DESIGN TO REVIEW:
---
[OPEN BRAINSTORM-CONSENSUS.md AND COPY THE ENTIRE "Homepage Hero Enhancement – Design Review" SECTION HERE]
---

Please provide your review in this format:

### 🤖 ChatGPT-5 Review
Date: [Today's date]
Verdict: ✅ APPROVED / ⚠️ CONCERNS / ❌ BLOCKED

**Testability:**
- [Can this design be unit tested?]
- [Integration test strategy]
- [E2E test scenarios]

**Edge Cases:**
- [Missing edge cases]
- [Error scenarios not covered]
- [Race conditions]

**Acceptance Criteria:**
- [Are criteria measurable?]
- [Missing success metrics]

**User Experience:**
- [Loading states]
- [Error messages]
- [Feedback mechanisms]

**Questions:**
- [Any clarifying questions]

**Recommendations:**
- [Specific actionable improvements]
```

**After getting the review:**
1. Copy ChatGPT's entire response
2. Open `docs/ai-workflow/BRAINSTORM-CONSENSUS.md`
3. Find the section "### 🤖 ChatGPT-5 (QA) – [Pending]"
4. Replace `[Pending]` with the review
5. Save the file

---

## Step 6: Resolve Any Concerns

After all 4 reviews are in, if ANY AI raised concerns (⚠️) or blocks (❌):

1. Read all concerns carefully
2. Document resolutions in the "Resolution Log" section
3. Make necessary changes to the design
4. Re-submit to the AIs that had concerns

**Format for Resolution Log:**
```markdown
### Resolution Log

**Issue #1: [Description]**
- Raised By: [AI Name]
- Severity: ⚠️ CONCERN / ❌ BLOCKER
- Resolution: [What you changed]
- Status: ✅ RESOLVED

**Issue #2: [Description]**
- Raised By: [AI Name]
- Severity: ⚠️ CONCERN / ❌ BLOCKER
- Resolution: [What you changed]
- Status: ✅ RESOLVED
```

---

## Step 7: Mark Consensus

When ALL 5 AIs have approved (✅), update the Final Consensus section:

```markdown
### 📊 Final Consensus

**Status:** 🟢 CONSENSUS REACHED

**Approval Summary:**
- Claude Code (Integration): ✅ APPROVED
- Claude Desktop (Orchestrator & Security): ✅ APPROVED
- Gemini Code Assist (Frontend): ✅ APPROVED
- Roo Code (Backend): ✅ APPROVED
- ChatGPT-5 (QA): ✅ APPROVED

**Total Issues Raised:** [X]
**Total Issues Resolved:** [X]
**Final Consensus Date:** [Today's date]

**READY FOR IMPLEMENTATION:** ✅ YES

Proceed to Phase 1-7 using docs/ai-workflow/FEATURE-TEMPLATE.md
```

---

## Step 8: Create Feature Tracking File

Copy `docs/ai-workflow/FEATURE-TEMPLATE.md` to `features/homepage-hero-enhancement.md` and fill in:
- Phase 0 section with link to BRAINSTORM-CONSENSUS.md
- Mark all 5 AI reviews as ✅ COMPLETE
- Prepare Phase 1-7 checkpoints

---

## Step 9: Begin Implementation (ONLY AFTER CONSENSUS)

Return to Claude Code and say:
"Phase 0 consensus reached. All 5 AIs approved. Ready to begin implementation of Homepage Hero Enhancement. Please start with Phase 1."

---

## Current Status Summary

```
Phase 0: Homepage Hero Enhancement
├── ✅ Design Review Created (Claude Code)
├── ✅ Claude Code Integration Review (APPROVED)
├── ✅ Roo Code Backend Review (APPROVED - after theme gate)
├── ✅ ChatGPT-5 QA Review (APPROVED - after enhancements)
├── 🟡 Claude Desktop Review (PENDING) ← YOU ARE HERE
├── 🟡 Gemini Code Assist Review (PENDING)
└── ⬜ Final Consensus (WAITING - 3 of 5 done, 60%)

MAJOR UPDATE: ALL CRITICAL CONCERNS RESOLVED ✅
- Theme compliance: Galaxy-Swan Theme Gate added (14 requirements)
- API security: Caching, rate limiting, RLS documented
- Accessibility: AA/AAA, screen reader support, reduced motion
- Database: Indexes optimized for performance
- Documentation: Encoding artifacts cleaned
```

---

## Quick Tips

1. **Copy the ENTIRE design section** when pasting to other AIs - don't summarize
2. **Keep the format** - use the exact review template provided above
3. **APPEND, don't replace** - Add reviews to BRAINSTORM-CONSENSUS.md, never delete
4. **Address ALL concerns** - Don't skip any ⚠️ or ❌ issues
5. **Get re-approval** - If you change the design, re-submit to concerned AIs

---

**Need help?** If you get stuck, come back to Claude Code and share:
- Which AI you're working with
- What concerns they raised
- What you're unsure about resolving
