# 🎯 WHICH ONBOARDING PROMPT SHOULD I USE?

**Quick Answer:** Use **AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V2.md**

---

## 📋 YOU HAVE 3 PROMPTS - HERE'S WHEN TO USE EACH

### **1. AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V2.md** ⭐ **USE THIS ONE**

**Location:** `AI-Village-Documentation/AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V2.md`

**Purpose:** UNIFIED onboarding prompt that combines both systems

**Includes:**
- ✅ AI-HANDOFF coordination system (NEW)
- ✅ Phase 0 review system (EXISTING)
- ✅ 7-checkpoint approval pipeline
- ✅ Role-specific instructions for all AIs
- ✅ Anti-patterns and best practices
- ✅ Current project context
- ✅ File size limits (no monoliths)

**Use This When:**
- Onboarding ANY AI to the project
- You want complete context in one prompt
- AI needs to know both Phase 0 AND coordination rules

**Status:** ✅ CURRENT - Last updated 2025-10-30

---

### **2. AI-VILLAGE-MASTER-ONBOARDING-PROMPT.md** (ORIGINAL)

**Location:** `AI-Village-Documentation/AI-VILLAGE-MASTER-ONBOARDING-PROMPT.md`

**Purpose:** Original onboarding prompt with Phase 0 focus

**Includes:**
- ✅ Phase 0 review system
- ✅ Role assignments
- ✅ 7-checkpoint pipeline
- ❌ Does NOT include AI-HANDOFF coordination

**Use This When:**
- You want the older, simpler version
- You're only doing Phase 0 reviews (not coding)
- Legacy reference

**Status:** ⏸️ SUPERSEDED by V2 - Consider archiving

---

### **3. docs/ai-workflow/AI-HANDOFF/MASTER-ONBOARDING-PROMPT.md** (SIMPLIFIED)

**Location:** `docs/ai-workflow/AI-HANDOFF/MASTER-ONBOARDING-PROMPT.md`

**Purpose:** Simplified coordination-focused prompt

**Includes:**
- ✅ AI-HANDOFF coordination system
- ✅ Anti-chaos measures
- ✅ File locking protocol
- ✅ Status file updates
- ❌ Does NOT include Phase 0 details
- ❌ Less detailed role instructions

**Use This When:**
- You want a shorter, faster onboarding
- AI only needs coordination rules (not Phase 0)
- Quick reference for AI-HANDOFF system

**Status:** ✅ ACTIVE for quick onboarding

---

## 🎯 RECOMMENDATION

### **For Full Onboarding:**
Use **AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V2.md**

This gives the AI:
1. Complete Phase 0 review system knowledge
2. AI-HANDOFF coordination rules
3. 7-checkpoint approval pipeline
4. Role-specific details
5. Current project context
6. All the rules in one place

### **For Quick Coordination Only:**
Use **docs/ai-workflow/AI-HANDOFF/MASTER-ONBOARDING-PROMPT.md**

This gives the AI:
1. Just the coordination rules
2. Status file system
3. File locking protocol
4. Anti-chaos measures

---

## 📊 COMPARISON TABLE

| Feature | V2 (UNIFIED) | Original | AI-HANDOFF Only |
|---------|--------------|----------|-----------------|
| Phase 0 Review System | ✅ | ✅ | ❌ |
| AI-HANDOFF Coordination | ✅ | ❌ | ✅ |
| 7-Checkpoint Pipeline | ✅ | ✅ | ✅ |
| Role Assignments | ✅ Detailed | ✅ Detailed | ✅ Basic |
| Anti-Patterns | ✅ | ❌ | ✅ |
| File Size Limits | ✅ | ❌ | ✅ |
| Current Status Integration | ✅ | ❌ | ✅ |
| Length | ~600 lines | ~400 lines | ~300 lines |
| **Recommendation** | **⭐ USE THIS** | Legacy | Quick ref |

---

## 🔄 MIGRATION PLAN

### **What You Should Do:**

1. **Start using V2 for all new AI onboarding**
   - Copy `AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V2.md`
   - Paste to any AI
   - They get full context

2. **Archive the original prompt (optional)**
   - Rename to `AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V1-ARCHIVED.md`
   - Or move to `AI-Village-Documentation/archive/`
   - Keep for reference but don't use

3. **Keep the simplified AI-HANDOFF prompt**
   - Useful for quick coordination-only onboarding
   - Good for AIs that only need status updates
   - Shorter = faster for simple tasks

---

## 🎯 TYPICAL USAGE

### **Scenario 1: Onboarding Gemini for MUI Elimination**
```
1. Copy AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V2.md
2. Paste entire contents to Gemini
3. Gemini reads:
   - CURRENT-TASK.md (knows current status)
   - HANDOFF-PROTOCOL.md (knows coordination rules)
   - GEMINI-STATUS.md (knows their role)
   - Phase 0 system (knows approval process)
4. Gemini reports back ready
5. You assign MUI conversion task
6. Gemini presents options
7. You approve
8. Gemini implements with coordination
```

### **Scenario 2: Quick Status Check with ChatGPT-5**
```
1. Copy docs/ai-workflow/AI-HANDOFF/MASTER-ONBOARDING-PROMPT.md
2. Paste to ChatGPT-5
3. ChatGPT reads coordination files
4. Reports current status
5. You get quick update
6. No need for full Phase 0 context
```

---

## ✅ ACTION ITEMS FOR YOU

**Right Now:**
- [ ] Bookmark `AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V2.md` as your go-to
- [ ] Test it with one AI (paste it to Gemini or ChatGPT-5)
- [ ] Verify they onboard correctly
- [ ] Consider archiving the original prompt

**Optional:**
- [ ] Move original to `archive/AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V1.md`
- [ ] Update any documentation that references the old prompt
- [ ] Tell other AIs about the new unified prompt

---

## 🆘 TL;DR

**Question:** Which prompt should I use?

**Answer:** `AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V2.md`

**Why:** It has everything (Phase 0 + AI-HANDOFF + all rules) in one place.

**Done!** 🚀

---

**END OF WHICH-PROMPT-TO-USE.md**
