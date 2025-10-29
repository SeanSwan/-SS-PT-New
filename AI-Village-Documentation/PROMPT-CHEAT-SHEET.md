# 🎯 MASTER PROMPT CHEAT SHEET

**Quick reference for which prompt to use when**

---

## 📋 THE 3 PROMPTS

### 1️⃣ **MASTER-AI-ONBOARDING-PROMPT.md** (~500 lines)
**When:** First time with an AI, need full guidance
**Includes:** Complete role descriptions, examples, decision trees, edge cases
**Time to read:** 5-10 minutes
**Best for:** Roo Code first time, new team members, detailed onboarding

### 2️⃣ **QUICK-START-AI-PROMPT.md** (~150 lines)
**When:** AI needs refresher, worked together before
**Includes:** Essential role info, critical rules, quick templates
**Time to read:** 2-3 minutes
**Best for:** ChatGPT-5 returning, Gemini mid-project, quick reminders

### 3️⃣ **COPY-PASTE-PROMPT.txt** (~25 lines)
**When:** Need to go NOW, already know the drill
**Includes:** Just the basics - role, rules, context
**Time to read:** 30 seconds
**Best for:** Claude Desktop deployment check, v0.dev wireframe, daily standup

---

## 🤖 WHICH AI → WHICH ROLE

| AI | Role | Use For | Token Budget |
|----|------|---------|--------------|
| **Claude Code** | 🎯 Main Orchestrator | Architecture, integration, daily coordination | 160K (80%) |
| **Roo Code** | 💻 Primary Coder | Heavy coding, backend, fast iteration | 256K |
| **ChatGPT-5** | 🧪 QA Engineer | Testing, Phase 0 reviews, edge cases | 128K |
| **Gemini** | ⚛️ Frontend Specialist | React, styled-components, theme | 1M |
| **v0.dev** | 🎨 UI Wireframing | Visual prototyping, React components | N/A |
| **Claude Desktop** | 🚀 Deployment Monitor | Render only, shares with Claude Code | 40K (20%) |

---

## 🚨 WHAT EVERY PROMPT ENFORCES

✋ **NO CODE WITHOUT APPROVAL**
📋 **CHECK PHASE 0 FIRST** (`docs/ai-workflow/PHASE-0-REGISTRY.md`)
🎭 **CONFIRM ROLE** (Tell me which AI you are)
📍 **ASK WHAT I NEED** (What should I work on today?)

---

## 🎯 DECISION FLOWCHART

```
START: Need to use an AI
│
├─ Is this the FIRST TIME with this AI?
│  ├─ YES → Use MASTER-AI-ONBOARDING-PROMPT.md
│  └─ NO → Continue
│
├─ Has AI worked on this project RECENTLY (within a week)?
│  ├─ YES → Use COPY-PASTE-PROMPT.txt
│  └─ NO → Use QUICK-START-AI-PROMPT.md
│
├─ Is this a NEW CHAT SESSION?
│  ├─ YES → Paste appropriate prompt
│  └─ NO → Continue without re-pasting
│
└─ Did AI forget its role or skip approval?
   ├─ YES → Re-paste QUICK-START-AI-PROMPT.md
   └─ NO → You're good to go!
```

---

## 💬 EXPECTED FIRST RESPONSES

### **Claude Code (Main Orchestrator):**
```
I'm Claude Code, your Main Orchestrator. I've read the handbook and
checked the Phase 0 registry.

I see Homepage Hero Enhancement is at 3/5 approvals (needs Claude Desktop + Gemini).

What would you like to work on today?
1. Continue Homepage Hero (get final approvals → implement)
2. Fix blank pages (bugfix work)
3. Something else?

I will NOT write code until you confirm the approach. ✋
```

### **Roo Code (Primary Coder):**
```
I'm Roo Code (Grok Code Fast 1), your Primary Coder. I'm fast, cheap,
and ready to implement.

Before I write any code: What needs to be built?

Is there a Phase 0 design I should follow, or is this bugfix work on
existing code?

I'll wait for your green light. ✋
```

### **ChatGPT-5 (QA Engineer):**
```
I'm ChatGPT-5, your QA Engineer. What would you like me to review today?

Options:
1. Review a Phase 0 design (I provide 1 of 5 approvals)
2. Test existing features for bugs
3. Analyze screenshots/wireframes
4. Create test cases for new functionality

I will NOT write production code - that's Roo Code's job. I focus on
quality assurance.
```

### **Claude Desktop (Deployment Monitor):**
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

## 📍 FILE LOCATIONS

```
AI-Village-Documentation/
├── MASTER-AI-ONBOARDING-PROMPT.md     👈 Full guide
├── QUICK-START-AI-PROMPT.md           👈 Quick refresh
├── COPY-PASTE-PROMPT.txt              👈 Ultra-fast
├── HOW-TO-USE-MASTER-PROMPTS.md       👈 Detailed how-to
├── PROMPT-CHEAT-SHEET.md              👈 You are here
└── SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md  👈 Complete handbook
```

---

## ✅ QUICK CHECKLIST

After pasting prompt, AI should:
- [ ] Say which AI it is
- [ ] State its role
- [ ] Ask what you need today
- [ ] Mention "NO CODE WITHOUT APPROVAL"
- [ ] Reference Phase 0 (if new feature)

**Missing any?** → Re-paste the prompt

---

## 🎯 COMMON SCENARIOS

| Scenario | Use This | Why |
|----------|----------|-----|
| Starting new project | **MASTER** | Need full context |
| Daily standup | **COPY-PASTE** | Fast, everyone knows the drill |
| AI forgot rules | **QUICK-START** | Quick reminder without overwhelming |
| Onboarding team member | **MASTER** | Complete learning resource |
| Mid-session context loss | **QUICK-START** | Reset without full re-onboarding |
| Emergency bug fix | **COPY-PASTE** | No time to waste |

---

## 💡 PRO TIPS

1. **Save COPY-PASTE to clipboard** - Use it daily, paste in 5 seconds
2. **Claude Desktop sparingly** - Shares tokens with Claude Code (20% budget)
3. **Check Phase 0 registry** - Before starting any new feature
4. **Coordinate big tasks** - Use Claude Code to orchestrate multi-AI workflows
5. **Re-paste when confused** - If AI skips rules, paste prompt again

---

## 🔗 QUICK LINKS

**Phase 0 Registry:** `docs/ai-workflow/PHASE-0-REGISTRY.md`
**Handbook:** `AI-Village-Documentation/SWANSTUDIOS-AI-VILLAGE-HANDBOOK-FINAL.md`
**Theme Standards:** `frontend/src/theme/galaxy-swan-theme.ts`
**Active Reviews:** `docs/ai-workflow/reviews/`

---

**Print this page and keep it handy!**

**Version:** 1.0
**Last Updated:** 2025-10-28
