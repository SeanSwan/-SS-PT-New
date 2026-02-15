# ðŸ¤ AI VILLAGE HANDOFF PROTOCOL

**Purpose:** Prevent AI chaos, coordinate work, avoid monolithic files
**Audience:** All AIs in the AI Village
**Enforcement:** MANDATORY - No exceptions

---

## 2026-02-15 Protocol Update (Operational Override)

If this document conflicts with newer execution reality, apply this override first.

### Source-of-truth order
1. `docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md`
2. `docs/ai-workflow/AI-HANDOFF/VISION-SYNC-2026-02-15.md`
3. This protocol file
4. `docs/MASTER-HANDBOOK.md`

### Current quorum model
- Minimum 3 AIs for high-impact changes:
  1. Implementer
  2. Reviewer A (correctness/security)
  3. Reviewer B (UX/data semantics)
- Optional 4th AI for tie-break/high-risk disagreements.

### Required evidence for completion
- Build/test summary (use `verification-before-completion` skill)
- Files changed
- Verification notes
- UI changes: before/after screenshots (desktop + mobile) — use `webapp-testing` or `agent-browser`
- UI compliance: run `web-design-guidelines` for contrast/accessibility
- Auth/email changes: application logs + provider event interpretation

### Skills infrastructure
All AIs must be aware of the installed skills. See `docs/ai-workflow/SKILLS-INFRASTRUCTURE.md` for the full registry, usage guidelines, and skill chains.

**Mandatory skills per completion claim:**
- `verification-before-completion` — before ANY "done" or "fixed" claim
- `requesting-code-review` — before merge to main

**Mandatory skills per role:**
- Implementer: `systematic-debugging`, `test-driven-development`, `verification-before-completion`
- Reviewer A: `requesting-code-review`, `verification-before-completion`
- Reviewer B: `web-design-guidelines`, `webapp-testing`

---

## ðŸŽ¯ THE GOLDEN RULES

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
ðŸš¨ **CRITICAL - THIS OVERRIDES ALL OTHER RULES**

**If you encounter ANY code (new OR existing) that lacks:**
- âŒ Architecture diagram (Mermaid/ASCII)
- âŒ Database ERD
- âŒ Flowchart (logic flow)
- âŒ Wireframe (UI components)
- âŒ API specifications
- âŒ WHY sections explaining decisions

**YOU MUST:**
1. **STOP** - Do not modify the code immediately
2. **INFORM USER:** "This file lacks [diagram type]. I need to create documentation first before proceeding."
3. **CREATE** - Build the missing diagrams/documentation
4. **GET APPROVAL** - Wait for user to approve the documentation
5. **THEN CODE** - Only then proceed with code changes

**Example:**
```
"âš ï¸ STOP - Documentation Missing

I see sessionController.mjs lacks:
 - Architecture diagram (controller â†’ service â†’ database flow)
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

## ðŸ—ï¸ BLUEPRINT-FIRST ENFORCEMENT

### **What is "Vibe Coding"?**
âŒ **VIBE CODING** = Starting to code without a clear architectural plan
- "Let's just try this and see if it works"
- "I'll figure out the structure as I go"
- "We can refactor later"
- Writing code before understanding full system impact

### **What is Blueprint-First Development?**
âœ… **BLUEPRINT-FIRST** = Architecture documentation BEFORE any code
- Complete ERD diagrams for database changes
- API flow diagrams (Mermaid sequence diagrams)
- Component architecture diagrams
- Business logic WHY sections explaining design decisions
- Security model documentation
- Performance considerations documented

### **Level 5/5 Documentation Standard**

Every code file MUST have comprehensive headers including:
- Blueprint reference link
- Architecture Overview (ASCII/Mermaid diagram)
- Database Relationships (ERD) — for controllers/migrations
- API Flow + Endpoints — for routes/controllers
- Security Model + Auth Strategy
- Business Logic WHY sections
- Error Handling + Performance Considerations

### **Example: Level 5/5 Header (Condensed)**
```javascript
/**
 * Video Library Controller
 * Blueprint Reference: docs/ai-workflow/AI-HANDOFF/VIDEO-LIBRARY-COMPLETE-STATUS.md
 * Architecture Overview:
 * â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
 * â”‚  Admin Client   â”‚â”€â”€â”€â”€â”€â–¶â”‚  Video Library   â”‚â”€â”€â”€â”€â”€â–¶â”‚   PostgreSQL    â”‚
 * â”‚   (Frontend)    â”‚      â”‚   Controller     â”‚      â”‚   + YouTube API â”‚
 * â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
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

### **Blueprint-First Workflow (Summary)**
1. User requests feature
2. AI creates architecture doc (ERD, API specs, security model, WHY sections) — NO CODE YET
3. User approves blueprint
4. AI implements with Level 5/5 headers, every file references blueprint
5. AI updates blueprint doc with IMPLEMENTED status + links to all files

### **Enforcement Rules**

**âŒ PROHIBITED:**
- Writing code without approved blueprint
- "Let me try this approach" without doc
- Refactoring without architecture plan
- "Quick fixes" that bypass blueprint process
- Files with basic comments (Level 1-2 documentation)

**âœ… REQUIRED:**
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

## ðŸ“‹ WORKFLOW FOR EVERY AI

### **Step 1: Onboarding (When User Pastes Master Prompt)**
```
1. Read docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md
2. Read docs/ai-workflow/AI-HANDOFF/VISION-SYNC-2026-02-15.md
3. Read docs/ai-workflow/AI-HANDOFF/HANDOFF-PROTOCOL.md (this file)
4. Read docs/ai-workflow/SKILLS-INFRASTRUCTURE.md (skills registry)
5. Read your personal status file (e.g., CLAUDE-CODE-STATUS.md)
6. Check what other AIs are working on (read their status files)
7. Understand your role, current phase, and which skills apply
8. DO NOT START WORK YET
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
â†’ You have permission to proceed

User says: "Wait" or "Let me check" or asks questions
â†’ DO NOT proceed, answer questions

User says: "No" or "Try option B"
â†’ Adjust and re-present
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
1. Update your status file: Set status to "ðŸŸ¢ ACTIVE"
2. Implement the approved solution
3. Keep files under size limits (split if needed)
4. Follow coding standards
5. Test locally if possible
```

### **Step 7: Complete & Handoff**
```
1. Run verification-before-completion skill (build, tests, behavior check)
2. Run requesting-code-review skill (for non-trivial changes)
3. If UI work: run web-design-guidelines + webapp-testing skills
4. Unlock files in CURRENT-TASK.md
5. Update your status file: Set status to "âœ… COMPLETE"
6. Add to "COMPLETED TODAY" section in CURRENT-TASK.md
7. Commit your changes
8. If passing work to another AI:
   - Update their status file
   - Add task to their queue
   - Include skill verification evidence in handoff notes
   - Notify user
```

---

## ðŸš« ANTI-PATTERNS (NEVER DO THESE)

### **âŒ The Cowboy Coder**
```
âŒ BAD: User asks "Fix the bug" â†’ AI immediately starts editing files

âœ… GOOD: User asks "Fix the bug" â†’ AI:
  1. Reads CURRENT-TASK.md
  2. Analyzes root cause
  3. Presents 3 options
  4. Waits for approval
  5. Then fixes
```

### **âŒ The Monolith Maker**
```
âŒ BAD: AI writes 2000-line component file

âœ… GOOD: AI splits into:
  - MyComponent.tsx (200 lines)
  - MyComponent.styles.ts (100 lines)
  - MyComponent.types.ts (50 lines)
  - MyComponent.utils.ts (150 lines)
  - MyComponent.hooks.ts (100 lines)
```

### **âŒ The Lone Wolf**
```
âŒ BAD: AI edits files without checking what other AIs are doing

âœ… GOOD: AI checks:
  - CURRENT-TASK.md (locked files?)
  - Other AI status files (conflicts?)
  - Coordinates or waits
```

### **âŒ The Assumption Maker**
```
âŒ BAD: AI assumes user wants approach X and implements it

âœ… GOOD: AI presents options A, B, C and lets user choose
```

---

## ðŸ“‚ FILE STRUCTURE

```
docs/ai-workflow/AI-HANDOFF/
â”œâ”€â”€ CURRENT-TASK.md          â† Single source of truth (read first!)
â”œâ”€â”€ HANDOFF-PROTOCOL.md      â† This file (the rules)
â”œâ”€â”€ CLAUDE-CODE-STATUS.md    â† Claude Code's work log
â”œâ”€â”€ GEMINI-STATUS.md         â† Gemini's work log
â”œâ”€â”€ CHATGPT-STATUS.md        â† ChatGPT-5's work log
â”œâ”€â”€ ROO-CODE-STATUS.md       â† Roo Code's work log (uses Grok models)
â””â”€â”€ MINMAX-V2-STATUS.md      â† MinMax v2's work log (Strategic UX & Multi-AI Orchestrator)
```

---

## ðŸŽ¯ STATUS FILE FORMAT

Each AI has a status file. Format:

```markdown
# [AI NAME] STATUS

**Last Updated:** YYYY-MM-DD HH:MM AM/PM
**Current Status:** ðŸŸ¢ ACTIVE | â¸ï¸ IDLE | âœ… COMPLETE | ðŸ”´ BLOCKED

---

## ðŸŽ¯ CURRENT WORK

**Task:** [Description]
**Files Editing:** [List of files]
**Permission:** âœ… GRANTED | â¸ï¸ WAITING | âŒ DENIED
**ETA:** [Time estimate]
**Blocked By:** [If blocked, what's blocking]

---

## âœ… COMPLETED TODAY

1. [Task 1] - [Time completed]
2. [Task 2] - [Time completed]

---

## ðŸ“‹ QUEUED TASKS

1. [Pending task 1]
2. [Pending task 2]

---

## ðŸ’¬ NOTES / HANDOFF

[Any notes for other AIs or user]
```

---

## HANDOFF SCENARIOS (Summary)

- **AI-to-AI handoff:** Completing AI updates CURRENT-TASK.md + receiving AI's status file, then notifies user.
- **File conflict:** First AI locks file in CURRENT-TASK.md. Second AI waits or works on different files. User breaks ties.
- **Emergency:** Still read CURRENT-TASK.md (10 seconds), present fast analysis, fix immediately, update status after.

---

## ðŸ“ FILE SIZE LIMITS

### **When to Split Files:**

**Documentation:**
- Max 500 lines per file
- If longer: Split into Part 1, Part 2, etc.
- Example: MASTER-PLAN.md â†’ MASTER-PLAN-PART-1.md, MASTER-PLAN-PART-2.md

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
  userService.ts â†’ Split into:
  - userAuthService.ts (login, logout)
  - userProfileService.ts (profile CRUD)
  - userSettingsService.ts (settings management)
  ```

**If AI Suggests Large File:**
```

---

## ðŸŽ¯ MASTER PROMPT INTEGRATION

**When user pastes master prompt, AI should:**

1. **Immediately read these files (in order):**
   ```
   a. docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md
   b. docs/ai-workflow/AI-HANDOFF/VISION-SYNC-2026-02-15.md
   c. docs/ai-workflow/AI-HANDOFF/HANDOFF-PROTOCOL.md (this file)
   d. docs/ai-workflow/SKILLS-INFRASTRUCTURE.md
   e. docs/ai-workflow/AI-HANDOFF/[YOUR-AI-NAME]-STATUS.md
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

##ðŸš€ SKILLS QUICK REFERENCE

**10 skills installed** across `.agents/skills/` — full docs: `docs/ai-workflow/SKILLS-INFRASTRUCTURE.md`

| Skill | When to Use |
|-------|-------------|
| `verification-before-completion` | Before ANY "done" or "fixed" claim |
| `systematic-debugging` | Any bug, test failure, or unexpected behavior |
| `requesting-code-review` | After task completion, before merge |
| `test-driven-development` | Before writing production code |
| `webapp-testing` | After frontend changes with user-facing behavior |
| `web-design-guidelines` | After UI/styled-component changes |
| `agent-browser` | Form testing, login flows, visual verification |
| `audit-website` | Pre-launch, regression detection |
| `frontend-design` | Building new components/pages |
| `ui-ux-pro-max` | Design system, palettes, font pairings |

**Maintenance:** `npx skills check` | `npx skills update` | `npx skills find <keyword>`

---

**END OF HANDOFF-PROTOCOL.md**

