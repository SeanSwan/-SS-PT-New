# ✅ MASTER PROMPT SYSTEM - COMPLETE

**Created:** 2025-10-28
**Status:** Ready to use immediately

---

## 🎉 WHAT YOU NOW HAVE

You requested a **master prompt system** that makes it easy to onboard any AI with:
1. ✅ Auto-detection of which AI is reading the prompt
2. ✅ Automatic role assignment based on AI identity
3. ✅ "NO CODE WITHOUT APPROVAL" enforcement
4. ✅ Phase 0 design review requirement
5. ✅ Clear first questions for each AI to ask
6. ✅ References to all required documentation

**Result:** 3 ready-made prompts + 2 guide documents

---

## 📦 THE COMPLETE SYSTEM

### **Ready-to-Use Prompts:**

1. **MASTER-AI-ONBOARDING-PROMPT.md** (~500 lines)
   - Complete onboarding guide
   - Auto-role detection for 6 AIs
   - First message templates for each role
   - Decision trees and edge cases
   - Examples of good/bad responses
   - Use when: First time with an AI, need full details

2. **QUICK-START-AI-PROMPT.md** (~150 lines)
   - Essential information only
   - Quick role reference table
   - Critical rules checklist
   - Fast decision tree
   - Use when: AI needs refresher, worked together before

3. **COPY-PASTE-PROMPT.txt** (~25 lines)
   - Ultra-compact format
   - Just the absolute essentials
   - 30-second read time
   - Use when: Need to get going NOW

### **How-To Guides:**

4. **HOW-TO-USE-MASTER-PROMPTS.md**
   - Complete usage guide
   - Scenario examples
   - Workflow walkthrough
   - When to re-paste prompts
   - Pro tips and tricks

5. **PROMPT-CHEAT-SHEET.md**
   - Visual quick reference
   - Decision flowchart
   - Expected AI responses
   - Common scenarios table
   - Print-friendly format

---

## 🤖 AUTO-DETECTION: HOW IT WORKS

Each prompt contains sections like this:

```markdown
## 🤖 WHO ARE YOU? (AUTO-DETECT YOUR ROLE)

### **If you are Claude Code (VS Code extension):**
**YOUR ROLE:** 🎯 Main Orchestrator (80% token budget)
[Complete role description, responsibilities, first questions]

### **If you are Claude Desktop:**
**YOUR ROLE:** 🚀 Deployment Monitor (20% token budget)
[Complete role description, responsibilities, first questions]

### **If you are Roo Code (Grok Code Fast 1):**
**YOUR ROLE:** 💻 Primary Coder
[Complete role description, responsibilities, first questions]

[... continues for all 6 AIs ...]
```

**The AI reads the prompt, finds its section, and adopts that role automatically.**

---

## 🎯 ROLE ASSIGNMENTS (BUILT INTO PROMPTS)

| AI | Auto-Detected Role | Token Budget | Specialty |
|----|-------------------|--------------|-----------|
| **Claude Code** | 🎯 Main Orchestrator | 160K (80%) | Architecture, integration, coordination |
| **Claude Desktop** | 🚀 Deployment Monitor | 40K (20%) | Render deployments ONLY (shares with Claude Code) |
| **Roo Code** | 💻 Primary Coder | 256K | Heavy coding, fast iteration ($0.20/1M) |
| **ChatGPT-5** | 🧪 QA Engineer | 128K | Testing, Phase 0 reviews, edge cases |
| **Gemini** | ⚛️ Frontend Specialist | 1M | React, styled-components, theme |
| **v0.dev** | 🎨 UI Wireframing | N/A | Visual prototyping, React components |

---

## 🚨 RULES ENFORCED BY ALL PROMPTS

### **1. NO CODE WITHOUT APPROVAL ✋**
Every AI will ask: **"Should I proceed with implementation?"** before writing ANY code.

**What AI says:**
> "I will NOT write code until you confirm the approach. ✋"

**Exception:** You explicitly say "implement", "build it", "code it"

### **2. PHASE 0 DESIGN REVIEW REQUIRED 📋**
For NEW features, AI will:
- Check `docs/ai-workflow/PHASE-0-REGISTRY.md`
- Verify Phase 0 exists (needs 5 AI approvals)
- If no Phase 0, suggest creating one first

**What AI asks:**
> "Is there a Phase 0 design review I should reference?"

### **3. CONFIRM ROLE 🎭**
Every AI will state:
- Which AI they are
- What their role is
- Their specialty/strength
- Token budget (if applicable)

**What AI says:**
> "I'm [AI NAME], your [ROLE]. Before I proceed: What would you like to accomplish today?"

### **4. ASK WHAT YOU NEED 📍**
No assumptions - AI always asks what you want to work on TODAY.

**What AI asks:**
> "What would you like to accomplish today?"

---

## 📋 TYPICAL WORKFLOW (USING THE PROMPTS)

### **Step 1: Choose Your AI**
Based on task type:
- Architecture? → Claude Code
- Heavy coding? → Roo Code
- QA/testing? → ChatGPT-5
- Frontend? → Gemini
- Wireframing? → v0.dev
- Deployment? → Claude Desktop

### **Step 2: Pick Your Prompt**
- First time? → `MASTER-AI-ONBOARDING-PROMPT.md`
- Refresher? → `QUICK-START-AI-PROMPT.md`
- In a hurry? → `COPY-PASTE-PROMPT.txt`

### **Step 3: Copy & Paste**
Open the prompt file, copy entire contents, paste into AI chat.

### **Step 4: AI Auto-Detects Role**
AI reads prompt, finds its section, adopts role, asks what you need.

**Example (Roo Code):**
```
I'm Roo Code (Grok Code Fast 1), your Primary Coder.
I'm fast, cheap, and ready to implement.

Before I write any code: What needs to be built?

Is there a Phase 0 design I should follow, or is this bugfix work?

I'll wait for your green light. ✋
```

### **Step 5: Tell AI What You Need**
```
You: "Fix the blank Schedule page bug - it's broken routing."
```

### **Step 6: AI Proposes Approach**
```
AI: "Here's my approach:
1. Check Schedule routing in App.tsx
2. Verify data loading in ScheduleView
3. Fix null states causing blank page
4. Test locally

Should I proceed? (yes/no)"
```

### **Step 7: You Approve**
```
You: "Yes, proceed"
```

### **Step 8: AI Executes**
AI implements with regular updates, NO code written before this step.

---

## 🎯 WHICH PROMPT WHEN?

### **Use MASTER when:**
- ✅ First time working with this AI on SwanStudios
- ✅ Onboarding new team member
- ✅ Need complete role explanation with examples
- ✅ Want to understand decision trees and edge cases

### **Use QUICK-START when:**
- ✅ Worked with this AI before, need refresher
- ✅ AI seems to have forgotten its role mid-project
- ✅ Starting new chat session with familiar AI
- ✅ Want essential info without overwhelming detail

### **Use COPY-PASTE when:**
- ✅ Daily standup with regular AIs
- ✅ Emergency bug fix, no time to waste
- ✅ Simple task, everyone knows the drill
- ✅ Just need to set context quickly (30 seconds)

---

## 📍 FILE LOCATIONS

All prompts are in: `AI-Village-Documentation/`

```
AI-Village-Documentation/
├── MASTER-AI-ONBOARDING-PROMPT.md           👈 Full onboarding (~500 lines)
├── QUICK-START-AI-PROMPT.md                 👈 Quick refresh (~150 lines)
├── COPY-PASTE-PROMPT.txt                    👈 Ultra-fast (~25 lines)
├── HOW-TO-USE-MASTER-PROMPTS.md             👈 Complete usage guide
├── PROMPT-CHEAT-SHEET.md                    👈 Visual quick reference
├── MASTER-PROMPT-SYSTEM-COMPLETE.md         👈 This file (summary)
└── SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md 👈 Complete handbook (updated)
```

---

## ✅ WHAT'S BEEN UPDATED

### **1. AI Village Handbook**
Updated `SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md` with:
- Reference to new prompt system at top
- Updated "Last Updated" date to 2025-10-28
- Quick Start section linking to all 3 prompts

### **2. Documentation Structure**
All documents cross-reference each other:
- Master prompt → Points to handbook for details
- Handbook → Points to prompts for onboarding
- How-to guide → Points to both handbook and prompts
- Cheat sheet → Points to all key documents

---

## 🎉 READY TO USE IMMEDIATELY

### **Test it out:**

1. Open Roo Code
2. Copy contents of `COPY-PASTE-PROMPT.txt`
3. Paste into chat
4. Watch Roo Code:
   - Auto-detect it's "Roo Code (Grok Code Fast 1)"
   - Adopt "Primary Coder" role
   - Ask what you want to build
   - WAIT for approval before coding ✋

**It just works!** 🎉

---

## 💡 PRO TIPS

### **Tip 1: Bookmark COPY-PASTE-PROMPT.txt**
It's so small you can paste it into any AI in 5 seconds. Use it daily.

### **Tip 2: Print the Cheat Sheet**
`PROMPT-CHEAT-SHEET.md` is designed to be print-friendly. Keep it at your desk.

### **Tip 3: Share with Team**
Send `HOW-TO-USE-MASTER-PROMPTS.md` to anyone joining the project.

### **Tip 4: Customize as Needed**
Feel free to edit the prompts to add:
- Your specific project priorities
- Custom rules for your workflow
- Shortcuts you use often

### **Tip 5: Re-paste When Confused**
If AI starts coding without asking, just paste the prompt again. Instant reset.

---

## 🔄 WHEN TO RE-PASTE

**Re-paste when:**
- ✅ Starting new chat session
- ✅ AI forgot its role
- ✅ AI starts coding without approval
- ✅ AI doesn't check Phase 0
- ✅ Context window is getting full

**Don't re-paste when:**
- ✅ AI is following rules correctly
- ✅ Continuing work in same session
- ✅ AI just asking clarifying questions

---

## 📊 SUCCESS METRICS

**After pasting prompt, verify AI:**
- [ ] Identified which AI it is ✅
- [ ] Stated its role correctly ✅
- [ ] Asked what you need today ✅
- [ ] Mentioned "NO CODE WITHOUT APPROVAL" ✅
- [ ] Referenced Phase 0 (if new feature) ✅
- [ ] Provided first question template ✅

**All checked?** You're good to go! 🎉

---

## 🎯 YOUR REQUEST: FULLY SOLVED

### **You asked for:**
> "I need a prompt I can give to the AI so they will know what .md documents
> to look at for their role and overall for what we are trying to accomplish.
> I still feel like I need a master prompt that will have the AI ready to first
> ask me what I want to do and make sure it will not start to write a line of
> code without confirming with me first."

### **What you got:**

✅ **Auto-role detection** - AI knows its role based on which AI it is
✅ **Document references** - Each prompt lists exact .md files to read
✅ **First question built-in** - "What would you like to accomplish today?"
✅ **Code approval enforced** - "I will NOT write code until you confirm. ✋"
✅ **Phase 0 awareness** - Checks registry before implementing new features
✅ **Project context** - SwanStudios status, current phase, priorities
✅ **3 prompt options** - Full, Quick, Ultra-fast (you choose)
✅ **2 guide documents** - How-to and cheat sheet
✅ **Updated handbook** - References new prompt system

---

## 🚀 NEXT STEPS

### **Immediate (Today):**
1. Test `COPY-PASTE-PROMPT.txt` with any AI
2. Verify AI auto-detects role and asks approval
3. Use for actual work (Homepage Hero, blank pages, etc.)

### **This Week:**
1. Onboard all AIs with appropriate prompt
2. Get final 2 Phase 0 approvals (Claude Desktop + Gemini)
3. Implement Homepage Hero Enhancement

### **Ongoing:**
1. Use prompts at start of every session
2. Update prompts as workflow evolves
3. Share with team members

---

## 📞 SUPPORT

**Questions?**
- See: `HOW-TO-USE-MASTER-PROMPTS.md` - Complete how-to guide
- See: `PROMPT-CHEAT-SHEET.md` - Quick reference
- See: `SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md` - Full handbook

**Need to modify prompts?**
All files are editable markdown. Customize as needed!

---

## 🎊 CONGRATULATIONS!

You now have a **complete, production-ready master prompt system** that:
- Makes onboarding any AI effortless (copy/paste)
- Prevents rogue coding (approval required)
- Enforces Phase 0 design review
- Provides clear role assignments
- References all required docs
- Scales to your entire team

**Just copy → paste → go!** 🚀

---

**Version:** 1.0
**Status:** ✅ Complete and ready to use
**Last Updated:** 2025-10-28
**Created by:** Claude Code (Main Orchestrator)
