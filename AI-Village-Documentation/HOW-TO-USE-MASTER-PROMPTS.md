# 📖 HOW TO USE THE MASTER AI PROMPTS

**Created:** 2025-10-28
**Purpose:** Guide for using the 3 ready-made AI onboarding prompts

---

## 🎯 OVERVIEW

You now have **3 master prompts** that auto-detect which AI is reading them and assign the appropriate role. No more custom prompts for each AI!

### **The 3 Prompts:**

| Prompt File | Use When | Length | Details |
|-------------|----------|--------|---------|
| **MASTER-AI-ONBOARDING-PROMPT.md** | First time working with an AI | ~500 lines | Complete guide, examples, decision trees |
| **QUICK-START-AI-PROMPT.md** | AI needs a refresher | ~150 lines | Essential info, quick templates |
| **COPY-PASTE-PROMPT.txt** | Ultra-fast onboarding | ~25 lines | Compact, just the essentials |

---

## 🚀 HOW TO USE

### **Scenario 1: Onboarding Roo Code for the First Time**

1. Open Roo Code (VS Code extension)
2. Copy the **entire contents** of `MASTER-AI-ONBOARDING-PROMPT.md`
3. Paste into Roo Code chat
4. Roo Code will:
   - Auto-detect it's "Roo Code (Grok Code Fast 1)"
   - Identify its role as "Primary Coder"
   - Read the handbook references
   - Ask you: "What would you like to accomplish today?"
   - **WAIT for your approval before writing any code** ✋

**Example First Response from Roo Code:**
```
I'm Roo Code (Grok Code Fast 1), your Primary Coder. I'm fast, cheap, and ready to implement.

Before I write any code: What needs to be built?

Is there a Phase 0 design I should follow, or is this bugfix work on existing code?

I'll wait for your green light. ✋
```

---

### **Scenario 2: Quick Reminder for ChatGPT-5**

You've already worked with ChatGPT-5 before, but it's been a few days and you want a quick refresher.

1. Open ChatGPT-5
2. Copy **QUICK-START-AI-PROMPT.md**
3. Paste into chat
4. ChatGPT-5 will:
   - Remember it's the "QA Engineer"
   - Check Phase 0 registry
   - Ask what you need reviewed today

**Example Response:**
```
I'm ChatGPT-5, your QA Engineer. I've read the handbook.

Before I proceed: What would you like to accomplish today?

I will NOT write code until you confirm the approach. ✋

Note: I'm great at testing, Phase 0 reviews, edge cases, and analyzing screenshots.
```

---

### **Scenario 3: Ultra-Fast Onboarding (Copy-Paste)**

You're in a hurry and just need to get Claude Desktop up to speed fast.

1. Open Claude Desktop
2. Copy **COPY-PASTE-PROMPT.txt** (the tiny one)
3. Paste into chat
4. Done! Claude Desktop knows:
   - It's the "Deployment Monitor"
   - It shares tokens with Claude Code (20% budget)
   - It should ONLY handle Render deployments
   - It needs to ask what you want before coding

**Example Response:**
```
I'm Claude Desktop, your Deployment Monitor (20% token budget).

⚠️ IMPORTANT: I share tokens with Claude Code. Use me ONLY for deployment issues.

What do you need me to check on Render? Should I:
1. Check deployment status?
2. Review error logs?
3. Monitor live site health?

For architecture/coding tasks, please use Claude Code instead (saves tokens).
```

---

## 🎭 HOW AUTO-DETECTION WORKS

Each prompt contains sections like this:

```markdown
### **If you are Claude Code (VS Code extension):**
**YOUR ROLE:** 🎯 **Main Orchestrator** (80% token budget)
[...]

### **If you are Roo Code (Grok Code Fast 1):**
**YOUR ROLE:** 💻 **Primary Coder**
[...]

### **If you are ChatGPT-5:**
**YOUR ROLE:** 🧪 **QA Engineer**
[...]
```

The AI reads the prompt, finds its section, and adopts that role automatically.

---

## ✅ WHAT EACH PROMPT ENFORCES

All 3 prompts enforce these critical rules:

### **1. NO CODE WITHOUT APPROVAL ✋**
Every AI will ask: **"Should I proceed with implementation?"** before writing code.

**Exception:** You say "implement", "build it", "code it", or similar explicit command.

### **2. PHASE 0 DESIGN REVIEW REQUIRED 📋**
For NEW features, AI will:
- Check `docs/ai-workflow/PHASE-0-REGISTRY.md`
- Confirm Phase 0 exists (5 AI approvals)
- If no Phase 0, suggest creating one first

### **3. CONFIRM ROLE 🎭**
Every AI will tell you:
- Which AI they are
- What their role is
- Ask what you need TODAY

---

## 📋 TYPICAL WORKFLOW

### **Step 1: Pick an AI**
Choose based on task:
- **Architecture/orchestration** → Claude Code
- **Heavy coding** → Roo Code
- **QA/testing** → ChatGPT-5
- **Frontend** → Gemini
- **UI wireframing** → v0.dev
- **Deployment issues** → Claude Desktop

### **Step 2: Paste Appropriate Prompt**
- First time? → `MASTER-AI-ONBOARDING-PROMPT.md`
- Refresher? → `QUICK-START-AI-PROMPT.md`
- In a hurry? → `COPY-PASTE-PROMPT.txt`

### **Step 3: Tell AI What You Need**
AI will ask: **"What would you like to accomplish today?"**

**Your response examples:**
- "Review the Homepage Hero Phase 0 design"
- "Fix the blank pages bug on the Schedule component"
- "Implement the approved Homepage Hero enhancement"
- "Check Render deployment logs for errors"

### **Step 4: AI Proposes Approach**
AI will present a plan (3-5 bullet points) and ask:
> "Should I proceed with this approach? (yes/no)"

### **Step 5: You Approve or Adjust**
- **If good:** "Yes, proceed"
- **If needs tweaking:** "Change X to Y, then proceed"
- **If wrong AI:** "Actually, can you coordinate with [OTHER AI] instead?"

### **Step 6: AI Executes**
AI implements with regular progress updates.

---

## 🎯 SPECIAL USE CASES

### **When You Want to Skip Phase 0 (Not Recommended)**
AI will warn you:
```
⚠️ AI Village Protocol: New features require Phase 0 (5 AI approvals) to catch issues early.

Options:
1. Create quick Phase 0 (30-60 min, prevents costly mistakes)
2. Skip Phase 0 (fast but risky, may need rework)

Which do you prefer?
```

### **When Multiple AIs Are Needed**
AI will suggest coordination:
```
This task needs multiple specialists:
- Claude Code: Architecture design
- Roo Code: Backend implementation
- Gemini: Frontend components

Should I coordinate this workflow or would you prefer to orchestrate manually?
```

### **When AI Gets Asked to Do Wrong Job**
AI will politely redirect:
```
That's actually [OTHER AI]'s specialty. They're better equipped for this task.

Options:
1. I can coordinate with [OTHER AI] (recommended)
2. I can attempt it, but quality may suffer

What would you prefer?
```

---

## 🔄 WHEN TO RE-PASTE THE PROMPT

### **Re-paste when:**
- AI seems to have forgotten its role
- AI starts coding without asking permission
- AI doesn't check Phase 0 registry
- You're starting a new chat session
- Context window gets too full (AI "forgets" earlier instructions)

### **Don't need to re-paste when:**
- AI is following the rules correctly
- You're continuing work from earlier in same session
- AI is just asking clarifying questions

---

## 📊 QUICK COMPARISON TABLE

| Situation | Which Prompt | Why |
|-----------|--------------|-----|
| First time with this AI | **MASTER** | Complete onboarding, examples, decision trees |
| AI worked with before | **QUICK-START** | Just the essentials, faster to read |
| Need to get going NOW | **COPY-PASTE** | Ultra-compact, 30-second read |
| AI forgot its role mid-session | **QUICK-START** | Quick reminder without overwhelming |
| Teaching new team member | **MASTER** | Full details, great for learning |
| New chat session | **COPY-PASTE** | Fast context setting |

---

## 💡 PRO TIPS

### **Tip 1: Keep COPY-PASTE-PROMPT.txt in Clipboard**
Since it's tiny, you can paste it into ANY AI at start of session in 5 seconds.

### **Tip 2: Link to Handbook in Your Chat**
If AI needs more details, tell them:
> "See section 5 of the handbook: AI-Village-Documentation/SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md"

### **Tip 3: Use Claude Desktop Sparingly**
Remember: Claude Desktop shares tokens with Claude Code (20% budget).
Only use for:
- Checking Render deployment
- Viewing live site errors
- MCP access tasks

Everything else → Use Claude Code (80% budget)

### **Tip 4: Save Your Favorite Prompt**
If you always use the same prompt, pin it or save it to a text file for quick access.

### **Tip 5: Customize for Your Workflow**
Feel free to edit these prompts! Add:
- Your specific project priorities
- Custom rules for your team
- Shortcuts you use often

---

## ✅ SUCCESS CHECKLIST

After pasting prompt, verify AI:
- [ ] Identified which AI it is
- [ ] Stated its role correctly
- [ ] Asked what you need today
- [ ] Mentioned it will NOT code without approval
- [ ] Referenced checking Phase 0 registry (if relevant)

If AI skips any of these → Re-paste the prompt

---

## 🎯 EXAMPLE CONVERSATION

**You:** [Paste COPY-PASTE-PROMPT.txt into Roo Code]

**Roo Code:** "I'm Roo Code (Grok Code Fast 1), your Primary Coder. I'm fast, cheap, and ready to implement. Before I write any code: What needs to be built? Is there a Phase 0 design I should follow? I'll wait for your green light. ✋"

**You:** "I need to fix the blank Schedule page bug. It's an existing feature, just broken routing."

**Roo Code:** "Got it - fixing existing feature (no Phase 0 needed). Here's my approach:
1. Check Schedule component routing in App.tsx
2. Verify data loading in ScheduleView
3. Check for null/undefined states causing blank page
4. Test fix locally

Should I proceed? (yes/no)"

**You:** "Yes, proceed"

**Roo Code:** [Starts implementation work]

---

## 📍 WHERE TO FIND THE PROMPTS

**Location:** `AI-Village-Documentation/` directory

**Files:**
```
AI-Village-Documentation/
├── MASTER-AI-ONBOARDING-PROMPT.md    (~500 lines, complete guide)
├── QUICK-START-AI-PROMPT.md          (~150 lines, essentials)
├── COPY-PASTE-PROMPT.txt             (~25 lines, ultra-compact)
├── HOW-TO-USE-MASTER-PROMPTS.md      (this file)
└── SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md  (complete handbook)
```

---

## 🎉 YOU'RE READY!

You now have:
✅ 3 ready-made prompts for any situation
✅ Auto-role detection for all AIs
✅ "No code without approval" enforcement
✅ Phase 0 requirement built-in
✅ Project context included

**Just copy → paste → go!**

---

**Questions?** See the handbook: `SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md`
**Version:** 1.0
**Last Updated:** 2025-10-28
