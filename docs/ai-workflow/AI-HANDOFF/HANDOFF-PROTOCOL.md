# 🤝 AI VILLAGE HANDOFF PROTOCOL

**Purpose:** Prevent AI chaos, coordinate work, avoid monolithic files
**Audience:** All AIs in the AI Village
**Enforcement:** MANDATORY - No exceptions

---

## 🎯 THE GOLDEN RULES

### **Rule #1: Read CURRENT-TASK.md First**
Before doing ANYTHING, read `docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md`

### **Rule #2: No Work Without Permission**
NEVER start coding/editing without explicit user approval

### **Rule #3: Lock Files You're Editing**
Add files to the "LOCKED FILES" section in CURRENT-TASK.md

### **Rule #4: Update Your Status**
Keep your `[AI-NAME]-STATUS.md` file current

### **Rule #5: No Monoliths**
Split large files. Max sizes:
- Docs: 500 lines
- Components: 300 lines
- Services: 400 lines

### **Rule #6: Blueprint-First Development (NO VIBE CODING)**
NEVER write code without an approved architectural blueprint
- All code MUST have Level 5/5 documentation (embedded diagrams)
- All features MUST have approved architecture doc BEFORE coding
- NO "vibe coding" or "figure it out as we go"

### **Rule #7: STOP IF CODE LACKS DIAGRAMS (DIAGRAM-FIRST ENFORCEMENT)**
🚨 **CRITICAL - THIS OVERRIDES ALL OTHER RULES**

**If you encounter ANY code (new OR existing) that lacks:**
- ❌ Architecture diagram (Mermaid/ASCII)
- ❌ Database ERD
- ❌ Flowchart (logic flow)
- ❌ Wireframe (UI components)
- ❌ API specifications
- ❌ WHY sections explaining decisions

**YOU MUST:**
1. **STOP** - Do not modify the code immediately
2. **INFORM USER:** "This file lacks [diagram type]. I need to create documentation first before proceeding."
3. **CREATE** - Build the missing diagrams/documentation
4. **GET APPROVAL** - Wait for user to approve the documentation
5. **THEN CODE** - Only then proceed with code changes

**Example:**
```
"⚠️ STOP - Documentation Missing

I see sessionController.mjs lacks:
 - Architecture diagram (controller → service → database flow)
 - Flowchart for booking logic
 - WHY sections (session deduction policy explanation)

Per blueprint-first mandate, I cannot modify undocumented code.

Should I:
A) Create diagrams/docs first (RECOMMENDED - ~10 min)
B) Proceed anyway (VIOLATES SwanStudios standards)

I strongly recommend Option A."
```

**THIS IS NON-NEGOTIABLE.** Document before modifying.

---

## 🏗️ BLUEPRINT-FIRST ENFORCEMENT

### **What is "Vibe Coding"?**
❌ **VIBE CODING** = Starting to code without a clear architectural plan
- "Let's just try this and see if it works"
- "I'll figure out the structure as I go"
- "We can refactor later"
- Writing code before understanding full system impact

### **What is Blueprint-First Development?**
✅ **BLUEPRINT-FIRST** = Architecture documentation BEFORE any code
- Complete ERD diagrams for database changes
- API flow diagrams (Mermaid sequence diagrams)
- Component architecture diagrams
- Business logic WHY sections explaining design decisions
- Security model documentation
- Performance considerations documented

### **Level 5/5 Documentation Standard**

Every code file MUST have comprehensive headers including:

**For Controllers/Services:**
- Blueprint reference link
- Architecture Overview (ASCII diagram)
- Database Relationships (ERD)
- API Flow (Mermaid sequence diagram)
- API Endpoints list
- Security Model
- Error Handling Strategy
- Business Logic Decisions (WHY sections)
- Dependencies
- Environment Variables
- Performance Considerations
- Testing references

**For Database Migrations:**
- Blueprint reference link
- Table Relationships (ER Diagram)
- Complete schema documentation
- Data Flow descriptions
- Indexes list with descriptions
- Business Logic WHY sections
- Security considerations
- Migration safety notes

**For Routes:**
- Blueprint reference link
- Architecture Overview
- Middleware Flow diagram
- API Endpoints table
- Request/Response Flow (Mermaid)
- Authentication Strategy
- Error Responses
- Security Model

**For Middleware:**
- Blueprint reference link
- Architecture Overview
- Authentication Flow (Mermaid)
- Security Model
- Error Responses
- Usage Examples
- Performance Considerations

### **Example: Level 5/5 Header**
```javascript
/**
 * Video Library Controller (Admin Exercise Management)
 * =====================================================
 *
 * Purpose: Manage NASM exercise library with YouTube + upload video demonstrations
 *
 * Blueprint Reference: docs/ai-workflow/AI-HANDOFF/VIDEO-LIBRARY-COMPLETE-STATUS.md
 *
 * Architecture Overview:
 * ┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
 * │  Admin Client   │─────▶│  Video Library   │─────▶│   PostgreSQL    │
 * │   (Frontend)    │      │   Controller     │      │   + YouTube API │
 * └─────────────────┘      └──────────────────┘      └─────────────────┘
 *
 * [Full architecture diagram, ERDs, Mermaid diagrams, etc.]
 *
 * Business Logic:
 * WHY Soft Deletes?
 * - Workout history integrity
 * - NASM compliance requirements
 * - Data recovery capabilities
 *
 * [Complete documentation...]
 */
```

### **Blueprint-First Workflow**

**Step 1: User Requests Feature**
```
User: "Add video library to exercise management"
```

**Step 2: AI Creates Architecture Doc (NO CODE YET)**
```
AI:
1. Creates: docs/ai-workflow/features/VIDEO-LIBRARY-ARCHITECTURE.md
2. Documents:
   - Database schema (ERD diagrams)
   - API endpoints (Mermaid sequence diagrams)
   - Security model
   - Business logic decisions (WHY sections)
   - Performance considerations
   - Testing strategy
3. Presents to user for approval
4. WAITS for approval
```

**Step 3: User Approves Blueprint**
```
User: "Approved, proceed with implementation"
```

**Step 4: AI Implements with Level 5/5 Docs**
```
AI:
1. Creates migration files with comprehensive headers (ER diagrams, WHY sections)
2. Creates controller with comprehensive headers (Mermaid diagrams, security model)
3. Creates routes with comprehensive headers (middleware flow, auth strategy)
4. Every file references the blueprint document
5. Every file has embedded architecture diagrams
```

**Step 5: AI Updates Blueprint Status**
```
AI:
1. Updates blueprint doc with "✅ IMPLEMENTED" status
2. Links to all implementation files
3. Documents any deviations from original plan
```

### **Enforcement Rules**

**❌ PROHIBITED:**
- Writing code without approved blueprint
- "Let me try this approach" without doc
- Refactoring without architecture plan
- "Quick fixes" that bypass blueprint process
- Files with basic comments (Level 1-2 documentation)

**✅ REQUIRED:**
- Blueprint doc approved BEFORE coding
- All files have Level 5/5 headers
- Architecture diagrams embedded in code
- Business logic WHY sections
- Blueprint reference links in every file

### **Quality Checklist**

Before marking work complete, verify:
- [ ] Blueprint document exists and is approved
- [ ] All code files have comprehensive headers (Level 5/5)
- [ ] ERD diagrams present for database changes
- [ ] Mermaid sequence diagrams for API flows
- [ ] Business logic WHY sections explain design decisions
- [ ] Security considerations documented
- [ ] Performance implications documented
- [ ] Files reference blueprint document
- [ ] No "vibe coding" - everything is intentional

---

## 📋 WORKFLOW FOR EVERY AI

### **Step 1: Onboarding (When User Pastes Master Prompt)**
```
1. Read docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md
2. Read docs/ai-workflow/AI-HANDOFF/HANDOFF-PROTOCOL.md (this file)
3. Read your personal status file (e.g., CLAUDE-CODE-STATUS.md)
4. Read AI Village documentation:
   - AI-Village-Documentation/YOUR-AI-VILLAGE-ROLE-ASSIGNMENTS.md
   - AI-Village-Documentation/CODE-APPROVAL-PIPELINE.md
5. Check what other AIs are working on (read their status files)
6. Understand your role and current phase
7. DO NOT START WORK YET
```

### **Step 2: Analysis**
```
1. User presents a task/problem
2. Analyze the situation
3. Check CURRENT-TASK.md for conflicts
4. Check other AI status files
5. Identify root cause
6. Draft a solution
7. DO NOT IMPLEMENT YET
```

### **Step 3: Present Options**
```
1. Present 2-4 options to the user
2. For each option, explain:
   - What you'll do
   - What files you'll change
   - Why this approach
   - Pros and cons
   - Time estimate
3. Recommend one option
4. WAIT for user approval
```

### **Step 4: Get Permission**
```
User says: "Option A" or "Do it" or "Yes"
→ You have permission to proceed

User says: "Wait" or "Let me check" or asks questions
→ DO NOT proceed, answer questions

User says: "No" or "Try option B"
→ Adjust and re-present
```

### **Step 5: Lock Files**
```
1. Update CURRENT-TASK.md
2. Add files to "LOCKED FILES" section
3. Format: "filename.ts - Locked by [AI Name] - [Task description]"
4. Commit CURRENT-TASK.md changes
```

### **Step 6: Do The Work**
```
1. Update your status file: Set status to "🟢 ACTIVE"
2. Implement the approved solution
3. Keep files under size limits (split if needed)
4. Follow coding standards
5. Test locally if possible
```

### **Step 7: Complete & Handoff**
```
1. Unlock files in CURRENT-TASK.md
2. Update your status file: Set status to "✅ COMPLETE"
3. Add to "COMPLETED TODAY" section in CURRENT-TASK.md
4. Commit your changes
5. If passing work to another AI:
   - Update their status file
   - Add task to their queue
   - Notify user
```

---

## 🚫 ANTI-PATTERNS (NEVER DO THESE)

### **❌ The Cowboy Coder**
```
❌ BAD: User asks "Fix the bug" → AI immediately starts editing files

✅ GOOD: User asks "Fix the bug" → AI:
  1. Reads CURRENT-TASK.md
  2. Analyzes root cause
  3. Presents 3 options
  4. Waits for approval
  5. Then fixes
```

### **❌ The Monolith Maker**
```
❌ BAD: AI writes 2000-line component file

✅ GOOD: AI splits into:
  - MyComponent.tsx (200 lines)
  - MyComponent.styles.ts (100 lines)
  - MyComponent.types.ts (50 lines)
  - MyComponent.utils.ts (150 lines)
  - MyComponent.hooks.ts (100 lines)
```

### **❌ The Lone Wolf**
```
❌ BAD: AI edits files without checking what other AIs are doing

✅ GOOD: AI checks:
  - CURRENT-TASK.md (locked files?)
  - Other AI status files (conflicts?)
  - Coordinates or waits
```

### **❌ The Assumption Maker**
```
❌ BAD: AI assumes user wants approach X and implements it

✅ GOOD: AI presents options A, B, C and lets user choose
```

---

## 📂 FILE STRUCTURE

```
docs/ai-workflow/AI-HANDOFF/
├── CURRENT-TASK.md          ← Single source of truth (read first!)
├── HANDOFF-PROTOCOL.md      ← This file (the rules)
├── CLAUDE-CODE-STATUS.md    ← Claude Code's work log
├── GEMINI-STATUS.md         ← Gemini's work log
├── CHATGPT-STATUS.md        ← ChatGPT-5's work log
├── ROO-CODE-STATUS.md       ← Roo Code's work log (uses Grok models)
└── MINMAX-V2-STATUS.md      ← MinMax v2's work log (Strategic UX & Multi-AI Orchestrator)
```

---

## 🎯 STATUS FILE FORMAT

Each AI has a status file. Format:

```markdown
# [AI NAME] STATUS

**Last Updated:** YYYY-MM-DD HH:MM AM/PM
**Current Status:** 🟢 ACTIVE | ⏸️ IDLE | ✅ COMPLETE | 🔴 BLOCKED

---

## 🎯 CURRENT WORK

**Task:** [Description]
**Files Editing:** [List of files]
**Permission:** ✅ GRANTED | ⏸️ WAITING | ❌ DENIED
**ETA:** [Time estimate]
**Blocked By:** [If blocked, what's blocking]

---

## ✅ COMPLETED TODAY

1. [Task 1] - [Time completed]
2. [Task 2] - [Time completed]

---

## 📋 QUEUED TASKS

1. [Pending task 1]
2. [Pending task 2]

---

## 💬 NOTES / HANDOFF

[Any notes for other AIs or user]
```

---

## 🔄 HANDOFF SCENARIOS

### **Scenario 1: Claude → Gemini (Frontend Work)**
```
Claude Code:
1. Completes backend API
2. Updates CURRENT-TASK.md
3. Updates GEMINI-STATUS.md with queued task
4. Notifies user: "Backend done. Gemini should build frontend now."

User:
Pastes master prompt to Gemini

Gemini:
1. Reads CURRENT-TASK.md
2. Reads GEMINI-STATUS.md
3. Sees queued task from Claude
4. Presents options to user
5. Waits for approval
```

### **Scenario 2: Multiple AIs Need Same File**
```
Situation: Both Claude and Gemini want to edit App.tsx

Solution:
1. First AI locks the file in CURRENT-TASK.md
2. Second AI sees file is locked
3. Second AI either:
   a. Waits for unlock
   b. Works on different files
   c. Coordinates with first AI via status files
4. User decides priority if conflict
```

### **Scenario 3: Emergency Situation**
```
User: "Site is down! Fix now!"

Any AI:
1. Still reads CURRENT-TASK.md (10 seconds)
2. Presents FAST analysis + 1-2 options
3. User picks one
4. AI fixes immediately
5. Updates status files after fix
```

---

## 📏 FILE SIZE LIMITS

### **When to Split Files:**

**Documentation:**
- Max 500 lines per file
- If longer: Split into Part 1, Part 2, etc.
- Example: MASTER-PLAN.md → MASTER-PLAN-PART-1.md, MASTER-PLAN-PART-2.md

**Components:**
- Max 300 lines per component file
- Split into: Component, Styles, Types, Utils, Hooks
- Example:
  ```
  Button.tsx (main component - 200 lines)
  Button.styles.ts (styled-components - 80 lines)
  Button.types.ts (TypeScript types - 30 lines)
  ```

**Services:**
- Max 400 lines per service file
- Split by domain/feature
- Example:
  ```
  userService.ts → Split into:
  - userAuthService.ts (login, logout)
  - userProfileService.ts (profile CRUD)
  - userSettingsService.ts (settings management)
  ```

**If AI Suggests Large File:**
```
User: "Create user management system"

❌ BAD AI Response:
"I'll create UserManagement.tsx (1200 lines)"

✅ GOOD AI Response:
"I'll create a user management system split into:
- UserManagementContainer.tsx (100 lines) - Main container
- UserTable.tsx (200 lines) - Table display
- UserForm.tsx (150 lines) - Create/edit form
- UserFilters.tsx (100 lines) - Search/filter UI
- userManagement.service.ts (300 lines) - API calls
- userManagement.types.ts (80 lines) - TypeScript types

Total: 6 files, ~930 lines (average 155 lines/file)

Options:
A. Create all 6 files now
B. Start with container + table, add rest later
C. Different structure?

What do you prefer?"
```

---

## 🎯 MASTER PROMPT INTEGRATION

**When user pastes master prompt, AI should:**

1. **Immediately read these files (in order):**
   ```
   a. docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md
   b. docs/ai-workflow/AI-HANDOFF/HANDOFF-PROTOCOL.md
   c. docs/ai-workflow/AI-HANDOFF/[YOUR-AI-NAME]-STATUS.md
   d. AI-Village-Documentation/YOUR-AI-VILLAGE-ROLE-ASSIGNMENTS.md
   ```

2. **Understand context:**
   - Where are we in the project?
   - What's the current phase?
   - What's my role?
   - What are other AIs doing?
   - Any blocked tasks?

3. **Report to user:**
   ```
   "Hi! I'm [AI Name], the [Role] for SwanStudios.

   I've read the current state:
   - Current Phase: [Phase name]
   - Current Task: [Task description]
   - My Status: [Status]
   - Other AIs: [Who's doing what]

   I'm ready to help! What would you like me to work on?"
   ```

4. **Wait for instruction** - DO NOT start work automatically

---

## ✅ BENEFITS OF THIS SYSTEM

**For User (You):**
- ✅ Paste master prompt = AI instantly knows everything
- ✅ No more "where were we?" confusion
- ✅ No duplicate work from multiple AIs
- ✅ Clear visibility into what every AI is doing
- ✅ No monolithic nightmare files
- ✅ Easy to switch between AIs mid-task

**For AIs:**
- ✅ Clear instructions
- ✅ No conflicts
- ✅ Proper handoffs
- ✅ Structured communication
- ✅ Quality standards enforced

**For Codebase:**
- ✅ No monoliths
- ✅ Clean, maintainable files
- ✅ Proper documentation
- ✅ Zero rework (files done right first time)

---

## 🚀 GETTING STARTED

**Next Steps:**
1. ✅ This protocol is now in place
2. ⏳ Create individual AI status files
3. ⏳ Create master prompt that references this system
4. ⏳ Test with next task
5. ⏳ Refine based on real usage

---

**END OF HANDOFF-PROTOCOL.md**
