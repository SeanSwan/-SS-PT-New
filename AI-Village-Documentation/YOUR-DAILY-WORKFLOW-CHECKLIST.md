# YOUR DAILY WORKFLOW CHECKLIST
## Step-by-Step Guide: How YOU Work with Your AI Team

**Last Updated:** 2025-10-20
**Purpose:** Your personal operating manual for the AI Village system
**Time per feature:** 1-2 hours (planning + implementation + 7-checkpoint review)

---

## 📋 TABLE OF CONTENTS

1. **Morning Setup** (5 minutes)
2. **Starting a New Feature** (15-30 minutes)
3. **Implementation Phase** (30-60 minutes)
4. **Code Approval Pipeline** (30-45 minutes)
5. **Git Push & Cleanup** (10 minutes)
6. **End of Day Review** (5 minutes)

---

# PHASE 1: MORNING SETUP (5 Minutes)

## ☀️ STEP 1: OPEN ALL YOUR AI TOOLS

**Your AI Team Roster:**
- [ ] **Claude Desktop** - Open app (for Orchestrator + Architect)
- [ ] **VS Code** - Open workspace (SwanStudios project)
  - [ ] **Claude Code** (me!) - Already active in VS Code
  - [ ] **Roo Code** - Check it's in right panel
  - [ ] **Gemini Code Assist** - Check it's in left panel
  - [ ] **Codex (GPT-4)** - Check it's in panel
- [ ] **ChatGPT-5** - Open in browser or app
- [ ] **v0.dev** - Bookmark open (if doing UI work)

**Quick Test:**
- [ ] Ask Roo Code: "Are you connected to OpenRouter?" (should say yes)
- [ ] Ask Gemini: "Can you see my SwanStudios codebase?" (should say yes)
- [ ] Verify Claude Desktop MCP is connected (should show codebase + Render)

---

## 📝 STEP 2: REVIEW YOUR BACKLOG

**Where your tasks live:**
- [ ] BACKLOG.md (if you created it)
- [ ] GitHub Issues
- [ ] Notion/Trello/Paper list
- [ ] Your brain (what needs to be done)

**Pick today's task:**
- [ ] Choose ONE feature/bug to work on
- [ ] Write it down: "Today I'm building: [description]"
- [ ] Estimate time: S (1-2h), M (3-4h), L (5-8h)

**Example:**
```
TODAY'S TASK: Add client progress dashboard
ESTIMATE: M (3-4 hours)
PRIORITY: High (customer requested)
```

---

# PHASE 2: STARTING A NEW FEATURE (15-30 Minutes)

## 🎯 STEP 3: ORCHESTRATOR PLANNING (Claude Desktop)

**What to share with Claude Desktop:**
1. Feature description
2. User story (who needs it, why)
3. Acceptance criteria (how to know it's done)
4. Any constraints (time, dependencies, etc.)

**Template to use:**

```
You are the Orchestrator for SwanStudios.

FEATURE REQUEST:
[Describe the feature in 2-3 sentences]

USER STORY:
As a [Client/Trainer/Admin]
I want to [do something]
So that [benefit]

ACCEPTANCE CRITERIA:
Given [context]
When [action]
Then [expected outcome]

CONSTRAINTS:
- Time: [estimate]
- Dependencies: [list any]
- Must be compatible with: [existing features]

Please create a PLAN.md for this feature including:
1. Work breakdown (tickets)
2. Dependencies between tickets
3. Risk assessment
4. Estimated effort per ticket
5. Which AI should handle each ticket
```

**Example (Real):**

```
You are the Orchestrator for SwanStudios.

FEATURE REQUEST:
Add a client progress dashboard that shows workout completion rate,
weight progress chart, and upcoming sessions for the current week.

USER STORY:
As a Client
I want to see my fitness progress at a glance
So that I stay motivated and know what's coming up

ACCEPTANCE CRITERIA:
Given I'm a logged-in client
When I navigate to /client/progress
Then I see:
- Workout completion rate (this week)
- Weight progress chart (last 30 days)
- List of upcoming sessions
- Achievements unlocked

CONSTRAINTS:
- Time: Medium (3-4 hours)
- Dependencies: Existing workout and session data
- Must be mobile responsive
- Must load in < 2 seconds

Please create a PLAN.md for this feature.
```

---

**What you receive from Claude Desktop:**

```markdown
# PLAN.md - Client Progress Dashboard

## Tickets

### Ticket #1: Database Review (DB/Perf)
- Review existing workout/session tables
- Confirm data for charts exists
- Identify any missing indexes
- Owner: Gemini Code Assist
- Effort: S (30 min)

### Ticket #2: API Endpoints (Architect → Coder)
- Design API contract (openapi.yaml)
- GET /api/client/progress/stats
- GET /api/client/progress/weight-history
- GET /api/client/sessions/upcoming
- Owner: Claude Desktop (design) → Roo Code (implement)
- Effort: M (2 hours)

### Ticket #3: UI Component (UX → v0.dev → Coder)
- Design dashboard layout (Figma)
- Generate React component (v0.dev)
- Integrate with APIs (Gemini Code Assist)
- Owner: ChatGPT-5 (UX) → v0.dev → Gemini
- Effort: M (2 hours)

### Ticket #4: Testing (QA)
- Unit tests for API endpoints
- Integration tests
- UI component tests
- Owner: ChatGPT-5
- Effort: S (1 hour)

## Dependencies
Ticket #2 depends on: #1 (need to know data structure)
Ticket #3 depends on: #2 (need API endpoints)
Ticket #4 depends on: #2, #3 (need code to test)

## Risks
- Weight data might not exist for all clients (mitigation: show empty state)
- Chart library might bloat bundle (mitigation: use lightweight library)

## Estimated Total: 5-6 hours
```

---

**Your Action:**
- [ ] **REVIEW** the plan
- [ ] **ASK QUESTIONS** if anything is unclear
- [ ] **APPROVE** by saying: "This plan looks good. Proceed."
- [ ] **SAVE** the PLAN.md to `/docs/plans/client-progress-dashboard-PLAN.md`

---

## 🏗️ STEP 4: ARCHITECTURE (Claude Desktop) - IF NEEDED

**When to do this:**
- ✅ New feature with database changes
- ✅ New API endpoints
- ✅ Security-critical features
- ❌ Simple bug fixes (skip this)
- ❌ UI-only changes (skip this)

**What to share with Claude Desktop:**

```
You are the Architect for SwanStudios.

CONTEXT FROM PLAN.md:
[Paste the relevant tickets from PLAN.md]

CURRENT TECH STACK:
- Frontend: React 18 + TypeScript + Styled-Components
- Backend: Node.js + Express + Sequelize ORM
- Database: PostgreSQL (multi-tenant with organization_id)
- Auth: JWT + session cookies

Please deliver:
1. Database schema changes (schema.sql) - if needed
2. API specification (openapi.yaml section)
3. Security considerations (THREAT_MODEL.md section) - if sensitive

For this feature: [paste Ticket #2 from PLAN.md]
```

---

**What you receive from Claude Desktop:**

```yaml
# openapi.yaml addition

/api/client/progress/stats:
  get:
    summary: Get client progress statistics
    tags: [Progress]
    security:
      - bearerAuth: []
    responses:
      200:
        description: Progress stats
        content:
          application/json:
            schema:
              type: object
              properties:
                workoutCompletionRate:
                  type: number
                  example: 0.85
                totalWorkouts:
                  type: integer
                  example: 20
                completedWorkouts:
                  type: integer
                  example: 17

# schema.sql (if new tables needed)
-- No new tables needed for this feature
-- Uses existing: workouts, sessions, client_weights tables

# THREAT_MODEL.md section
Security Considerations:
- MUST verify req.user.id matches requested client data (no cross-client access)
- Use RLS if multi-tenant (organization_id filtering)
- Rate limit: 10 requests/minute per user
```

---

**Your Action:**
- [ ] **REVIEW** the architecture
- [ ] **CHECK** it makes sense for your app
- [ ] **APPROVE** or request changes
- [ ] **SAVE** artifacts to `/docs/architecture/`

---

# PHASE 3: IMPLEMENTATION PHASE (30-60 Minutes)

## 💻 STEP 5: BACKEND IMPLEMENTATION (Roo Code)

**What to share with Roo Code:**

1. **Set Roo Code model:** Grok Code Fast (x-ai/grok-beta)
2. **Provide context:**

```
You are implementing a backend API for SwanStudios.

TECH STACK:
- Node.js + Express + TypeScript
- Sequelize ORM (PostgreSQL)
- JWT authentication

EXISTING PATTERNS:
- Controllers in: /backend/controllers/
- Routes in: /backend/routes/
- Models in: /backend/models/
- Middleware: /backend/middleware/auth.js (requireAuth)

TASK:
Implement this API endpoint following the openapi.yaml spec:

[PASTE openapi.yaml section from Architect]

Requirements:
- Use existing Sequelize models
- Add authentication middleware (requireAuth)
- Validate input with Zod
- Handle errors gracefully
- Return proper HTTP status codes
- Follow existing controller patterns

Please provide:
1. Complete controller file
2. Route definition
3. Any new Sequelize queries needed
```

---

**What you receive from Roo Code:**

```typescript
// backend/controllers/progressController.ts

import { Request, Response } from 'express';
import { z } from 'zod';
import { Workout, Session, ClientWeight } from '../models';

export const getProgressStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    // Get workout completion stats for current week
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const workouts = await Workout.findAll({
      where: {
        user_id: userId,
        created_at: { [Op.gte]: startOfWeek }
      }
    });

    const completedWorkouts = workouts.filter(w => w.completed).length;
    const completionRate = workouts.length > 0
      ? completedWorkouts / workouts.length
      : 0;

    res.json({
      workoutCompletionRate: completionRate,
      totalWorkouts: workouts.length,
      completedWorkouts
    });
  } catch (error) {
    console.error('Error fetching progress stats:', error);
    res.status(500).json({ error: 'Failed to fetch progress stats' });
  }
};

// backend/routes/progress.ts
import express from 'express';
import { requireAuth } from '../middleware/auth';
import { getProgressStats } from '../controllers/progressController';

const router = express.Router();

router.get('/client/progress/stats', requireAuth, getProgressStats);

export default router;
```

---

**Your Action:**
- [ ] **REVIEW** the code (does it look right?)
- [ ] **COPY** code to your project
- [ ] **CREATE** new files if needed
- [ ] **TEST** locally: `npm run dev` → hit endpoint with Postman/curl
- [ ] If works: ✅ Move to Checkpoint #1
- [ ] If fails: Tell Roo Code the error, get fix

---

## 🎨 STEP 6: FRONTEND IMPLEMENTATION (Gemini Code Assist OR v0.dev)

**Option A: UI-Heavy (Use Figma + v0.dev):**

1. **Design in Figma** (15 minutes)
   - Use Magician AI plugin
   - Prompt: "Create client progress dashboard with stats cards and chart"
   - Export screenshot

2. **Generate with v0.dev** (5 minutes)
   - Upload Figma screenshot
   - Prompt: "Convert to React + TypeScript + styled-components. Include: StatsCard component, WeightChart (use recharts), SessionList."
   - Copy generated code

3. **Integrate with Gemini Code Assist** (20 minutes)
   - Share with Gemini:

```
You are integrating a v0.dev generated component into SwanStudios.

V0.DEV CODE:
[PASTE v0.dev code]

INTEGRATION REQUIREMENTS:
- Add API calls using React Query
- Connect to: GET /api/client/progress/stats
- Add error handling (show error message if API fails)
- Add loading states (skeleton or spinner)
- Make mobile responsive
- Use existing theme tokens from /frontend/src/theme/theme.ts

Please provide:
1. Integrated component with API calls
2. Error and loading states
3. Mobile responsive styles
```

---

**Option B: Logic-Heavy (Use Gemini Code Assist directly):**

```
You are building a React component for SwanStudios.

TECH STACK:
- React 18 + TypeScript
- Styled-Components (use global theme)
- React Query (for API calls)
- lucide-react (for icons)

EXISTING PATTERNS:
- Components in: /frontend/src/components/
- API client: /frontend/src/api/client.ts
- Theme: /frontend/src/theme/theme.ts

TASK:
Create a ClientProgressDashboard component that:
- Fetches data from: GET /api/client/progress/stats
- Displays: Workout completion rate, total workouts, completed workouts
- Shows loading spinner while fetching
- Shows error message if fetch fails
- Is mobile responsive
- Uses styled-components

API Response:
{
  workoutCompletionRate: 0.85,
  totalWorkouts: 20,
  completedWorkouts: 17
}

Please provide complete component with:
1. TypeScript interfaces
2. React Query hook
3. Styled components
4. Error and loading states
```

---

**What you receive from Gemini:**

```typescript
// frontend/src/components/ClientProgressDashboard.tsx

import React from 'react';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { Loader, AlertCircle } from 'lucide-react';
import { apiClient } from '../api/client';

interface ProgressStats {
  workoutCompletionRate: number;
  totalWorkouts: number;
  completedWorkouts: number;
}

export const ClientProgressDashboard: React.FC = () => {
  const { data, isLoading, error } = useQuery<ProgressStats>({
    queryKey: ['progressStats'],
    queryFn: () => apiClient.get('/client/progress/stats').then(res => res.data)
  });

  if (isLoading) {
    return (
      <LoadingContainer>
        <Loader size={48} />
        <p>Loading your progress...</p>
      </LoadingContainer>
    );
  }

  if (error) {
    return (
      <ErrorContainer>
        <AlertCircle size={48} />
        <p>Failed to load progress. Please try again.</p>
      </ErrorContainer>
    );
  }

  return (
    <Dashboard>
      <StatsCard>
        <Label>Completion Rate</Label>
        <Value>{(data.workoutCompletionRate * 100).toFixed(0)}%</Value>
      </StatsCard>
      <StatsCard>
        <Label>Total Workouts</Label>
        <Value>{data.totalWorkouts}</Value>
      </StatsCard>
      <StatsCard>
        <Label>Completed</Label>
        <Value>{data.completedWorkouts}</Value>
      </StatsCard>
    </Dashboard>
  );
};

const Dashboard = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${props => props.theme.spacing.md};
  padding: ${props => props.theme.spacing.lg};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const StatsCard = styled.div`
  background: ${props => props.theme.colors.background};
  border-radius: ${props => props.theme.borderRadius.md};
  padding: ${props => props.theme.spacing.lg};
  box-shadow: ${props => props.theme.shadows.card};
`;

const Label = styled.p`
  font-size: ${props => props.theme.fontSize.sm};
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: ${props => props.theme.spacing.sm};
`;

const Value = styled.h2`
  font-size: ${props => props.theme.fontSize.xxl};
  color: ${props => props.theme.colors.primary};
  font-weight: bold;
`;

// ... (LoadingContainer, ErrorContainer styled components)
```

---

**Your Action:**
- [ ] **COPY** component code to your project
- [ ] **TEST** locally: `npm run dev` → navigate to component
- [ ] Verify: Loading state shows → Data loads → Displays correctly
- [ ] Verify: Mobile responsive (open dev tools, toggle device)
- [ ] If works: ✅ Move to Checkpoint #1
- [ ] If fails: Share error with Gemini, get fix

---

# PHASE 4: CODE APPROVAL PIPELINE (30-45 Minutes)

## 🔍 CHECKPOINT #1: CODE QUALITY (Roo Code)

**Your Action:**

1. **Copy your implemented code** (backend + frontend)
2. **Open Roo Code**
3. **Paste this prompt:**

```
You are a Senior Code Reviewer for SwanStudios.

Review this code for quality issues:

BACKEND CODE:
[PASTE backend controller + route]

FRONTEND CODE:
[PASTE React component]

Check:
1. Code conventions (naming, structure)
2. Code smells (duplicates, long functions, deep nesting)
3. Error handling (try/catch, null checks)
4. TypeScript types (no 'any', proper interfaces)
5. Production readiness (no console.log, no hardcoded values)
6. Readability (comments where needed, clear logic)

Output format:
✅ PASS - Code quality is good
OR
❌ FAIL - Issues found:
  - [Issue 1 with line number]
  - [Issue 2 with line number]
  - [Suggested fixes]
```

---

**If Roo Code says ✅ PASS:**
- [ ] Note: "Checkpoint #1 PASS"
- [ ] Move to Checkpoint #2

**If Roo Code says ❌ FAIL:**
- [ ] Read issues carefully
- [ ] Fix each issue in your code
- [ ] Re-run Checkpoint #1
- [ ] Only proceed when PASS

---

## 🧠 CHECKPOINT #2: LOGIC REVIEW (Gemini Code Assist)

**Your Action:**

1. **Open Gemini Code Assist panel**
2. **Paste this prompt:**

```
You are a Logic Verification Specialist for SwanStudios.

Analyze this code for logical correctness:

CODE:
[PASTE your code]

Context:
- Stack: React 18 + TypeScript + Sequelize
- Domain: Personal training platform (clients track workouts)
- User roles: Admin, Trainer, Client

Check:
1. Business logic correctness
2. Edge cases (null, undefined, empty arrays)
3. State management (React Query usage correct?)
4. API contract compliance (matches expected inputs/outputs?)
5. Data transformations (calculations correct?)
6. Boundary conditions (off-by-one, array indices)

Output format:
✅ PASS - Logic is sound
OR
❌ FAIL - Logic errors found:
  - [Error 1 with explanation]
  - [Error 2 with test case that would fail]
  - [Suggested fixes]
```

---

**If Gemini says ✅ PASS:**
- [ ] Note: "Checkpoint #2 PASS"
- [ ] Move to Checkpoint #3

**If Gemini says ❌ FAIL:**
- [ ] Read logic errors carefully
- [ ] Fix logic issues
- [ ] Re-run Checkpoint #1 (code changed, re-verify quality)
- [ ] Re-run Checkpoint #2
- [ ] Only proceed when BOTH pass

---

## 🔒 CHECKPOINT #3: SECURITY REVIEW (Claude Desktop)

**Your Action:**

1. **Open Claude Desktop (NEW CHAT)**
2. **Paste this prompt:**

```
You are an Application Security Engineer reviewing code for SwanStudios.

Perform a security audit on this code:

CODE:
[PASTE your code]

Security Checklist (OWASP ASVS L2):
1. Input Validation
   - All inputs validated with Zod or similar?
   - SQL injection protected (parameterized queries)?
   - XSS prevention (sanitized outputs)?

2. Authentication & Authorization
   - User authentication checked?
   - Role-based access control enforced?
   - JWT/session validation correct?

3. Data Protection
   - Secrets not hardcoded?
   - Sensitive data encrypted?
   - RLS enforced (tenant_id filtering if multi-tenant)?

4. Error Handling
   - No sensitive info in error messages?
   - Stack traces not exposed to users?

5. API Security
   - Rate limiting considered?
   - CSRF tokens (if state-changing)?
   - Idempotency keys (if needed)?

Output format:
✅ PASS - No security issues found
OR
❌ FAIL - Security vulnerabilities:
  - [Vulnerability 1: Description + Severity (Critical/High/Med/Low)]
  - [How to exploit it]
  - [Mitigation steps]
```

---

**If Claude says ✅ PASS:**
- [ ] Note: "Checkpoint #3 PASS"
- [ ] Move to Checkpoint #4

**If Claude says ❌ FAIL:**
- [ ] **STOP IMMEDIATELY** (security vulnerabilities are critical!)
- [ ] Read each vulnerability carefully
- [ ] Fix security issues
- [ ] Re-run Checkpoint #1 (code quality)
- [ ] Re-run Checkpoint #2 (logic may have changed)
- [ ] Re-run Checkpoint #3 (security)
- [ ] Only proceed when ALL pass

---

## 🧪 CHECKPOINT #4: TESTING REVIEW (ChatGPT-5)

**Your Action:**

1. **Open ChatGPT-5**
2. **Paste this prompt:**

```
You are a QA Engineer for SwanStudios.

Review the code and its tests:

CODE:
[PASTE your code]

TESTS:
[PASTE tests if you have any, or say "No tests provided yet"]

Evaluate:
1. Test Coverage
   - Are all functions tested?
   - Are edge cases covered?
   - Estimate coverage % (target: ≥85%)

2. Test Quality
   - Tests are clear and maintainable?
   - Tests actually test the right thing?
   - No copy-paste test suites?

3. Edge Cases
   - Null/undefined handled?
   - Empty arrays/objects?
   - Invalid inputs?
   - Boundary conditions?

4. Integration Tests
   - API endpoints tested?
   - Database interactions tested?
   - Error states tested?

5. Mocking
   - External dependencies mocked?
   - Mocks are realistic?

Output format:
✅ PASS - Tests are comprehensive (≥85% coverage)
OR
❌ FAIL - Testing gaps found:
  - Coverage estimate: X%
  - Missing tests for: [list]
  - Edge cases not covered: [list]

Please also GENERATE the missing tests in Jest + TypeScript format.
```

---

**If ChatGPT-5 says ✅ PASS:**
- [ ] Note: "Checkpoint #4 PASS - Coverage: X%"
- [ ] Move to Checkpoint #5

**If ChatGPT-5 says ❌ FAIL:**
- [ ] ChatGPT-5 will generate missing tests
- [ ] **COPY** generated tests to your project
- [ ] **CREATE** test files: `__tests__/progressController.test.ts`
- [ ] **RUN** tests: `npm test`
- [ ] If tests fail: Fix code or tests
- [ ] Re-run Checkpoint #4
- [ ] Only proceed when PASS

---

## ⚡ CHECKPOINT #5: PERFORMANCE REVIEW (Codex GPT-4)

**Your Action:**

1. **Open Codex panel in VS Code**
2. **Paste this prompt:**

```
You are a Performance Optimization Specialist for SwanStudios.

Analyze this code for performance issues:

CODE:
[PASTE your code]

Performance Checklist:
1. Database Queries
   - N+1 queries? (use .include() in Sequelize)
   - Missing indexes?
   - Fetching too much data?

2. Algorithms
   - Time complexity acceptable?
   - Space complexity acceptable?
   - Any O(n²) that could be O(n)?

3. React Performance (if applicable)
   - Unnecessary re-renders?
   - Missing useMemo/useCallback?
   - Large lists without virtualization?

4. Memory
   - Memory leaks (event listeners not cleaned up)?
   - Large objects kept in memory?

5. Caching
   - Repeated calculations that could be cached?
   - API calls that could be cached?

Output format:
✅ PASS - No performance issues
OR
❌ FAIL - Performance problems found:
  - [Issue 1: Description + Impact (Critical/High/Med/Low)]
  - [How to fix it]
  - [Expected improvement]
```

---

**If Codex says ✅ PASS:**
- [ ] Note: "Checkpoint #5 PASS"
- [ ] Move to Checkpoint #6

**If Codex says ❌ FAIL:**
- [ ] Read performance issues
- [ ] Optimize code
- [ ] Re-run Checkpoint #1 (code quality)
- [ ] Re-run Checkpoint #2 (logic may have changed)
- [ ] Re-run Checkpoint #5
- [ ] Only proceed when ALL pass

---

## 🔗 CHECKPOINT #6: INTEGRATION REVIEW (Claude Code - Me!)

**Your Action:**

1. **Ask me in this VS Code chat:**

```
You are an Integration Specialist for SwanStudios.

Review this code for integration issues:

FILE PATHS:
- Backend: /backend/controllers/progressController.ts
- Route: /backend/routes/progress.ts
- Frontend: /frontend/src/components/ClientProgressDashboard.tsx

[Or paste code if files not created yet]

Integration Checklist:
1. Codebase Compatibility
   - Follows existing patterns?
   - File structure correct?
   - Imports are correct?

2. Breaking Changes
   - Does this break existing code?
   - API contracts changed?
   - Database schema changes safe?

3. Dependencies
   - New dependencies needed?
   - Version conflicts?
   - Dependencies are secure?

4. Architecture
   - Fits into current architecture?
   - Doesn't violate separation of concerns?

5. Migration Safety
   - Database migrations are reversible?
   - Zero-downtime deployment possible?

Output format:
✅ PASS - Integrates cleanly
OR
❌ FAIL - Integration issues:
  - [Issue 1: Description + Files affected]
  - [Breaking changes detected]
  - [Recommended refactoring]
```

---

**If I say ✅ PASS:**
- [ ] Note: "Checkpoint #6 PASS"
- [ ] Move to Checkpoint #7

**If I say ❌ FAIL:**
- [ ] Read integration issues
- [ ] Refactor for compatibility
- [ ] Re-run Checkpoint #1 (code quality)
- [ ] Re-run Checkpoint #2 (logic may have changed)
- [ ] Re-run Checkpoint #6
- [ ] Only proceed when ALL pass

---

## 👤 CHECKPOINT #7: HUMAN REVIEW (YOU!)

**Your Manual Testing Checklist:**

### **Backend Testing:**
- [ ] Start dev server: `cd backend && npm run dev`
- [ ] Test with Postman/curl:
  ```bash
  curl -H "Authorization: Bearer YOUR_JWT" \
       http://localhost:3000/api/client/progress/stats
  ```
- [ ] Verify: Returns correct data structure
- [ ] Verify: Returns 401 if not authenticated
- [ ] Verify: Returns 500 if database error (test by breaking DB temporarily)

### **Frontend Testing:**
- [ ] Start frontend: `cd frontend && npm run dev`
- [ ] Navigate to: http://localhost:5173/client/progress (or wherever you put it)
- [ ] Verify: Loading spinner shows while fetching
- [ ] Verify: Data displays correctly after load
- [ ] Verify: Mobile responsive (DevTools → Toggle Device Toolbar)
- [ ] Verify: Error state shows if backend is down (stop backend, refresh)

### **User Experience Check:**
- [ ] Does it solve the problem I set out to solve?
- [ ] Is it intuitive to use?
- [ ] Are error messages helpful?
- [ ] Does it look good visually?

### **Code Understanding Check:**
- [ ] I understand what this code does
- [ ] Future me can maintain this
- [ ] Documentation is clear (or add comments if needed)

---

**If everything works:**
- [ ] Note: "Checkpoint #7 PASS - Feature works correctly"
- [ ] **ALL 7 CHECKPOINTS PASS** ✅
- [ ] Move to Git Push

**If something doesn't work:**
- [ ] Note the issue
- [ ] Fix the problem
- [ ] Re-run relevant checkpoints (depends on what you changed)
- [ ] Re-run Checkpoint #7
- [ ] Only proceed when everything PASS

---

# PHASE 5: GIT PUSH & CLEANUP (10 Minutes)

## 📝 STEP 7: CREATE TRACKING RECORD

**Create a file:** `/docs/reviews/client-progress-dashboard-REVIEW.md`

**Template:**

```markdown
# Code Review: Client Progress Dashboard

**Date:** 2025-10-20
**Developer:** [Your name]
**Branch:** feature/client-progress-dashboard
**Estimated Time:** 4 hours
**Actual Time:** [fill in]

---

## Checkpoint Results

### ✅ Checkpoint #1: Code Quality (Roo Code)
- Result: PASS
- Issues found: None
- Time: 2 minutes

### ✅ Checkpoint #2: Logic Review (Gemini)
- Result: PASS (after 1 fix)
- Issues found: Missing null check for empty workouts array
- Fix applied: Added `workouts.length > 0` check
- Time: 5 minutes

### ✅ Checkpoint #3: Security (Claude Desktop)
- Result: PASS
- Issues found: None (authentication already in middleware)
- Time: 5 minutes

### ✅ Checkpoint #4: Testing (ChatGPT-5)
- Result: PASS
- Coverage: 90%
- Tests generated: 12 unit tests, 3 integration tests
- Time: 12 minutes

### ✅ Checkpoint #5: Performance (Codex)
- Result: PASS
- Issues found: None (query is optimized)
- Time: 3 minutes

### ✅ Checkpoint #6: Integration (Claude Code)
- Result: PASS
- Issues found: None (follows existing patterns)
- Time: 4 minutes

### ✅ Checkpoint #7: Human Review
- Result: PASS
- Manual testing: All scenarios passed
- Mobile responsive: Yes
- Time: 8 minutes

---

## Summary
- **Total Issues Found:** 1 (logic error)
- **All Issues Fixed:** Yes
- **Final Quality:** Production-ready
- **Total Review Time:** 39 minutes

---

## Lessons Learned
- Gemini caught edge case I missed (empty array)
- ChatGPT-5 generated excellent tests
- Process worked smoothly

---

## Ready for Production: ✅ YES
```

---

## 🚀 STEP 8: GIT COMMIT & PUSH

**Your Git Workflow:**

```bash
# 1. Make sure you're on a feature branch
git checkout -b feature/client-progress-dashboard

# 2. Stage all changes
git add .

# 3. Create commit with detailed message
git commit -m "feat: add client progress dashboard

- Implements GET /api/client/progress/stats endpoint
- Creates ClientProgressDashboard React component
- Shows workout completion rate, total, and completed workouts
- Includes loading and error states
- Mobile responsive
- 90% test coverage
- Passed all 7 AI review checkpoints

Closes #[issue-number if you have one]"

# 4. Push to remote
git push origin feature/client-progress-dashboard

# 5. Create Pull Request (if using GitHub/GitLab)
# Go to GitHub → Create PR from your branch
```

---

**Your PR Description Template:**

```markdown
## Description
Adds a client progress dashboard showing workout statistics for the current week.

## Changes
- **Backend:**
  - New endpoint: GET /api/client/progress/stats
  - Controller: progressController.ts
  - Route: /api/client/progress/*

- **Frontend:**
  - New component: ClientProgressDashboard.tsx
  - Displays: completion rate, total workouts, completed workouts
  - Uses React Query for data fetching
  - Mobile responsive

## Testing
- ✅ Unit tests (12 tests)
- ✅ Integration tests (3 tests)
- ✅ Manual testing (all scenarios pass)
- ✅ Mobile responsive (tested on iPhone, Android)

## Code Review
Passed all 7 AI checkpoints:
- ✅ Code Quality (Roo Code)
- ✅ Logic Review (Gemini)
- ✅ Security (Claude Desktop)
- ✅ Testing (ChatGPT-5) - 90% coverage
- ✅ Performance (Codex)
- ✅ Integration (Claude Code)
- ✅ Human Review

## Screenshots
[Add screenshot of dashboard]

## Deployment Notes
- No database migrations needed
- No environment variables needed
- Safe to deploy immediately
```

---

# PHASE 6: END OF DAY REVIEW (5 Minutes)

## 📊 STEP 9: REFLECT & IMPROVE

**Daily Reflection Template:**

```markdown
# Daily Reflection - [Date]

## Features Completed Today
1. Client Progress Dashboard ✅

## AI Village Performance
- **Most Helpful AI:** ChatGPT-5 (generated excellent tests)
- **Most Issues Caught:** Gemini (caught logic edge case)
- **Fastest Checkpoint:** Checkpoint #5 (Performance - 3 min)
- **Slowest Checkpoint:** Checkpoint #4 (Testing - 12 min)

## Issues Found by Checkpoints
- Checkpoint #1 (Code Quality): 0 issues
- Checkpoint #2 (Logic): 1 issue (empty array edge case)
- Checkpoint #3 (Security): 0 issues
- Checkpoint #4 (Testing): Missing tests (generated by ChatGPT-5)
- Checkpoint #5 (Performance): 0 issues
- Checkpoint #6 (Integration): 0 issues
- Checkpoint #7 (Human): 0 issues

**Total issues found: 2**
**Issues prevented from reaching production: 2** ✅

## Time Tracking
- Planning (Orchestrator + Architect): 20 minutes
- Implementation (Roo Code + Gemini): 45 minutes
- Code Approval Pipeline: 39 minutes
- Git Push: 5 minutes
- **Total: 109 minutes (1h 49min)**

## What Went Well
- Pipeline caught edge case I would have missed
- ChatGPT-5 test generation saved 30+ minutes
- Feature works perfectly on first try in production

## What to Improve
- Could have asked Orchestrator for better time estimate
- Should have created tests during implementation (not after)

## Tomorrow's Plan
1. Deploy client progress dashboard to production
2. Start next feature: [name]
3. Try to reduce pipeline time to 30 minutes
```

---

## ✅ SUMMARY CHECKLIST (Copy This Daily)

**YOUR DAILY WORKFLOW:**

### **Morning (5 min)**
- [ ] Open all AI tools (Claude Desktop, VS Code, ChatGPT-5)
- [ ] Verify connections (Roo Code, Gemini, Codex)
- [ ] Pick today's task

### **Planning (15-30 min)**
- [ ] Share task with Claude Desktop (Orchestrator)
- [ ] Get PLAN.md
- [ ] Review and approve plan
- [ ] If needed: Get architecture from Claude Desktop (Architect)

### **Implementation (30-60 min)**
- [ ] Backend: Roo Code (Grok Code Fast)
- [ ] Frontend: Gemini Code Assist or v0.dev
- [ ] Test locally (works before reviews)

### **Code Approval Pipeline (30-45 min)**
- [ ] ✅ Checkpoint #1: Code Quality (Roo Code) → PASS?
- [ ] ✅ Checkpoint #2: Logic (Gemini) → PASS?
- [ ] ✅ Checkpoint #3: Security (Claude Desktop) → PASS?
- [ ] ✅ Checkpoint #4: Testing (ChatGPT-5) → PASS?
- [ ] ✅ Checkpoint #5: Performance (Codex) → PASS?
- [ ] ✅ Checkpoint #6: Integration (Claude Code) → PASS?
- [ ] ✅ Checkpoint #7: Human Review → PASS?

### **Git Push (10 min)**
- [ ] Create tracking record
- [ ] Git commit with detailed message
- [ ] Git push
- [ ] Create PR (if using)

### **End of Day (5 min)**
- [ ] Daily reflection
- [ ] Track time and issues
- [ ] Plan tomorrow

---

## 🎯 CRITICAL REMINDERS

### **NEVER:**
- ❌ Skip checkpoints "to save time"
- ❌ Push code that failed a checkpoint without fixing
- ❌ Ignore AI feedback
- ❌ Work on multiple features at once

### **ALWAYS:**
- ✅ Run at least FAST TRACK pipeline (4 checkpoints minimum)
- ✅ Fix issues found by AIs before proceeding
- ✅ Re-run checkpoints after fixes
- ✅ Human review is ALWAYS final checkpoint
- ✅ Document what you learned

---

## 💰 YOUR DAILY COSTS

**Typical Day (3-4 features):**
- Roo Code (Grok Code Fast): 3 features × $0.01 = $0.03
- All other AIs: $0 (included in subscriptions)

**Total daily cost: ~$0.03** (less than a gum!) 🤯

**Time saved per feature: 75-215 minutes** (by catching bugs early)

---

**YOU'RE READY! Start your first feature with this checklist tomorrow morning!** 🚀

**Print or bookmark this page. Follow it step-by-step for every feature.** ✅
