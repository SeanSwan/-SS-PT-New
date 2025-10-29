# Phase 0: Design Approval Process
## No Code Before Consensus

> **Golden Rule:** 🚫 **NO CODE IS WRITTEN UNTIL ALL AIs APPROVE THE DESIGN**
>
> **Why:** Fixing design issues in code takes 10x longer than fixing them in wireframes
> **Result:** Zero architectural regret, cleaner code, faster development

---

## 🎯 What is Phase 0?

Phase 0 is the **mandatory design review phase** that happens before any code is written. It ensures that:

1. **The design is sound** - All AIs review and approve
2. **Security is considered** - Vulnerabilities caught early
3. **Performance is planned** - N+1 queries prevented before they exist
4. **Testing is possible** - Test scenarios identified upfront
5. **Integration is smooth** - No architectural conflicts

**Time Investment:** 30-60 minutes
**Time Saved:** 2-10 hours (by avoiding code rewrites)

---

## 🚀 Phase 0 Workflow

### Step 1: Create Design Artifacts (15-30 min)

Create the following before requesting reviews:

#### A. Wireframe/Mockup
- **Tool:** Figma, Excalidraw, or hand-drawn sketch
- **What to show:**
  - UI layout and components
  - User interactions (click, hover, etc.)
  - Data displayed on each screen
  - Navigation flow

**Example:**
```
Admin Dashboard Enhancement
├── Header: "Client Analytics"
├── Metrics Cards (4 columns)
│   ├── Total Clients: 247
│   ├── Active This Week: 89
│   ├── Revenue (Month): $12,450
│   └── Avg Sessions/Client: 3.2
├── Chart: Session Trends (Line chart, last 30 days)
└── Table: Top Clients by Revenue
    ├── Columns: Name, Sessions, Revenue, Last Active
    └── Pagination: 10 per page
```

#### B. User Stories
- **Format:** As a [role], I want to [action], so that [benefit]
- **Include:**
  - Acceptance criteria
  - Edge cases to handle
  - Out of scope (what this does NOT do)

**Example:**
```
User Story:
As an Admin,
I want to see real-time client analytics,
So that I can monitor business health and make data-driven decisions.

Acceptance Criteria:
- [ ] Metrics update every 30 seconds
- [ ] Can filter by date range
- [ ] Can export data to CSV
- [ ] Multi-tenant isolation enforced

Edge Cases:
- What if no clients exist? (Show empty state)
- What if data is stale? (Show "last updated" timestamp)
- What if export fails? (Show error message, retry button)

Out of Scope:
- Custom report builder (Phase 2)
- Email alerts (Phase 3)
```

#### C. API Specification
- **Format:** OpenAPI 3.0 or simple description
- **Include:**
  - Endpoint URL
  - HTTP method
  - Request parameters
  - Request body schema
  - Response schema
  - Error responses
  - Authentication requirements

**Example:**
```yaml
GET /api/admin/dashboard/metrics
Authentication: Required (JWT, role: admin)
Query Parameters:
  - start_date: ISO8601 date (optional, default: 30 days ago)
  - end_date: ISO8601 date (optional, default: now)
  - tenant_id: UUID (required for multi-tenancy)

Response 200:
{
  "total_clients": 247,
  "active_this_week": 89,
  "revenue_this_month": 12450.00,
  "avg_sessions_per_client": 3.2,
  "session_trends": [
    {"date": "2025-10-01", "count": 15},
    {"date": "2025-10-02", "count": 18}
  ],
  "top_clients": [
    {
      "id": "uuid",
      "name": "John Doe",
      "sessions": 12,
      "revenue": 450.00,
      "last_active": "2025-10-26"
    }
  ]
}

Response 401: Unauthorized
Response 403: Forbidden (not admin role)
```

#### D. Database Schema Changes (if any)
- **Show:**
  - New tables (CREATE TABLE)
  - Modified tables (ALTER TABLE)
  - Indexes (CREATE INDEX)
  - Migrations plan (up and down)

**Example:**
```sql
-- No new tables needed for this feature
-- Using existing: clients, sessions, packages

-- New index for performance
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_created
ON sessions(tenant_id, created_at DESC);

-- Migration plan:
-- UP: Create index
-- DOWN: Drop index (safe, no data loss)
```

---

### Step 2: Post to BRAINSTORM-CONSENSUS.md (5 min)

1. Open `docs/ai-workflow/BRAINSTORM-CONSENSUS.md`
2. Copy the "Design Review Template" section
3. Fill in your design artifacts
4. Save the file
5. Commit: `git add docs/ai-workflow/BRAINSTORM-CONSENSUS.md && git commit -m "feat: design review for [feature]"`

---

### Step 3: Request AI Reviews (20-30 min total)

For each AI, use the prompts from `docs/ai-workflow/AI-ROLE-PROMPTS.md`:

#### 🤖 Claude Code (Integration)
1. Open Claude Code (me!)
2. Paste the "Design Review (All AIs)" prompt
3. Fill in: Role = "Integration Specialist"
4. Paste your design artifacts
5. Get review output
6. **Append** review to `BRAINSTORM-CONSENSUS.md` (don't replace!)

**Time:** 5-7 minutes

---

#### 🤖 Claude Desktop (Orchestrator & Security)
1. Open Claude Desktop
2. Paste the "Design Review (All AIs)" prompt
3. Fill in: Role = "Orchestrator & Security"
4. Paste your design artifacts
5. Get review output
6. **Append** review to `BRAINSTORM-CONSENSUS.md`

**Time:** 5-7 minutes

---

#### 🤖 Gemini Code Assist (Frontend)
1. Open Gemini
2. Paste the "Design Review (All AIs)" prompt
3. Fill in: Role = "Frontend Expert"
4. Paste your design artifacts
5. Get review output
6. **Append** review to `BRAINSTORM-CONSENSUS.md`

**Time:** 3-5 minutes

---

#### 🤖 Roo Code / Grok (Backend)
1. Open Roo Code
2. Paste the "Design Review (All AIs)" prompt
3. Fill in: Role = "Backend Expert"
4. Paste your design artifacts
5. Get review output
6. **Append** review to `BRAINSTORM-CONSENSUS.md`

**Time:** 3-5 minutes

---

#### 🤖 ChatGPT-5 (QA)
1. Open ChatGPT
2. Paste the "Design Review (All AIs)" prompt
3. Fill in: Role = "QA Engineer"
4. Paste your design artifacts
5. Get review output
6. **Append** review to `BRAINSTORM-CONSENSUS.md`

**Time:** 3-5 minutes

---

### Step 4: Review Feedback & Resolve Issues (10-60 min)

All AI reviews are now in `BRAINSTORM-CONSENSUS.md`. Check for:

#### ✅ APPROVED
- No action needed
- Count as 1 approval

#### ⚠️ CONCERNS
- Address the concerns
- Update design artifacts
- Re-run review with that AI
- Document resolution in "Resolution Log"

#### ❌ BLOCKED
- **DO NOT PROCEED**
- This is a critical issue
- Fix the design immediately
- Re-run ALL reviews after fixing

**Consensus Criteria:**
- All AIs must be ✅ APPROVED or ⚠️ CONCERNS (resolved)
- Zero ❌ BLOCKED verdicts
- All issues documented in Resolution Log

---

### Step 5: Mark Consensus Reached (2 min)

In `BRAINSTORM-CONSENSUS.md`, update:

```markdown
### Final Consensus

**Status:** 🟢 CONSENSUS REACHED
**Date:** 2025-10-27
**Approved by:** Claude Code, Claude Desktop, Gemini, Roo Code, ChatGPT-5
**Next Step:** Move to Phase 1 (Code Implementation)
**Implementation Branch:** feature/[feature-name]
```

---

### Step 6: Create Feature Tracking File (5 min)

1. Copy `docs/ai-workflow/FEATURE-TEMPLATE.md`
2. Create `features/[feature-name].md`
3. Fill in Phase 0 section:
   - ✅ Design artifacts
   - ✅ AI consensus reviews completed
   - ✅ Consensus date
   - ✅ Approval status: APPROVED

---

### Step 7: NOW You Can Code! 🎉

**You have:**
- ✅ All AIs reviewed and approved the design
- ✅ Security considerations identified
- ✅ Performance optimizations planned
- ✅ Test scenarios defined
- ✅ Integration issues resolved

**You can now proceed to:**
- Phase 1-7: Code Implementation & Approval Pipeline
- Follow the 7-checkpoint system
- Reference the approved design as you code

---

## 🚨 Common Pitfalls

### ❌ DON'T: Skip Phase 0
**Why it's bad:**
- Discover architectural issues after 500 lines of code
- Have to rewrite entire feature
- Waste 5-10 hours

**Instead:** Spend 30-60 min in Phase 0, save 5-10 hours later

---

### ❌ DON'T: Code During Design Review
**Why it's bad:**
- You'll be emotionally attached to the code
- Harder to accept design feedback
- Waste time coding something that might change

**Instead:** Wait for ✅ CONSENSUS before writing any code

---

### ❌ DON'T: Ignore AI Concerns
**Why it's bad:**
- AIs caught real issues (security, performance, etc.)
- Issues will surface in production if ignored
- Technical debt accumulates

**Instead:** Address every concern or document why it's not applicable

---

### ❌ DON'T: Delete AI Opinions
**Why it's bad:**
- Loses valuable context
- Can't see how design evolved
- Violates append-only rule

**Instead:** Always append new reviews, never edit old ones

---

## 🎯 What Good Phase 0 Looks Like

### ✅ Good Example

**Design Artifacts:**
- ✅ Detailed wireframe with all UI elements
- ✅ Complete user stories with edge cases
- ✅ Full API spec with request/response schemas
- ✅ Database schema with indexes

**AI Reviews:**
- ✅ All 5 AIs provided feedback
- ✅ Concerns were addressed
- ✅ Resolution log is complete
- ✅ Consensus reached

**Outcome:**
- Implementation took 30 minutes
- Zero architectural issues
- First pass through 7-checkpoint pipeline
- Shipped to production same day

---

### ❌ Bad Example

**Design Artifacts:**
- ❌ Vague description: "Add a dashboard"
- ❌ No wireframe
- ❌ No API spec
- ❌ "Will figure out schema later"

**AI Reviews:**
- ❌ Only 2 AIs reviewed
- ❌ Multiple ❌ BLOCKED verdicts ignored
- ❌ No resolution log
- ❌ Consensus not reached

**Outcome:**
- Started coding anyway
- Discovered multi-tenancy issue after 2 hours
- Had to rewrite entire backend
- Security vulnerabilities found in production
- Total waste: 6 hours + production incident

---

## 📊 Phase 0 Metrics to Track

Track these metrics to improve your process:

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **Time in Phase 0** | 30-60 min | Too short = rushed design, too long = overthinking |
| **Issues Found** | 3-7 per feature | Shows thoroughness of reviews |
| **Consensus Rate** | 100% | Should never skip consensus |
| **Rework Rate** | <5% | Should rarely need design changes after consensus |
| **Time Saved** | 2-10 hours | Measures ROI of Phase 0 |

---

## 🎓 Example: Complete Phase 0

### Feature: Enhanced Workout Builder

#### Step 1: Design Artifacts (20 min)

**Wireframe:**
```
Workout Builder UI
├── Header
│   ├── "Build Custom Workout"
│   └── [Save] [Cancel] buttons
├── Exercise Selector (Left Sidebar)
│   ├── Search: [text input]
│   ├── Filters: [Muscle Group] [Equipment] [Difficulty]
│   └── Exercise List (scrollable)
│       ├── Exercise Card: Bench Press
│       ├── Exercise Card: Squats
│       └── ... (100+ exercises)
├── Workout Canvas (Center)
│   ├── Drag & Drop Area
│   ├── Exercise Card (dragged from left)
│   │   ├── Name: Bench Press
│   │   ├── Sets: [3] Reps: [12] Weight: [135] lbs
│   │   ├── Rest: [60] seconds
│   │   └── [Remove] button
│   └── [+ Add Exercise] button
└── Preview (Right Sidebar)
    ├── Workout Summary
    ├── Total Time: 45 min
    ├── Total Volume: 12,450 lbs
    └── Muscle Groups: Chest (40%), Back (30%), Legs (30%)
```

**User Stories:**
```
As a Trainer,
I want to build custom workouts with drag & drop,
So that I can quickly create personalized plans for clients.

Acceptance Criteria:
- [ ] Can search exercises by name
- [ ] Can filter by muscle group, equipment, difficulty
- [ ] Can drag exercises from list to canvas
- [ ] Can set reps, sets, weight, rest for each exercise
- [ ] Can reorder exercises via drag & drop
- [ ] Can remove exercises
- [ ] Can save workout with a name
- [ ] Workout is auto-saved every 30 seconds (draft)

Edge Cases:
- Empty workout (require at least 1 exercise to save)
- Duplicate exercises (allow, might do bench press twice)
- Invalid inputs (sets/reps/weight must be positive numbers)
- Lost connection during save (show error, retry)

Out of Scope:
- Exercise video library (Phase 2)
- AI workout suggestions (Phase 3)
- Client feedback on workouts (Phase 4)
```

**API Spec:**
```yaml
POST /api/workouts
Authentication: Required (JWT, role: trainer)
Request Body:
{
  "name": "Full Body Strength",
  "description": "Focus on compound movements",
  "tenant_id": "uuid",
  "exercises": [
    {
      "exercise_id": "uuid",
      "order": 1,
      "sets": 3,
      "reps": 12,
      "weight": 135,
      "weight_unit": "lbs",
      "rest_seconds": 60
    }
  ]
}

Response 201:
{
  "id": "uuid",
  "name": "Full Body Strength",
  "created_at": "2025-10-27T10:30:00Z"
}

Response 400: Validation error (empty exercises array)
Response 401: Unauthorized
Response 403: Forbidden (not trainer role)
```

**Database Schema:**
```sql
-- workouts table exists, no changes needed

-- New table: workout_exercises (junction table)
CREATE TABLE IF NOT EXISTS workout_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  sets INT NOT NULL CHECK (sets > 0),
  reps INT NOT NULL CHECK (reps > 0),
  weight DECIMAL(6,2) CHECK (weight >= 0),
  weight_unit VARCHAR(10) DEFAULT 'lbs',
  rest_seconds INT DEFAULT 60,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workout_id, exercise_id, order_index)
);

CREATE INDEX idx_workout_exercises_workout ON workout_exercises(workout_id);
CREATE INDEX idx_workout_exercises_exercise ON workout_exercises(exercise_id);
```

---

#### Step 2: Posted to BRAINSTORM-CONSENSUS.md ✅

#### Step 3: AI Reviews (25 min total)

**Claude Code:** ✅ APPROVED
- Design fits existing architecture
- Good use of junction table
- Recommend adding indexes (already included)

**Claude Desktop:** ⚠️ CONCERNS
- Security: Ensure trainer can only create workouts for their own clients (tenant_id check)
- **Resolution:** Added `requireRole('trainer')` + tenant_id validation

**Gemini:** ✅ APPROVED
- Drag & drop UX is good
- Recommend `react-beautiful-dnd` library
- State management with Context API is fine

**Roo Code:** ⚠️ CONCERNS
- Performance: Could have N+1 query when loading workout with exercises
- **Resolution:** Use Sequelize `include` for eager loading

**ChatGPT-5:** ✅ APPROVED
- Testable design
- Edge cases well-defined
- Suggest adding integration tests for drag & drop

---

#### Step 4: Issues Resolved ✅

**All concerns addressed:**
1. Tenant_id validation added
2. Eager loading planned
3. React-beautiful-dnd selected
4. Test scenarios identified

---

#### Step 5: Consensus Reached ✅

**Date:** 2025-10-27 10:45
**All AIs:** ✅ APPROVED

---

#### Step 6: Feature Tracking File Created ✅

`features/enhanced-workout-builder.md` created with Phase 0 complete

---

#### Step 7: Ready to Code! 🎉

**Time Spent in Phase 0:** 45 minutes
**Issues Caught:** 2 (security, performance)
**Time Saved:** ~4 hours (by not discovering issues in code)

**Next:** Proceed to Phase 1-7 (Code Implementation)

---

## 🎉 You're Ready for Phase 0!

**Key Takeaways:**
1. ✅ Create complete design artifacts (wireframe, stories, API, schema)
2. ✅ Get all 5 AIs to review and approve
3. ✅ Resolve all concerns before coding
4. ✅ Document consensus in BRAINSTORM-CONSENSUS.md
5. ✅ ONLY THEN start writing code

**Time Investment:** 30-60 minutes
**ROI:** 2-10 hours saved per feature

---

**Next Steps:**
1. Read `AI-ROLE-PROMPTS.md` for review prompts
2. Use `BRAINSTORM-CONSENSUS.md` template
3. Follow this Phase 0 process for your next feature
4. Track metrics to see time savings

---

*Phase 0 is your quality gate. Never skip it!*

*Last Updated: 2025-10-27*
